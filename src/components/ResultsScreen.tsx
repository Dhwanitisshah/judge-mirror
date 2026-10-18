"use client";

import type { ReviewResponse, Texts } from "@/lib/schema";
import type { StageOne } from "@/lib/state";
import { CriterionCard } from "./CriterionCard";
import { PaperPage } from "./PaperPage";
import { StageOneChecklist } from "./StageOneChecklist";

/** Lowest score first. Ties keep the order the criteria were listed in. A criterion with no score goes last. */
export function orderForFixing(result: ReviewResponse) {
  return result.criteria
    .map((c, i) => ({ c, number: i + 1 }))
    .sort((a, b) => (a.c.score ?? 99) - (b.c.score ?? 99) || a.number - b.number);
}

export function ResultsScreen({
  texts,
  result,
  stageOne,
  onToggleStage,
  onReviewAgain,
}: {
  texts: Texts;
  result: ReviewResponse;
  stageOne: StageOne;
  onToggleStage: (index: number) => void;
  onReviewAgain: () => void;
}) {
  const ordered = orderForFixing(result);
  const marker = result.meta.mock
    ? "Marked by mock mode (sample data, no AI was called)"
    : `Marked by ${result.meta.model}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <PaperPage texts={texts} result={result} />

      <div className="space-y-4">
        <button
          type="button"
          onClick={onReviewAgain}
          className="rounded-sm border-2 border-redpen px-4 py-2 font-semibold text-redpen hover:bg-redpen hover:text-paper"
        >
          Review again
        </button>

        {ordered.map(({ c, number }) => (
          <CriterionCard key={number} number={number} result={c} />
        ))}

        <p className="text-sm text-grey-note">
          Fix these in order, lowest score first. Ties go in the order you listed your criteria (for the preset:
          Design → Impact → Innovation → Presentation). There is no total or average: it would suggest more
          precision than judging really has.
        </p>
        <p className="text-sm text-grey-note">{marker}</p>

        <StageOneChecklist checked={stageOne} onToggle={onToggleStage} />
      </div>
    </div>
  );
}
