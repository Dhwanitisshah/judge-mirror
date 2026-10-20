import { z } from "zod";
import { LlmError, errorResponse, reviewWithModel } from "@/lib/llm";
import { MAX_CRITERIA, MAX_DESCRIPTION_CHARS, MAX_TRANSCRIPT_CHARS, MIN_CRITERIA, MIN_REVIEW_CHARS } from "@/lib/limits";
import { buildReviewResponse } from "@/lib/review";
import { CriterionSchema } from "@/lib/schema";

// A review may use up to TOTAL_BUDGET_MS (75 s) of model time; this is the host's hard stop (Vercel, if deployed).
export const maxDuration = 90;

const BodySchema = z.object({
  criteria: z.array(CriterionSchema).min(MIN_CRITERIA).max(MAX_CRITERIA),
  description: z.string(),
  transcript: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "server" }, { status: 400 });
    const { criteria, description, transcript } = parsed.data;
    if (description.length > MAX_DESCRIPTION_CHARS || (transcript?.length ?? 0) > MAX_TRANSCRIPT_CHARS) {
      throw new LlmError("too_long");
    }
    if (description.trim().length < MIN_REVIEW_CHARS) return Response.json({ error: "server" }, { status: 400 });

    const started = Date.now();
    const { output, model, mock } = await reviewWithModel({ criteria, description, transcript });
    const response = buildReviewResponse(output, { criteria, description, transcript }, { model, mock });
    const dropped = response.criteria.reduce((n, c) => n + c.droppedCount, 0);
    const capped = response.criteria.filter((c) => c.cappedFrom !== undefined).map((c) => `${c.name} ${c.cappedFrom}->${c.score}`);
    console.log(`review: model=${model} droppedCount=${dropped} elapsed=${Date.now() - started}ms${capped.length ? ` capped(no transcript)=${capped.join(",")}` : ""}`);
    return Response.json(response);
  } catch (e) {
    return errorResponse(e);
  }
}
