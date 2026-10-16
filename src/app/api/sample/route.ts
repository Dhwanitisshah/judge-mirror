// Mock mode only: hands the browser the bundled sample submission so it can be pasted in one click.
// Outside mock mode this route does not exist as far as the app is concerned (404).

import { connection } from "next/server";
import { isMockMode, loadSampleSubmission, loadSampleTranscript } from "@/lib/mock";

export async function GET() {
  await connection(); // read LLM_MOCK per request, never at build time
  if (!isMockMode()) return new Response(null, { status: 404 });
  return Response.json({ description: loadSampleSubmission(), transcript: loadSampleTranscript() });
}
