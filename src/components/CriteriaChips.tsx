"use client";

import type { Criterion } from "@/lib/schema";
import { MAX_CRITERIA } from "@/lib/limits";
import { chipsValid } from "@/lib/state";
import { PenCircle } from "./PenCircle";

const inputClass =
  "w-full rounded-sm border border-rule bg-paper px-2 py-1.5 focus:border-redpen focus:outline-none focus:ring-1 focus:ring-redpen";

export function CriteriaChips({
  chips,
  onChange,
  onConfirm,
  onBack,
}: {
  chips: Criterion[];
  onChange: (chips: Criterion[]) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const update = (i: number, patch: Partial<Criterion>) =>
    onChange(chips.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const valid = chipsValid(chips);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Did I read your criteria correctly?</h2>
        <p className="mt-1 text-grey-note">
          I won&apos;t mark a single line against a rubric I might have misread. Fix anything that&apos;s off, then confirm.
        </p>
      </div>

      <ul className="space-y-3">
        {chips.map((c, i) => (
          <li key={i} className="space-y-2 rounded-sm border border-rule bg-paper p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <PenCircle seed={i * 5 + 2} className="h-8 w-8 font-hand text-xl font-bold leading-none" strokeWidth={2}>
                {i + 1}
              </PenCircle>
              <label className="sr-only" htmlFor={`chip-name-${i}`}>
                Criterion {i + 1} name
              </label>
              <input
                id={`chip-name-${i}`}
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className={inputClass + " font-semibold"}
              />
              <button
                type="button"
                onClick={() => onChange(chips.filter((_, j) => j !== i))}
                disabled={chips.length <= 1}
                aria-label={`Remove criterion ${i + 1}`}
                className="px-2 text-xl text-grey-note hover:text-redpen disabled:opacity-30"
              >
                ×
              </button>
            </div>
            <label className="sr-only" htmlFor={`chip-desc-${i}`}>
              Criterion {i + 1} description
            </label>
            <textarea
              id={`chip-desc-${i}`}
              rows={2}
              value={c.description}
              onChange={(e) => update(i, { description: e.target.value })}
              className={inputClass + " text-sm"}
            />
          </li>
        ))}
      </ul>

      {chips.length < MAX_CRITERIA && (
        <button
          type="button"
          onClick={() => onChange([...chips, { name: "", description: "" }])}
          className="text-grey-note underline underline-offset-2 hover:text-redpen"
        >
          + Add a criterion
        </button>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!valid}
          className="rounded-sm border-2 border-redpen bg-redpen px-5 py-2.5 font-semibold text-paper hover:bg-paper hover:text-redpen disabled:opacity-50"
        >
          Confirm and review
        </button>
        <button type="button" onClick={onBack} className="text-grey-note underline underline-offset-2 hover:text-redpen">
          Back to my text
        </button>
        {!valid && <p className="text-sm text-grey-note">Every criterion needs a name and a description. I can&apos;t grade against a blank.</p>}
      </div>
    </div>
  );
}
