// Mock mode (spec.md > Mock mode). With LLM_MOCK=1 the model call is replaced by canned JSON from fixtures/.
// Everything after the model call (Zod rules, verification) is the real code.
// Server-only: reads the fixtures folder from disk.

import { readFileSync } from "node:fs";
import { join } from "node:path";

let announced = false;

export function isMockMode(): boolean {
  const on = process.env.LLM_MOCK === "1";
  if (on && !announced) {
    announced = true;
    console.log("MOCK MODE: no Gemini calls are made, answers come from fixtures/");
  }
  return on;
}

function fixture(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", name), "utf8");
}

export const loadMockReview = (): unknown => JSON.parse(fixture("mock-review.json"));
export const loadMockParseCriteria = (): unknown => JSON.parse(fixture("mock-parse-criteria.json"));
export const loadSampleSubmission = (): string => fixture("sample-submission.txt");
export const loadSampleTranscript = (): string => fixture("sample-transcript.txt");
