import type { CriterionResult } from "@/lib/schema";
import { PenCircle } from "./PenCircle";
import { ScoreCircle } from "./ScoreCircle";

// Type rules (spec.md > Look and Feel): a calm serif for everything printed, handwriting only for the red pen —
// the circled score, the verdict, the "Fix this first" note. The user's own quoted words stay in the serif.

export function CriterionCard({ number, result }: { number: number; result: CriterionResult }) {
  const { state, score, verdict, fix, marks, droppedCount, name } = result;

  return (
    <article className="rounded-sm border border-rule bg-paper p-4 shadow-sm" aria-label={name}>
      <header className="flex items-center gap-3">
        {state === "unverifiable" ? (
          <div aria-hidden="true" className="flex h-14 w-16 shrink-0 items-center justify-center text-3xl text-grey-note">
            –
          </div>
        ) : (
          <ScoreCircle score={score as number} dashed={state === "not-addressed"} seed={number} />
        )}
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <PenCircle seed={number * 7 + 3} className="h-7 w-7 font-hand text-xl font-bold leading-none" strokeWidth={2}>
            {number}
          </PenCircle>
          {name}
        </h3>
      </header>

      {state === "unverifiable" ? (
        <div className="mt-3 space-y-1 text-grey-note">
          <p className="font-semibold">Couldn&apos;t verify, re-run</p>
          <p className="text-[0.95rem]">
            I couldn&apos;t find the lines I&apos;d quote in your text, so I won&apos;t put a grade on this one. Run it again.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="font-hand text-[1.45rem] leading-snug text-redpen">{verdict}</p>

          {state === "not-addressed" ? (
            <p className="text-[0.95rem] text-grey-note">
              Nothing in your text addresses this. Judges can&apos;t credit what you don&apos;t say.
            </p>
          ) : (
            <ul className="space-y-2">
              {marks.map((m, i) => (
                <li key={i} className="border-l-4 border-redpen pl-3 text-[0.95rem] italic">
                  &ldquo;{m.text}&rdquo;
                  {m.source === "transcript" && (
                    <span className="ml-2 text-xs not-italic text-grey-note">(video transcript)</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {droppedCount > 0 && (
            <p className="border-l-2 border-grey-note pl-2 text-base font-medium text-grey-note">
              {droppedCount === 1
                ? "1 quote couldn't be found in your text and was removed."
                : `${droppedCount} quotes couldn't be found in your text and were removed.`}
            </p>
          )}

          <p className="font-hand text-[1.4rem] leading-snug text-redpen">
            <span className="font-bold">Fix this first: </span>
            {fix}
          </p>
        </div>
      )}
    </article>
  );
}
