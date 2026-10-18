import { describe, expect, it } from "vitest";
import { endpointGap, handEllipsePath, seededRandom, wavyUnderlinePath } from "./handdrawn";

describe("seededRandom", () => {
  it("gives the same sequence for the same seed and stays in [0, 1)", () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("gives different sequences for different seeds", () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
});

describe("hand-drawn strokes", () => {
  it("draw the same path every time for the same seed (nothing wobbles between renders)", () => {
    expect(wavyUnderlinePath(200, 5)).toBe(wavyUnderlinePath(200, 5));
    expect(handEllipsePath(50, 50, 46, 44, 5)).toBe(handEllipsePath(50, 50, 46, 44, 5));
  });

  it("draw different strokes for different seeds, so no two underlines look stamped", () => {
    expect(wavyUnderlinePath(200, 5)).not.toBe(wavyUnderlinePath(200, 6));
    expect(handEllipsePath(50, 50, 46, 44, 5)).not.toBe(handEllipsePath(50, 50, 46, 44, 6));
  });

  it("run the underline from the left edge to the right edge of the text", () => {
    const nums = wavyUnderlinePath(240, 3).match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(nums[0]).toBe(0);
    expect(Math.abs(nums[nums.length - 2] - 240)).toBeLessThan(1.5);
  });

  it("keep the underline within a few pixels of its baseline", () => {
    for (let seed = 0; seed < 30; seed++) {
      const ys = wavyUnderlinePath(300, seed).match(/-?\d+(\.\d+)?/g)!.map(Number).filter((_, i) => i % 2 === 1);
      expect(Math.max(...ys.map(Math.abs))).toBeLessThan(5);
    }
  });

  it("never quite close a loop: it stops clearly short of where it started", () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(endpointGap(handEllipsePath(50, 50, 46, 44, seed))).toBeGreaterThan(5);
    }
  });

  it("make a solid enough loop that the gap is only a small part of the circle", () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(endpointGap(handEllipsePath(50, 50, 46, 44, seed))).toBeLessThan(40);
    }
  });
});
