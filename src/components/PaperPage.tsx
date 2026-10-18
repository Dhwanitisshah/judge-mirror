"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { wavyUnderlinePath, handEllipsePath } from "@/lib/handdrawn";
import { buildSegments, countMarks, type PaperMark } from "@/lib/segments";
import type { ReviewResponse, Source, Texts } from "@/lib/schema";
import { PenCircle } from "./PenCircle";

type Note = {
  id: string;
  /** Key of the place on the paper this note points at: "a-<offset>" or "caret". */
  anchor: string;
  kind: "evidence" | "flag" | "caret";
  number?: number;
  text: string;
};

type Geometry = {
  underlines: { key: string; x: number; y: number; w: number; levels: number; seed: number }[];
  numbers: { key: string; x: number; y: number; text: string }[];
  loops: { key: string; cx: number; cy: number; rx: number; ry: number; seed: number }[];
  noteTops: Record<string, number>;
  columnHeight: number;
};

const EMPTY: Geometry = { underlines: [], numbers: [], loops: [], noteTops: {}, columnHeight: 0 };

const FLAG_NOTE = "An instruction aimed at the grader. I read it as text and did not obey it.";

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
  const hasCaret = active === "description" && result.criteria.some((c) => c.state === "not-addressed");

  const notes = useMemo<Note[]>(() => {
    const list: Note[] = [];
    result.criteria.forEach((c, i) =>
      c.marks.forEach((m, j) => {
        if (m.source !== active) return;
        list.push({ id: `e-${i}-${j}`, anchor: `a-${m.start}`, kind: "evidence", number: i + 1, text: `${c.name}: ${c.score}/5` });
      }),
    );
    result.flags.forEach((f, k) => {
      if (f.source !== active) return;
      list.push({ id: `f-${k}`, anchor: `a-${f.start}`, kind: "flag", text: FLAG_NOTE });
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
        });
      });
    }
    return list;
  }, [result, active]);

  const textRef = useRef<HTMLDivElement>(null);
  const spanEls = useRef(new Map<number, HTMLElement>());
  const noteEls = useRef(new Map<string, HTMLElement>());
  const caretEl = useRef<HTMLElement | null>(null);
  const [geo, setGeo] = useState<Geometry>(EMPTY);

  // Read where the text really landed (one rectangle per wrapped line) and draw the pen strokes and margin
  // notes from that. Re-run whenever layout can change, so notes stay level with their lines.
  const measure = useCallback(() => {
    const container = textRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const next: Geometry = { underlines: [], numbers: [], loops: [], noteTops: {}, columnHeight: 0 };
    const anchorTops: Record<string, number> = {};

    for (const s of segments) {
      const el = spanEls.current.get(s.start);
      if (!el || (s.criteria.length === 0 && !s.flagged)) continue;
      const rects = Array.from(el.getClientRects()).filter((r) => r.width > 1 && r.height > 1);
      if (rects.length === 0) continue;
      anchorTops[`a-${s.start}`] = rects[0].top - cr.top;
      rects.forEach((r, i) => {
        if (s.criteria.length > 0) {
          next.underlines.push({
            key: `u-${s.start}-${i}`,
            x: r.left - cr.left,
            y: r.bottom - cr.top + 1,
            w: r.width,
            levels: Math.min(s.criteria.length, 3),
            seed: s.start * 13 + i,
          });
        }
        if (s.flagged) {
          next.loops.push({
            key: `l-${s.start}-${i}`,
            cx: r.left - cr.left + r.width / 2,
            cy: r.top - cr.top + r.height / 2,
            rx: r.width / 2 + 14,
            ry: r.height / 2 + 8,
            seed: s.start * 7 + i,
          });
        }
      });
      if (s.criteria.length > 0) {
        const last = rects[rects.length - 1];
        next.numbers.push({
          key: `n-${s.start}`,
          x: last.right - cr.left + 2,
          y: last.top - cr.top + 5,
          text: s.criteria.join(","),
        });
      }
    }
    if (caretEl.current) anchorTops["caret"] = caretEl.current.getBoundingClientRect().top - cr.top;

    // Margin notes: level with their line, pushed down just enough that none overlap.
    const entries = notes
      .map((n) => ({ n, top: anchorTops[n.anchor] ?? 0, h: noteEls.current.get(n.id)?.offsetHeight ?? 28 }))
      .sort((a, b) => a.top - b.top);
    let prevBottom = -Infinity;
    for (const { n, top, h } of entries) {
      const t = Math.max(top, prevBottom + 6);
      next.noteTops[n.id] = t;
      prevBottom = t + h;
      next.columnHeight = Math.max(next.columnHeight, prevBottom);
    }
    setGeo(next);
  }, [segments, notes]);

  useLayoutEffect(() => {
    measure();
    const el = textRef.current;
    if (!el) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule);
    // Web fonts change line breaks when they finish loading.
    const fonts = document.fonts;
    fonts?.ready.then(schedule);
    fonts?.addEventListener?.("loadingdone", schedule);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      fonts?.removeEventListener?.("loadingdone", schedule);
    };
  }, [measure]);

  const tabs: { source: Source; label: string }[] = [
    { source: "description", label: tabLabel("Description", countMarks(marksBySource.description)) },
  ];
  if (hasTranscript) {
    tabs.push({ source: "transcript", label: tabLabel("Video transcript", countMarks(marksBySource.transcript)) });
  }

  // Reading order for the narrow-screen list: by position in the text, caret notes last.
  const position = (anchor: string) => (anchor === "caret" ? Infinity : Number(anchor.slice(2)));
  const notesInOrder = [...notes].sort((a, b) => position(a.anchor) - position(b.anchor));

  return (
    <section aria-label="Your text, marked up" className="rounded-sm border border-rule bg-paper shadow-md">
      <div role="tablist" className="flex gap-1 border-b border-rule px-3 pt-3 sm:px-4">
        {tabs.map((t) => (
          <button
            key={t.source}
            role="tab"
            aria-selected={active === t.source}
            onClick={() => setTab(t.source)}
            className={
              "whitespace-nowrap rounded-t-sm border border-b-0 px-2 py-1.5 text-[0.8rem] sm:px-3 sm:text-sm " +
              (active === t.source
                ? "border-rule bg-paper font-semibold text-ink"
                : "border-transparent text-grey-note hover:text-ink")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative p-5 md:p-6 md:pr-[230px]" style={{ minHeight: geo.columnHeight + 48 }}>
        <div ref={textRef} data-paper-text className="relative whitespace-pre-wrap text-[1.05rem] leading-8">
          {segments.map((s) => (
            <span
              key={s.start}
              data-seg-start={s.start}
              ref={(el) => {
                if (el) spanEls.current.set(s.start, el);
                else spanEls.current.delete(s.start);
              }}
            >
              {s.text}
            </span>
          ))}
          {hasCaret && (
            <span
              ref={(el) => {
                caretEl.current = el;
              }}
              aria-hidden="true"
              className="ml-1 font-hand text-3xl font-bold text-redpen"
            >
              ^
            </span>
          )}

          {/* The red pen: strokes drawn over the real line positions. Decoration only. */}
          <svg
            aria-hidden="true"
            data-pen-overlay
            className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible text-redpen"
          >
            {geo.underlines.map((u) =>
              Array.from({ length: u.levels }, (_, i) => (
                <path
                  key={`${u.key}-${i}`}
                  data-pen="underline"
                  transform={`translate(${u.x} ${u.y + i * 5})`}
                  d={wavyUnderlinePath(u.w, u.seed + i * 97)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.92}
                />
              )),
            )}
            {geo.loops.map((l) => (
              <path
                key={l.key}
                data-pen="flag-loop"
                d={handEllipsePath(l.cx, l.cy, l.rx, l.ry, l.seed)}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
              />
            ))}
            {geo.numbers.map((n) => (
              <text
                key={n.key}
                data-pen="number"
                x={n.x}
                y={n.y}
                fill="currentColor"
                fontSize="20"
                fontWeight="700"
                style={{ fontFamily: "var(--font-hand)" }}
              >
                {n.text}
              </text>
            ))}
          </svg>
        </div>

        {/* Which criterion each underline belongs to, for screen readers (the pen overlay is decoration). */}
        <ul className="sr-only">
          {result.criteria.map((c, i) =>
            c.marks
              .filter((m) => m.source === active)
              .map((m, j) => (
                <li key={`${i}-${j}`}>
                  Criterion {i + 1}, {c.name}: {m.text}
                </li>
              )),
          )}
        </ul>

        {/* Margin notes, level with the lines they point at (wide screens). */}
        <ol className="absolute right-4 top-5 hidden w-[200px] md:top-6 md:block" style={{ height: geo.columnHeight }}>
          {notes.map((n) => (
            <li
              key={n.id}
              data-note={n.id}
              data-note-anchor={n.anchor}
              ref={(el) => {
                if (el) noteEls.current.set(n.id, el);
                else noteEls.current.delete(n.id);
              }}
              className="absolute left-0 right-0 font-hand text-[1.2rem] leading-tight text-redpen"
              style={{ top: geo.noteTops[n.id] ?? 0 }}
            >
              {n.kind === "flag" ? (
                <span>⚑ {n.text}</span>
              ) : (
                <span className="flex items-start gap-1.5">
                  <PenCircle seed={(n.number ?? 0) * 11 + n.id.length} className="mt-0.5 h-6 w-6 text-base font-bold leading-none" strokeWidth={1.8}>
                    {n.number}
                  </PenCircle>
                  <span>{n.text}</span>
                </span>
              )}
            </li>
          ))}
        </ol>

        {/* The same notes as a plain list under the text (narrow screens). */}
        {notesInOrder.length > 0 && (
          <ol className="mt-6 space-y-1.5 border-t border-rule pt-4 font-hand text-[1.2rem] leading-snug text-redpen md:hidden">
            {notesInOrder.map((n) => (
              <li key={n.id}>{n.kind === "flag" ? `⚑ ${n.text}` : `${n.number}. ${n.text}`}</li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
