// The only file that talks to the model (spec.md > LLM client).
//
// What it promises:
//  - Gemini's structured-output mode, then Zod on every reply. If the reply breaks the contract it makes exactly one
//    more call, to the same model, with the problem attached. That is the only retry on bad output.
//  - A model that is busy (429 or 503) or too slow (our own timeout, or Gemini's 504) is skipped: the next model in
//    the chain gets one attempt, immediately. One attempt per model, no delay, no loop, no second pass.
//  - The first models in the chain are capped at PER_MODEL_CAP_MS each; the last model gets whatever is left of the
//    total budget. So the whole review can never run past TOTAL_BUDGET_MS.
//  - A 400, an empty or blocked reply, or anything unexpected is never retried and never falls back.
//  - It says which model answered, so the results screen can show "Marked by …".
//  - With LLM_MOCK=1 the model call is replaced by fixtures (mock.ts); everything after it is the real code.

import { GoogleGenAI } from "@google/genai";
import { PARSE_CRITERIA_JSON_SCHEMA, REVIEW_JSON_SCHEMA } from "./geminiSchema";
import { isMockMode, loadMockParseCriteria, loadMockReview } from "./mock";
import {
  makeSuffix,
  parseCriteriaContents,
  parseCriteriaSystemInstruction,
  retryNote,
  reviewContents,
  reviewSystemInstruction,
} from "./prompts";
import { parseModelOutput } from "./review";
import { ParseCriteriaOutputSchema, type Criterion, type ModelReviewOutput } from "./schema";

// ---------- Models (spec.md > Stack). Constants live here and nowhere else. ----------

/** Review: best free Flash model first, then the fallbacks, one attempt each. */
export const REVIEW_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite"] as const;
/** Criteria parsing: a fast Flash-Lite model, with one fallback. */
export const PARSE_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const;

export type ThinkingLevel = "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";
/** Thinking level per model (spec.md > Stack). A model missing here gets no thinkingConfig at all. */
export const THINKING: Record<string, ThinkingLevel | undefined> = {
  "gemini-3.8-flash": "LOW",
  "gemini-3.6-flash": "LOW",
  "gemini-3.1-flash-lite": "LOW",
  "gemini-3.5-flash-lite": "MINIMAL",
};

/** Every model except the last may take this long per call before the next one gets its turn. */
export const PER_MODEL_CAP_MS = 25_000;
/** The whole review, retries and fallbacks included. The last model in the chain gets what is left of this. */
export const TOTAL_BUDGET_MS = 75_000;

// ---------- Errors ----------

export type LlmErrorCode = "timeout" | "rate_limited" | "bad_output" | "refused" | "too_long" | "server";

