"use client";

import { useEffect, useState } from "react";
import { wavyUnderlinePath } from "@/lib/handdrawn";

const STATUS_LINES = [
  "Reading your description…",
  "Finding the sentences a judge would underline…",
  "Checking every quote against your text…",
];
const STATUS_EVERY_MS = 4500;
const SLOW_AFTER_MS = 20000;
const SWEEP_PATH = wavyUnderlinePath(1200, 4242);

/**
 * "Marking your paper…" written in red pen over the user's own text. A review can take about 30 seconds, so the
 * paper shows a slow hand-drawn pen stroke sweeping down it and status lines that describe what the pipeline
 * really does. No fake percentage, and no marks drawn before there are real ones.
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
      <svg
        aria-hidden="true"
        className="pen-sweep pointer-events-none absolute left-0 h-4 w-full text-redpen"
        preserveAspectRatio="xMinYMid slice"
        viewBox="0 -4 1200 8"
      >
        <path d={SWEEP_PATH} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" opacity={0.75} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="p-5 pb-4 md:p-6">
        <h2 className="font-hand text-4xl font-bold text-redpen">Marking your paper…</h2>
        <p className="mt-1 font-hand text-[1.6rem] leading-snug text-redpen">{line}</p>
        {slow && <p className="mt-2 text-[0.95rem] text-grey-note">Still marking. The free API can be slow.</p>}
      </div>
      <div className="max-h-[22rem] overflow-hidden whitespace-pre-wrap px-5 pb-6 text-[1.05rem] leading-8 text-ink/70 md:px-6">
        {text}
      </div>
    </section>
  );
}
