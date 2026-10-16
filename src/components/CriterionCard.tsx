import type { CriterionResult } from "@/lib/schema";
import { ScoreCircle } from "./ScoreCircle";

function NumberBadge({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-redpen font-hand text-lg font-bold leading-none text-redpen"
    >
      {n}
    </span>
  );
}

export function CriterionCard({ number, result }: { number: number; result: CriterionResult }) {
  const { state, score, verdict, fix, marks, droppedCount, name } = result;

  return (
    <article className="rounded-sm border border-rule bg-paper p-4 shadow-sm" aria-label={name}>
      <header className="flex items-center gap-3">
        {state === "unverifiable" ? (
          <div className="flex h-14 w-16 shrink-0 items-center justify-center font-hand text-3xl text-grey-note">
            –
          </div>
        ) : (
          <ScoreCircle score={score as number} dashed={state === "not-addressed"} />
        )}
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <NumberBadge n={number} />
          {name}
        </h3>
      </header>

      {state === "unverifiable" ? (
        <p className="mt-3 text-grey-note">Couldn&apos;t verify, re-run</p>
      ) : (
        <div className="mt-3 space-y-3">
          <p>{verdict}</p>

          {state === "not-addressed" ? (
            <p className="font-hand text-xl text-redpen">
              Nothing in your text addresses this. Judges can&apos;t credit what you don&apos;t say.
            </p>
          ) : (
            <ul className="space-y-2">
              {marks.map((m, i) => (
                <li key={i} className="border-l-4 border-redpen pl-3 text-[0.95rem] italic">
                  &ldquo;{m.text}&rdquo;
                  {m.source === "transcript" && (
                    <span className="ml-2 not-italic text-xs text-grey-note">(video transcript)</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {droppedCount > 0 && (
            <p className="text-sm text-grey-note">
              {droppedCount === 1
                ? "1 quote couldn't be found in your text and was removed."
                : `${droppedCount} quotes couldn't be found in your text and were removed.`}
            </p>
          )}

          <p>
            <span className="font-hand text-xl font-bold text-redpen">Fix this first: </span>
            {fix}
          </p>
        </div>
      )}
    </article>
  );
}
