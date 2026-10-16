"use client";

import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildSegments, countMarks, type PaperMark } from "@/lib/segments";
import type { ReviewResponse, Source, Texts } from "@/lib/schema";

type Note = {
  id: string;
  /** Key of the element on the paper this note points at. */
  anchor: string;
  kind: "evidence" | "flag" | "caret";
  number?: number;
  text: string;
  /** Rough height in px, used to stop notes overlapping in the margin. */
  height: number;
};

const FLAG_NOTE = "Instruction aimed at the reviewer. Treated as text, not obeyed.";

function tabLabel(name: string, marks: number) {
  return `${name} · ${marks} ${marks === 1 ? "mark" : "marks"}`;
}

export function PaperPage({ texts, result }: { texts: Texts; result: ReviewResponse }) {
  const hasTranscript = Boolean(texts.transcript);
  const [tab, setTab] = useState<Source>("description");
  const active: Source = tab === "transcript" && hasTranscript ? "transcript" : "description";
  const text = (active === "transcript" ? texts.transcript : texts.description) ?? "";

  // Marks per tab. Criterion numbers are the criterion's position in the list, so they match across both tabs.
  const marksBySource = useMemo(() => {
    const out: Record<Source, PaperMark[]> = { description: [], transcript: [] };
    result.criteria.forEach((c, i) =>
      c.marks.forEach((m) => out[m.source].push({ start: m.start, end: m.end, criterion: i + 1 })),
    );
    result.flags.forEach((f) => out[f.source].push({ start: f.start, end: f.end, criterion: null }));
    return out;
  }, [result]);

  const marks = marksBySource[active];
  const segments = useMemo(() => buildSegments(text, marks), [text, marks]);

  const notes = useMemo<Note[]>(() => {
    const list: Note[] = [];
    result.criteria.forEach((c, i) =>
      c.marks.forEach((m, j) => {
        if (m.source !== active) return;
        list.push({
          id: `e-${i}-${j}`,
          anchor: `a-${m.start}`,
          kind: "evidence",
          number: i + 1,
          text: `${c.name}: ${c.score}/5`,
          height: 26,
        });
      }),
    );
    result.flags.forEach((f, k) => {
      if (f.source !== active) return;
      list.push({ id: `f-${k}`, anchor: `a-${f.start}`, kind: "flag", text: FLAG_NOTE, height: 52 });
    });
    if (active === "description") {
      result.criteria.forEach((c, i) => {
        if (c.state !== "not-addressed") return;
        list.push({
          id: `c-${i}`,
          anchor: "caret",
          kind: "caret",
          number: i + 1,
          text: `${c.name}: not addressed. Judges can't credit what you don't say.`,
          height: 56,
        });
      });
    }
    return list;
  }, [result, active]);

  const textRef = useRef<HTMLDivElement>(null);
  const anchorEls = useRef<Record<string, HTMLElement | null>>({});
  const [layout, setLayout] = useState<{ tops: Record<string, number>; height: number }>({
    tops: {},
    height: 0,
  });

  // Put each margin note level with the line it points at, pushing later notes down so none overlap.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const place = () => {
      const entries = notes
        .map((n) => ({ n, top: anchorEls.current[n.anchor]?.offsetTop ?? 0 }))
        .sort((a, b) => a.top - b.top);
      const tops: Record<string, number> = {};
      let bottom = 0;
      let prevBottom = -Infinity;
      for (const { n, top } of entries) {
        const t = Math.max(top, prevBottom + 8);
        tops[n.id] = t;
        prevBottom = t + n.height;
        bottom = Math.max(bottom, prevBottom);
      }
      setLayout({ tops, height: bottom });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notes, segments]);

  const tabs: { source: Source; label: string }[] = [
    { source: "description", label: tabLabel("Description", countMarks(marksBySource.description)) },
  ];
  if (hasTranscript) {
    tabs.push({
      source: "transcript",
      label: tabLabel("Video transcript", countMarks(marksBySource.transcript)),
    });
  }

  // Reading order for the narrow-screen list: by position in the text, caret notes last.
  const position = (anchor: string) => (anchor === "caret" ? Infinity : Number(anchor.slice(2)));
  const notesInOrder = [...notes].sort((a, b) => position(a.anchor) - position(b.anchor));

  return (
    <section aria-label="Your text, marked up" className="rounded-sm border border-rule bg-paper shadow-md">
      <div role="tablist" className="flex gap-1 border-b border-rule px-4 pt-3">
        {tabs.map((t) => (
          <button
            key={t.source}
            role="tab"
            aria-selected={active === t.source}
            onClick={() => setTab(t.source)}
            className={
              "rounded-t-sm border border-b-0 px-3 py-1.5 text-sm " +
              (active === t.source
                ? "border-rule bg-paper font-semibold text-ink"
                : "border-transparent text-grey-note hover:text-ink")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative p-6 md:pr-[230px]" style={{ minHeight: layout.height + 48 }}>
        <div ref={textRef} className="relative whitespace-pre-wrap text-[1.05rem] leading-8">
          {segments.map((s) => {
            const classes = [
              s.criteria.length > 1 ? "mark-overlap" : s.criteria.length === 1 ? "mark" : "",
              s.flagged ? "flag-circle" : "",
            ]
              .join(" ")
              .trim();
            return (
              <Fragment key={s.start}>
                <span
                  ref={(el) => {
                    anchorEls.current[`a-${s.start}`] = el;
                  }}
                  className={classes || undefined}
                >
                  {s.text}
                </span>
                {s.criteria.length > 0 && (
                  <sup className="margin-num" aria-label={`Criterion ${s.criteria.join(" and ")}`}>
                    {s.criteria.join(",")}
                  </sup>
                )}
              </Fragment>
            );
          })}
          {active === "description" && notes.some((n) => n.kind === "caret") && (
            <span
              ref={(el) => {
                anchorEls.current["caret"] = el;
              }}
              aria-hidden="true"
              className="ml-1 font-hand text-3xl font-bold text-redpen"
            >
              ^
            </span>
          )}
        </div>

        {/* Margin notes, level with the lines they point at (wide screens). */}
        <ol className="absolute right-4 top-6 hidden w-[200px] md:block" style={{ height: layout.height }}>
          {notes.map((n) => (
            <li
              key={n.id}
              className="absolute left-0 right-0 font-hand text-lg leading-tight text-redpen"
              style={{ top: layout.tops[n.id] ?? 0 }}
            >
              {n.kind === "flag" ? (
                <span>⚑ {n.text}</span>
              ) : (
                <span>
                  <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-redpen text-base font-bold leading-none">
                    {n.number}
                  </span>
                  {n.text}
                </span>
              )}
            </li>
          ))}
        </ol>

        {/* The same notes as a plain list under the text (narrow screens). */}
        {notesInOrder.length > 0 && (
          <ol className="mt-6 space-y-1 border-t border-rule pt-4 font-hand text-lg text-redpen md:hidden">
            {notesInOrder.map((n) => (
              <li key={n.id}>{n.kind === "flag" ? `⚑ ${n.text}` : `${n.number}. ${n.text}`}</li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
