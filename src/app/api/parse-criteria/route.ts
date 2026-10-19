import { z } from "zod";
import { LlmError, errorResponse, parseCriteriaWithModel } from "@/lib/llm";
import { MAX_CRITERIA_TEXT_CHARS } from "@/lib/limits";

export const maxDuration = 90;

const BodySchema = z.object({ text: z.string() });

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || parsed.data.text.trim().length === 0) {
      return Response.json({ error: "server" }, { status: 400 });
    }
    if (parsed.data.text.length > MAX_CRITERIA_TEXT_CHARS) throw new LlmError("too_long");

    const { criteria, model } = await parseCriteriaWithModel(parsed.data.text);
    console.log(`parse-criteria: model=${model} criteria=${criteria.length}`);
    return Response.json({ criteria });
  } catch (e) {
    return errorResponse(e);
  }
}
