import { z } from "zod";
import { MAX_CRITERIA, MIN_CRITERIA } from "./limits";

// ---------- Shared ----------

export const SourceSchema = z.enum(["description", "transcript"]);
export type Source = z.infer<typeof SourceSchema>;

export const CriterionSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
});
export type Criterion = z.infer<typeof CriterionSchema>;

/** The texts the user pasted. Positions in every mark refer to these original strings. */
export type Texts = { description: string; transcript?: string };

// ---------- What the model must return (spec.md > Schema) ----------
// Field order matters: evidence comes before verdict, score and fix, so the score follows the evidence.

export const ModelCriterionSchema = z.object({
  name: z.string().min(1),
  evidence: z.array(z.object({ quote: z.string().min(1), source: SourceSchema })).max(2),
  verdict: z.string().min(1),
  score: z.number().int().min(1).max(5),
  fix: z.string().min(1),
});

export const ModelReviewOutputSchema = z.object({
  criteria: z.array(ModelCriterionSchema),
  flags: z.array(z.object({ type: z.literal("injection"), quote: z.string().min(1) })),
});
export type ModelReviewOutput = z.infer<typeof ModelReviewOutputSchema>;

export const ParseCriteriaOutputSchema = z.object({
  criteria: z.array(CriterionSchema).min(MIN_CRITERIA).max(MAX_CRITERIA),
});

/**
 * The rules a Gemini JSON schema can't express (spec.md > Schema): one entry per input
 * criterion with the same names in the same order, and no evidence means a score of 1 or 2.
 * Returns an error message (fed back to the model on the one retry) or null when fine.
 */
export function checkModelOutputRules(
  output: ModelReviewOutput,
  criteria: Pick<Criterion, "name">[],
): string | null {
  if (output.criteria.length !== criteria.length) {
    return `Expected ${criteria.length} criteria but got ${output.criteria.length}.`;
  }
  for (let i = 0; i < criteria.length; i++) {
    const got = output.criteria[i];
    if (got.name !== criteria[i].name) {
      return `Criterion ${i + 1} must be named exactly "${criteria[i].name}" but was named "${got.name}".`;
    }
    if (got.evidence.length === 0 && got.score > 2) {
      return `Criterion "${got.name}" has no evidence quotes, so its score must be 1 or 2, but it was ${got.score}.`;
    }
  }
  return null;
}

// ---------- What the server returns to the browser ----------

export type CriterionState = "verified" | "unverifiable" | "not-addressed";

export type Mark = { source: Source; start: number; end: number; text: string };
export type FlagMark = { source: Source; start: number; end: number };

export type CriterionResult = {
  name: string;
  state: CriterionState;
  /** null only when state is "unverifiable" (derived in code, never by the model). */
  score: number | null;
  verdict: string;
  fix: string;
  marks: Mark[];
  droppedCount: number;
  /** True when this is the Presentation criterion and no transcript was given: it was judged on the text only. */
  judgedOnTextOnly?: boolean;
  /** The model's own score, kept only when the no-transcript cap lowered it (for the server log, not shown). */
  cappedFrom?: number;
};

export type ReviewResponse = {
  criteria: CriterionResult[];
  flags: FlagMark[];
  /** `model` is the model ID that answered, or "mock". */
  meta: { model: string; mock: boolean };
};
