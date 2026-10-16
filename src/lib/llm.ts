// The only file that talks to the model (spec.md > LLM client).
// Slice 2 state: mock mode works; the real Gemini call arrives in slice 4.

import { isMockMode, loadMockParseCriteria, loadMockReview } from "./mock";
import { ParseCriteriaOutputSchema, type Criterion } from "./schema";

export type LlmErrorCode = "timeout" | "rate_limited" | "bad_output" | "refused" | "too_long" | "server";

export class LlmError extends Error {
  constructor(
    public code: LlmErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

/** Mock review: fixture entries are mapped onto the confirmed criteria by position and renamed to match. */
function mockReviewFor(criteria: Pick<Criterion, "name">[]): unknown {
  const fixture = loadMockReview() as { criteria: Record<string, unknown>[]; flags: unknown[] };
  return {
    criteria: criteria.map((c, i) => ({ ...fixture.criteria[i % fixture.criteria.length], name: c.name })),
    flags: fixture.flags,
  };
}

/** Returns the model's raw JSON for a review plus the model that produced it. */
export async function reviewWithModel(input: {
  criteria: Criterion[];
  description: string;
  transcript?: string;
}): Promise<{ output: unknown; model: string; mock: boolean }> {
  if (isMockMode()) return { output: mockReviewFor(input.criteria), model: "mock", mock: true };
  throw new LlmError("server", "Real Gemini calls are not wired up yet.");
}

export async function parseCriteriaWithModel(text: string): Promise<{ criteria: Criterion[]; model: string }> {
  if (isMockMode()) {
    const parsed = ParseCriteriaOutputSchema.parse(loadMockParseCriteria());
    return { criteria: parsed.criteria, model: "mock" };
  }
  void text; // used by the real call in slice 4
  throw new LlmError("server", "Real Gemini calls are not wired up yet.");
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
