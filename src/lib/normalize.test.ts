import { describe, expect, it } from "vitest";
import { normalizeWithMap } from "./normalize";

describe("normalizeWithMap", () => {
  it("leaves plain text alone, with an identity map", () => {
    const n = normalizeWithMap("hello");
    expect(n.text).toBe("hello");
    expect(n.map).toEqual([0, 1, 2, 3, 4].map((i) => ({ start: i, end: i + 1 })));
  });

  it("turns curly quotes into straight quotes", () => {
    expect(normalizeWithMap("‘a’ “b” it’s").text).toBe(`'a' "b" it's`);
  });

  it("turns en dashes, em dashes and minus signs into hyphens", () => {
    expect(normalizeWithMap("a–b—c−d").text).toBe("a-b-c-d");
  });

  it("turns a non-breaking space into a space", () => {
    expect(normalizeWithMap("a b").text).toBe("a b");
  });

  it("collapses every run of whitespace, newlines included, into one space", () => {
    expect(normalizeWithMap("a \n\t b").text).toBe("a b");
    expect(normalizeWithMap("a\r\n\r\nb").text).toBe("a b");
  });

  it("maps a collapsed run back to the whole run in the original", () => {
    // original: a(0) space(1) \n(2) \t(3) space(4) b(5)
    expect(normalizeWithMap("a \n\t b").map).toEqual([
      { start: 0, end: 1 },
      { start: 1, end: 5 },
      { start: 5, end: 6 },
    ]);
  });

  it("keeps case, and keeps leading and trailing whitespace as a single space", () => {
    expect(normalizeWithMap("  Hello World  ").text).toBe(" Hello World ");
  });

  it("returns one map entry per normalized character on messy input", () => {
    const n = normalizeWithMap("It’s “fast” – really\n\nfast.");
    expect(n.map).toHaveLength(n.text.length);
  });

  it("handles the empty string", () => {
    expect(normalizeWithMap("")).toEqual({ text: "", map: [] });
  });
});
