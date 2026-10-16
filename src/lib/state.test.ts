import { describe, expect, it } from "vitest";
import { BUILD_WITH_AI_BASICS } from "./presets";
import type { ReviewResponse } from "./schema";
import { activeCriteria, chipsValid, initialState, reducer, validateInput, type AppState } from "./state";

const response: ReviewResponse = { criteria: [], flags: [], meta: { model: "mock", mock: true } };
const longText = "x".repeat(60);

function inResults(): AppState {
  let s: AppState = { ...initialState, criteriaMode: "custom", criteriaText: "Be good", description: longText, transcript: "words" };
  s = reducer(s, { type: "toggle_stage", index: 0 });
  s = reducer(s, { type: "toggle_stage", index: 2 });
  s = reducer(s, { type: "parse_ok", chips: [{ name: "Good", description: "Is it good?" }] });
  s = reducer(s, { type: "chips_confirm" });
  return reducer(s, { type: "review_ok", response, texts: { description: longText } });
}

describe("Review again", () => {
  it("returns to the input view and keeps criteria, text, transcript and Stage One ticks", () => {
    const before = inResults();
    expect(before.view).toBe("results");
    const after = reducer(before, { type: "review_again" });
    expect(after.view).toBe("input");
    expect(after.criteriaMode).toBe("custom");
    expect(after.criteriaText).toBe("Be good");
    expect(after.criteria).toEqual(before.criteria);
    expect(after.description).toBe(longText);
    expect(after.transcript).toBe("words");
    expect(after.stageOne).toEqual([true, false, true, false]);
  });

  it("keeps the ticks after a second review runs", () => {
    let s = reducer(inResults(), { type: "review_again" });
    s = reducer(s, { type: "review_start" });
    s = reducer(s, { type: "review_ok", response, texts: { description: longText } });
    expect(s.stageOne).toEqual([true, false, true, false]);
  });

  it("can untick an item the user ticked, and never ticks one on its own", () => {
    const s = reducer(inResults(), { type: "toggle_stage", index: 0 });
    expect(s.stageOne).toEqual([false, false, true, false]);
    expect(initialState.stageOne).toEqual([false, false, false, false]);
  });

  it("keeps the inputs when an error brings the user back", () => {
    const failed = reducer(inResults(), { type: "fail", message: "busy" });
    const back = reducer(failed, { type: "back_to_input" });
    expect(back.view).toBe("input");
    expect(back.description).toBe(longText);
  });
});

describe("validateInput: the 50 and 300 character rules", () => {
  const withText = (description: string): AppState => ({ ...initialState, description });

  it("blocks a description under 50 characters", () => {
    expect(validateInput(withText("x".repeat(49)))).toMatch(/too short/);
    expect(validateInput(withText(""))).toMatch(/too short/);
    expect(validateInput(withText("   " + "x".repeat(40) + "   "))).toMatch(/too short/);
  });

  it("allows 50 characters, and under 300 is only a warning, not a block", () => {
    expect(validateInput(withText("x".repeat(50)))).toBeNull();
    expect(validateInput(withText("x".repeat(299)))).toBeNull();
  });

  it("blocks text over the caps", () => {
    expect(validateInput(withText("x".repeat(15001)))).toMatch(/over 15,000/);
    expect(validateInput({ ...withText(longText), transcript: "x".repeat(30001) })).toMatch(/over 30,000/);
  });

  it("needs criteria text in Custom mode", () => {
    expect(validateInput({ ...withText(longText), criteriaMode: "custom" })).toMatch(/criteria/);
  });
});

describe("activeCriteria and chips", () => {
  it("uses the four preset criteria with the hackathon wording", () => {
    expect(activeCriteria(initialState)).toBe(BUILD_WITH_AI_BASICS);
    expect(BUILD_WITH_AI_BASICS.map((c) => c.name)).toEqual([
      "Design",
      "Potential Impact",
      "Innovation/Idea",
      "Presentation",
    ]);
  });

  it("needs a fresh confirmation when custom criteria text changes after confirming", () => {
    const confirmed = inResults();
    expect(activeCriteria(confirmed)).not.toBeNull();
    const edited = reducer(confirmed, { type: "set", field: "criteriaText", value: "Be great" });
    expect(activeCriteria(edited)).toBeNull();
  });

  it("accepts 1 to 8 chips that each have a name and a description", () => {
    const chip = { name: "A", description: "B" };
    expect(chipsValid([])).toBe(false);
    expect(chipsValid([chip])).toBe(true);
    expect(chipsValid(Array(8).fill(chip))).toBe(true);
    expect(chipsValid(Array(9).fill(chip))).toBe(false);
    expect(chipsValid([{ name: " ", description: "B" }])).toBe(false);
  });
});
