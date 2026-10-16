// The judge of the model's claims (scope.md > The Unique Kernel: evidence or it didn't happen).
// Pure functions, no network. Every quote and flag the model returns must be found in the user's real text.

import { MAX_QUOTE_CHARS, MIN_QUOTE_CHARS } from "./limits";
import { normalizeWithMap, type Normalized } from "./normalize";
import type { CriterionState, FlagMark, Mark, Source, Texts } from "./schema";

const SOURCES: Source[] = ["description", "transcript"];

type Prepared = Partial<Record<Source, { original: string; norm: Normalized }>>;

function prepare(texts: Texts): Prepared {
  const out: Prepared = {};
  for (const s of SOURCES) {
    const original = texts[s];
    if (original) out[s] = { original, norm: normalizeWithMap(original) };
  }
  return out;
}

/** Normalize and trim a quote, or return null if it can't be a verbatim quote. */
function cleanQuote(quote: string): string | null {
  // An ellipsis means the model stitched pieces together: not verbatim.
  if (quote.includes("...") || quote.includes("…")) return null;
  const q = normalizeWithMap(quote).text.trim();
  if (q.length < MIN_QUOTE_CHARS || q.length > MAX_QUOTE_CHARS) return null;
  return q;
}

function findIn(prepared: Prepared, source: Source, q: string): Mark | null {
  const p = prepared[source];
  if (!p) return null;
  const idx = p.norm.text.indexOf(q); // case-sensitive, first occurrence
  if (idx === -1) return null;
  const start = p.norm.map[idx].start;
  const end = p.norm.map[idx + q.length - 1].end;
  return { source, start, end, text: p.original.slice(start, end) };
}

function verifyPrepared(quote: string, prepared: Prepared, statedSource: Source): Mark | null {
  const q = cleanQuote(quote);
  if (q === null) return null;
  const other: Source = statedSource === "description" ? "transcript" : "description";
  // Stated source first; if absent there, the other source, with the source field corrected.
  return findIn(prepared, statedSource, q) ?? findIn(prepared, other, q);
}

export function verifyQuote(quote: string, texts: Texts, statedSource: Source): Mark | null {
  return verifyPrepared(quote, prepare(texts), statedSource);
}

const sameRange = (a: Mark, b: Mark) => a.source === b.source && a.start === b.start && a.end === b.end;

export function verifyCriterion(
  evidence: { quote: string; source: Source }[],
  texts: Texts,
): { verified: Mark[]; droppedCount: number } {
  const prepared = prepare(texts);
  const verified: Mark[] = [];
  let droppedCount = 0;
  for (const e of evidence) {
    const mark = verifyPrepared(e.quote, prepared, e.source);
    if (!mark) droppedCount++;
    else if (!verified.some((v) => sameRange(v, mark))) verified.push(mark); // same range counts once
  }
  return { verified, droppedCount };
}

export function deriveState(evidenceReturned: number, verifiedKept: number): CriterionState {
  if (evidenceReturned === 0) return "not-addressed";
  return verifiedKept > 0 ? "verified" : "unverifiable";
}

/** Flags use the exact same checks as evidence; description first, then transcript. A flag not found is dropped. */
export function verifyFlag(quote: string, texts: Texts): FlagMark | null {
  const prepared = prepare(texts);
  const q = cleanQuote(quote);
  if (q === null) return null;
  for (const s of SOURCES) {
    const m = findIn(prepared, s, q);
    if (m) return { source: m.source, start: m.start, end: m.end };
  }
  return null;
}
