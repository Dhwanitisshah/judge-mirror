// Slice 1 preview: renders the results screen from the mock fixtures. Slice 2 replaces this with the real flow.

import { Suspense } from "react";
import { connection } from "next/server";
import { ResultsScreen } from "@/components/ResultsScreen";
import { isMockMode, loadMockReview, loadSampleSubmission, loadSampleTranscript } from "@/lib/mock";
import { BUILD_WITH_AI_BASICS } from "@/lib/presets";
import { buildReviewResponse } from "@/lib/review";

// Reads LLM_MOCK and the fixtures per request, so it must not be baked in at build time.
async function MockPreview() {
  await connection();

  if (!isMockMode()) {
    return (
      <p className="mt-4 max-w-2xl">
        The input screen arrives in the next slice. To preview the red-pen results from sample data, put{" "}
        <code>LLM_MOCK=1</code> in <code>.env.local</code> and restart the dev server.
      </p>
    );
  }

  const texts = { description: loadSampleSubmission(), transcript: loadSampleTranscript() };
  const result = buildReviewResponse(
    loadMockReview(),
    { criteria: BUILD_WITH_AI_BASICS, ...texts },
    { model: "mock", mock: true },
  );
  return <ResultsScreen texts={texts} result={result} />;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <h1 className="mb-6 font-hand text-4xl font-bold text-redpen">Judge Mirror</h1>
      <Suspense fallback={<p className="font-hand text-2xl text-redpen">Loading…</p>}>
        <MockPreview />
      </Suspense>
    </main>
  );
}
