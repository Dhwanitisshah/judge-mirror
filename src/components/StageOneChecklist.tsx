"use client";

import { STAGE_ONE_ITEMS, type StageOne } from "@/lib/state";

/** Four things about the repo, ticked by the user. The app never ticks one itself. */
export function StageOneChecklist({
  checked,
  onToggle,
}: {
  checked: StageOne;
  onToggle: (index: number) => void;
}) {
  return (
    <fieldset className="rounded-sm border border-rule bg-paper p-4 shadow-sm">
      <legend className="px-1 text-lg font-semibold">Stage One: tick each when it&apos;s true</legend>
      <ul className="space-y-2">
        {STAGE_ONE_ITEMS.map((label, i) => (
          <li key={label}>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => onToggle(i)}
                className="h-5 w-5 accent-[var(--redpen)]"
              />
              <span>{label}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