export class LlmError extends Error {
  constructor(
    public code: LlmErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const STATUS: Record<LlmErrorCode, number> = {
  timeout: 504,
  rate_limited: 429,
  bad_output: 502,
  refused: 502,
  too_long: 413,
  server: 500,
};

export function errorResponse(e: unknown): Response {
  const code: LlmErrorCode = e instanceof LlmError ? e.code : "server";
  if (!(e instanceof LlmError)) console.error("Unexpected error:", e);
  return Response.json({ error: code }, { status: STATUS[code] });
}

// ---------- The engine (exported so tests can drive it with a stand-in for Gemini) ----------

export type GenerateRequest = { model: string; contents: string; config: Record<string, unknown> };
export type GenerateResult = {
  text?: string;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
};
export type Generate = (request: GenerateRequest) => Promise<GenerateResult>;

let client: GoogleGenAI | null = null;
const realGenerate: Generate = async (request) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmError("server", "GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return (await client.models.generateContent(request as Parameters<GoogleGenAI["models"]["generateContent"]>[0])) as GenerateResult;
};

const statusOf = (e: unknown): number | null =>
  typeof (e as { status?: unknown })?.status === "number" ? (e as { status: number }).status : null;
const isBusy = (e: unknown) => statusOf(e) === 429 || statusOf(e) === 503;
// Our own cut-off surfaces as an AbortError. When the deadline we send expires on Google's side instead, Gemini answers
// HTTP 504 DEADLINE_EXCEEDED (seen on gemini-3.8-flash). Both mean "too slow", and both skip to the next model.
const isTimeout = (e: unknown) =>
  ["AbortError", "TimeoutError"].includes((e as { name?: string })?.name ?? "") || statusOf(e) === 504;

export type Attempt = { model: string; status: number | "ok" | "timeout" | "error"; ms: number };

export async function generateWithFallback<T>(opts: {
  models: readonly string[];
  systemInstruction: string;
  contents: string;
  schema: unknown;
  /** Throws (any Error) with a message the model can act on when the reply breaks the contract. */
  validate: (json: unknown) => T;
  generate?: Generate;
  budgetMs?: number;
  /** Prefix for the server log line that lists every attempt (model, outcome, milliseconds). */
  label?: string;
}): Promise<{ value: T; model: string; attempts: Attempt[]; tokens?: GenerateResult["usageMetadata"] }> {
  const generate = opts.generate ?? realGenerate;
  const started = Date.now();
  const budget = opts.budgetMs ?? TOTAL_BUDGET_MS;
  const attempts: Attempt[] = [];
  let outcome = "failed";

  try {
    let sawTimeout = false;

    for (let i = 0; i < opts.models.length; i++) {
      const model = opts.models[i];
      const isLast = i === opts.models.length - 1;

      const once = async (contents: string): Promise<GenerateResult> => {
        const remaining = budget - (Date.now() - started);
        if (remaining < 3000) throw new LlmError("timeout", "out of time");
        const level = THINKING[model];
        // Every model but the last is capped; the last gets whatever is left of the total budget.
        const timeout = isLast ? remaining : Math.min(PER_MODEL_CAP_MS, remaining);
        const t0 = Date.now();
        try {
          const result = await generate({
            model,
            contents,
            config: {
              systemInstruction: opts.systemInstruction,
              responseMimeType: "application/json",
              responseJsonSchema: opts.schema,
              ...(level ? { thinkingConfig: { thinkingLevel: level } } : {}),
              httpOptions: { timeout },
            },
          });
          attempts.push({ model, status: "ok", ms: Date.now() - t0 });
          return result;
        } catch (e) {
          attempts.push({ model, status: isTimeout(e) ? "timeout" : (statusOf(e) ?? "error"), ms: Date.now() - t0 });
          throw e;
        }
      };

      const readJson = (result: GenerateResult): unknown => {
        if (result.promptFeedback?.blockReason) throw new LlmError("refused", `blocked: ${result.promptFeedback.blockReason}`);
        const text = result.text?.trim();
        if (!text) throw new LlmError("refused", "empty reply");
        try {
          return JSON.parse(text);
        } catch {
          throw new Error("The reply was not valid JSON.");
        }
      };

      try {
        let result = await once(opts.contents);
        let value: T;
        try {
          value = opts.validate(readJson(result));
        } catch (first) {
          if (first instanceof LlmError) throw first;
          // Exactly one retry, to the same model, with the problem attached.
          result = await once(opts.contents + retryNote((first as Error).message));
          try {
            value = opts.validate(readJson(result));
          } catch (second) {
            if (second instanceof LlmError) throw second;
            throw new LlmError("bad_output", (second as Error).message);
          }
        }
        outcome = `answered by ${model}`;
        return { value, model, attempts, tokens: result.usageMetadata };
      } catch (e) {
        if (e instanceof LlmError) throw e;
        if (isBusy(e)) continue; // 429 or 503: the next model gets one go, immediately
        if (isTimeout(e)) {
          sawTimeout = true; // too slow: same treatment
          continue;
        }
        console.error(`llm: ${model} failed with status ${statusOf(e) ?? "unknown"}:`, (e as Error)?.message?.slice(0, 200));
        throw new LlmError("server");
      }
    }
    // Every model was skipped. "Busy" only if all of them were busy; if any was too slow, say so.
    throw new LlmError(sawTimeout ? "timeout" : "rate_limited");
  } catch (e) {
    if (e instanceof LlmError) outcome = e.code;
    throw e;
  } finally {
    // One line per request, failures included: this is where per-model latency and outcome come from.
    const trail = attempts.map((a) => `${a.model}:${a.status}:${a.ms}ms`).join(" > ") || "no calls";
    console.log(`${opts.label ?? "llm"}: ${outcome} in ${Date.now() - started}ms [${trail}]`);
  }
}

// ---------- The two calls the routes make ----------

/** Mock review: fixture entries are mapped onto the confirmed criteria by position and renamed to match. */
function mockReviewFor(criteria: Pick<Criterion, "name">[]): unknown {
  const fixture = loadMockReview() as { criteria: Record<string, unknown>[]; flags: unknown[] };
  return {
    criteria: criteria.map((c, i) => ({ ...fixture.criteria[i % fixture.criteria.length], name: c.name })),
    flags: fixture.flags,
  };
}

/**
 * Returns the model's validated JSON for a review plus the model that produced it.
 * `models` defaults to the fallback chain; scripts/consistency.ts passes a single model to measure it with no fallback.
 */
export async function reviewWithModel(
  input: { criteria: Criterion[]; description: string; transcript?: string },
  generate?: Generate,
  models: readonly string[] = REVIEW_MODELS,
): Promise<{ output: unknown; model: string; mock: boolean; attempts: Attempt[]; tokens?: GenerateResult["usageMetadata"] }> {
  if (isMockMode()) return { output: mockReviewFor(input.criteria), model: "mock", mock: true, attempts: [] };

  const suffix = makeSuffix(input.description, input.transcript, ...input.criteria.map((c) => c.name + c.description));
  const { value, model, attempts, tokens } = await generateWithFallback<ModelReviewOutput>({
    models,
    systemInstruction: reviewSystemInstruction(suffix),
    contents: reviewContents(input, suffix),
    schema: REVIEW_JSON_SCHEMA,
    validate: (json) => parseModelOutput(json, input.criteria),
    generate,
    label: "review",
  });
  console.log(`review: tokens in/out/think=${tokens?.promptTokenCount}/${tokens?.candidatesTokenCount}/${tokens?.thoughtsTokenCount}`);
  return { output: value, model, mock: false, attempts, tokens };
}

export async function parseCriteriaWithModel(
  text: string,
  generate?: Generate,
): Promise<{ criteria: Criterion[]; model: string }> {
  if (isMockMode()) {
    const parsed = ParseCriteriaOutputSchema.parse(loadMockParseCriteria());
    return { criteria: parsed.criteria, model: "mock" };
  }

  const suffix = makeSuffix(text);
  const { value, model } = await generateWithFallback<Criterion[]>({
    models: PARSE_MODELS,
    systemInstruction: parseCriteriaSystemInstruction(suffix),
    contents: parseCriteriaContents(text, suffix),
    schema: PARSE_CRITERIA_JSON_SCHEMA,
    validate: (json) => {
      const parsed = ParseCriteriaOutputSchema.safeParse(json);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new Error(`${issue.path.join(".") || "reply"}: ${issue.message}`);
      }
      return parsed.data.criteria;
    },
    generate,
    label: "parse-criteria",
  });
  return { criteria: value, model };
}
