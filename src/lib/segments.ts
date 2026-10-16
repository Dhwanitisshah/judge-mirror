// Cuts one tab's text at every mark boundary so overlapping underlines can carry several criterion numbers.

export type PaperMark = {
  start: number;
  end: number;
  /** 1-based criterion number for evidence; null for an injection flag. */
  criterion: number | null;
};

export type Segment = {
  start: number;
  end: number;
  text: string;
  /** Criterion numbers (ascending) whose evidence covers this segment. */
  criteria: number[];
  /** True if an injection flag covers this segment. */
  flagged: boolean;
};

export function buildSegments(text: string, marks: PaperMark[]): Segment[] {
  const valid = marks.filter((m) => m.start < m.end && m.start >= 0 && m.end <= text.length);
  const cuts = new Set<number>([0, text.length]);
  for (const m of valid) {
    cuts.add(m.start);
    cuts.add(m.end);
  }
  const points = [...cuts].sort((a, b) => a - b);
  const segments: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (start === end) continue;
    const covering = valid.filter((m) => m.start <= start && m.end >= end);
    const criteria = [
      ...new Set(covering.filter((m) => m.criterion !== null).map((m) => m.criterion as number)),
    ].sort((a, b) => a - b);
    segments.push({
      start,
      end,
      text: text.slice(start, end),
      criteria,
      flagged: covering.some((m) => m.criterion === null),
    });
  }
  return segments;
}

/** The number shown in a tab label: every mark drawn on that tab (evidence underlines and flag circles). */
export function countMarks(marks: PaperMark[]): number {
  return marks.filter((m) => m.start < m.end).length;
}
