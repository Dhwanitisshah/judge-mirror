"use client";

import { useEffect, useState } from "react";

const STATUS_LINES = [
  "Reading your description…",
  "Finding the sentences a judge would underline…",
  "Checking every quote against your text…",
];
const STATUS_EVERY_MS = 4500;
const SLOW_AFTER_MS = 20000;

/**
 * "Marking your paper…" written over the user's own text. A review can take about 30 seconds, so the paper
 * shows a slow red pen sweep and honest status lines that describe what the pipeline really does. No fake percentage.
 */
export function MarkingState({ text }: { text: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - started), 500);
    return () => clearInterval(id);
  }, []);

  const line = STATUS_LINES[Math.floor(elapsed / STATUS_EVERY_MS) % STATUS_LINES.length];
  const slow = elapsed >= SLOW_AFTER_MS;

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="relative mx-auto max-w-3xl overflow-hidden rounded-sm border border-rule bg-paper shadow-md"
    >
      <div className="pen-sweep pointer-events-none absolute inset-x-0 h-0.5 bg-redpen/70" aria-hidden="true" />
      <div className="p-6 pb-4">
        <h2 className="font-hand text-4xl font-bold text-redpen">Marking your paper…</h2>
        <p className="mt-1 font-hand text-2xl text-redpen/80">{line}</p>
        {slow && <p className="mt-1 text-sm text-grey-note">Still marking. The free API can be slow.</p>}
      </div>
      <div className="max-h-[22rem] overflow-hidden whitespace-pre-wrap px-6 pb-6 text-[1.05rem] leading-8 text-ink/70">
        {text}
      </div>
    </section>
  );
}
