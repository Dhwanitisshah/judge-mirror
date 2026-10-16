import type { ReviewResponse, Texts } from "@/lib/schema";
import { CriterionCard } from "./CriterionCard";
import { PaperPage } from "./PaperPage";

/** Lowest score first. Ties keep the order the criteria were listed in. A criterion with no score goes last. */
export function orderForFixing(result: ReviewResponse) {
  return result.criteria
    .map((c, i) => ({ c, number: i + 1 }))
    .sort((a, b) => (a.c.score ?? 99) - (b.c.score ?? 99) || a.number - b.number);
}

export function ResultsScreen({ texts, result }: { texts: Texts; result: ReviewResponse }) {
  const ordered = orderForFixing(result);
  const marker = result.meta.mock
    ? "Marked by mock mode (sample data, no AI was called)"
    : `Marked by ${result.meta.model}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <PaperPage texts={texts} result={result} />

      <div className="space-y-4">
        {ordered.map(({ c, number }) => (
          <CriterionCard key={number} number={number} result={c} />
        ))}

        <p className="text-sm text-grey-note">
          Cards run lowest score first. Ties keep the order of your criteria list (for the preset: Design →
          Impact → Innovation → Presentation). There is no total or average, because it would suggest more
          precision than judging really has.
        </p>
        <p className="text-sm text-grey-note">{marker}</p>
      </div>
    </div>
  );
}
