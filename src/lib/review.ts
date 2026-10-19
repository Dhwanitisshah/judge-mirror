// Pure pipeline: the model's JSON + the user's text -> what the browser may see.
// Nothing the model says reaches the browser unless verify.ts found it in the user's text.

import {
  ModelReviewOutputSchema,
  checkModelOutputRules,
  type Criterion,
  type CriterionResult,
  type FlagMark,
  type ModelReviewOutput,
  type ReviewResponse,
  type Texts,
} from "./schema";
import { deriveState, verifyCriterion, verifyFlag } from "./verify";

/** Thrown when the model output breaks the contract. The message is fed back to the model on the one retry. */
export class ReviewOutputError extends Error {}

/** Zod check plus the rules a Gemini schema can't express. Throws ReviewOutputError with a message the model can act on. */
export function parseModelOutput(rawOutput: unknown, criteria: Pick<Criterion, "name">[]): ModelReviewOutput {
  const parsed = ModelReviewOutputSchema.safeParse(rawOutput);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ReviewOutputError(`${issue.path.join(".") || "reply"}: ${issue.message}`);
  }
  const ruleError = checkModelOutputRules(parsed.data, criteria);
  if (ruleError) throw new ReviewOutputError(ruleError);
  return parsed.data;
}

export function buildReviewResponse(
  rawOutput: unknown,
  input: { criteria: Pick<Criterion, "name">[] } & Texts,
  meta: ReviewResponse["meta"],
): ReviewResponse {
  const output = parseModelOutput(rawOutput, input.criteria);

  const texts: Texts = { description: input.description, transcript: input.transcript };

  const criteria: CriterionResult[] = output.criteria.map((c) => {
    const { verified, droppedCount } = verifyCriterion(c.evidence, texts);
    const state = deriveState(c.evidence.length, verified.length);
    const unverifiable = state === "unverifiable";
    return {
      name: c.name,
      state,
      score: unverifiable ? null : c.score,
      // An unverifiable card shows nothing but "Couldn't verify, re-run", so its text never leaves the server.
      verdict: unverifiable ? "" : c.verdict,
      fix: unverifiable ? "" : c.fix,
      marks: verified,
      droppedCount,
    };
  });

  const flags: FlagMark[] = [];
  for (const f of output.flags) {
    const mark = verifyFlag(f.quote, texts);
    if (mark && !flags.some((x) => x.source === mark.source && x.start === mark.start && x.end === mark.end)) {
      flags.push(mark);
    }
  }

  return { criteria, flags, meta };
}
