import { describe, expect, it } from "vitest";
import { buildSegments, countMarks, type PaperMark } from "./segments";

const text = "abcdefghij"; // 10 characters
const ev = (start: number, end: number, criterion: number): PaperMark => ({ start, end, criterion });
const flag = (start: number, end: number): PaperMark => ({ start, end, criterion: null });
const shape = (marks: PaperMark[], t = text) => buildSegments(t, marks).map((s) => [s.start, s.end, s.criteria]);

describe("buildSegments", () => {
  it("returns one plain segment when there are no marks", () => {
    expect(buildSegments(text, [])).toEqual([{ start: 0, end: 10, text, criteria: [], flagged: false }]);
  });

  it("returns nothing for empty text", () => {
    expect(buildSegments("", [])).toEqual([]);
    expect(buildSegments("", [ev(0, 0, 1)])).toEqual([]);
  });

  it("cuts around a single mark", () => {
    expect(shape([ev(2, 5, 1)])).toEqual([[0, 2, []], [2, 5, [1]], [5, 10, []]]);
  });

  it("keeps adjacent marks separate", () => {
    expect(shape([ev(0, 3, 1), ev(3, 6, 2)])).toEqual([[0, 3, [1]], [3, 6, [2]], [6, 10, []]]);
  });

  it("gives an overlap both criterion numbers", () => {
    expect(shape([ev(0, 6, 1), ev(4, 8, 2)])).toEqual([[0, 4, [1]], [4, 6, [1, 2]], [6, 8, [2]], [8, 10, []]]);
  });

  it("handles a mark nested inside another", () => {
    expect(shape([ev(0, 8, 1), ev(2, 4, 2)])).toEqual([[0, 2, [1]], [2, 4, [1, 2]], [4, 8, [1]], [8, 10, []]]);
  });

  it("carries both numbers when two criteria mark exactly the same words", () => {
    expect(shape([ev(2, 6, 2), ev(2, 6, 1)])).toEqual([[0, 2, []], [2, 6, [1, 2]], [6, 10, []]]);
  });

  it("lists each criterion number once, in ascending order", () => {
    expect(shape([ev(0, 5, 3), ev(3, 8, 3), ev(2, 4, 1)])).toEqual([
      [0, 2, [3]],
      [2, 3, [1, 3]],
      [3, 4, [1, 3]],
      [4, 5, [3]],
      [5, 8, [3]],
      [8, 10, []],
    ]);
  });

  it("marks the injection flag without giving it a criterion number", () => {
    const segs = buildSegments(text, [flag(2, 6), ev(4, 8, 1)]);
    expect(segs.map((s) => [s.start, s.end, s.criteria, s.flagged])).toEqual([
      [0, 2, [], false],
      [2, 4, [], true],
      [4, 6, [1], true],
      [6, 8, [1], false],
      [8, 10, [], false],
    ]);
  });

  it("ignores empty and out-of-range marks", () => {
    expect(shape([ev(3, 3, 1), ev(5, 2, 1), ev(-1, 4, 1), ev(6, 99, 1)])).toEqual([[0, 10, []]]);
  });

  it("always reproduces the original text when the segments are joined", () => {
    const marks = [ev(0, 6, 1), ev(4, 8, 2), flag(7, 10), ev(2, 4, 3)];
    expect(buildSegments(text, marks).map((s) => s.text).join("")).toBe(text);
  });

  it("never produces overlapping or empty segments", () => {
    const segs = buildSegments(text, [ev(0, 6, 1), ev(4, 8, 2), flag(7, 10)]);
    for (let i = 0; i < segs.length; i++) {
      expect(segs[i].end).toBeGreaterThan(segs[i].start);
      if (i > 0) expect(segs[i].start).toBe(segs[i - 1].end);
    }
  });
});

describe("countMarks (the number in a tab label)", () => {
  it("counts every drawn mark, evidence and flags, but not empty ones", () => {
    expect(countMarks([])).toBe(0);
    expect(countMarks([ev(0, 3, 1), ev(2, 5, 2), flag(6, 9), ev(4, 4, 1)])).toBe(3);
  });
});
