// All page state in one pure reducer (spec.md > Page state). No router, no storage:
// closing the tab loses everything, but "Review again" keeps the inputs and the Stage One ticks.

import {
  MAX_CRITERIA,
  MAX_CRITERIA_TEXT_CHARS,
  MAX_DESCRIPTION_CHARS,
  MAX_TRANSCRIPT_CHARS,
  MIN_REVIEW_CHARS,
} from "./limits";
import { BUILD_WITH_AI_BASICS } from "./presets";
import type { Criterion, ReviewResponse, Texts } from "./schema";

export type View = "input" | "confirm" | "marking" | "results" | "error";
export type CriteriaMode = "preset" | "custom";
export type StageOne = [boolean, boolean, boolean, boolean];

export const STAGE_ONE_ITEMS = [
  "Public repo",
  "Open-source license visible",
  "Planning docs present",
  "Video under 3 minutes",
] as const;

export type AppState = {
  view: View;
  criteriaMode: CriteriaMode;
  criteriaText: string;
  /** Draft chips shown on the confirm view. */
  chips: Criterion[];
  /** The criteria text that the confirmed custom criteria were read from (null if none confirmed). */
  confirmedFor: string | null;
  /** Confirmed custom criteria. */
  criteria: Criterion[];
  description: string;
  transcript: string;
  stageOne: StageOne;
  /** Friendly message shown on the input screen (blocked input). */
  notice: string | null;
  /** True while /api/parse-criteria is running. */
  parsing: boolean;
  result: { response: ReviewResponse; texts: Texts } | null;
  error: string | null;
};

export const initialState: AppState = {
  view: "input",
  criteriaMode: "preset",
  criteriaText: "",
  chips: [],
  confirmedFor: null,
  criteria: [],
  description: "",
  transcript: "",
  stageOne: [false, false, false, false],
  notice: null,
  parsing: false,
  result: null,
  error: null,
};

export type Action =
  | { type: "set"; field: "criteriaMode"; value: CriteriaMode }
  | { type: "set"; field: "criteriaText" | "description" | "transcript"; value: string }
  | { type: "notice"; message: string | null }
  | { type: "parse_start" }
  | { type: "parse_ok"; chips: Criterion[] }
  | { type: "chips_change"; chips: Criterion[] }
  | { type: "chips_confirm" }
  | { type: "chips_back" }
  | { type: "review_start" }
  | { type: "review_ok"; response: ReviewResponse; texts: Texts }
  | { type: "fail"; message: string }
  | { type: "review_again" }
  | { type: "back_to_input" }
  | { type: "toggle_stage"; index: number };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value, notice: null };
    case "notice":
      return { ...state, notice: action.message };
    case "parse_start":
      return { ...state, parsing: true, notice: null };
    case "parse_ok":
      return { ...state, parsing: false, chips: action.chips, view: "confirm" };
    case "chips_change":
      return { ...state, chips: action.chips };
    case "chips_confirm":
      return { ...state, criteria: state.chips, confirmedFor: state.criteriaText, view: "marking", error: null };
    case "chips_back":
      return { ...state, view: "input" };
    case "review_start":
      return { ...state, view: "marking", notice: null, error: null };
    case "review_ok":
      return { ...state, view: "results", result: { response: action.response, texts: action.texts } };
    case "fail":
      return { ...state, view: "error", parsing: false, error: action.message };
    case "review_again":
    case "back_to_input":
      // Everything except the view stays exactly as it was, Stage One ticks included.
      return { ...state, view: "input" };
    case "toggle_stage": {
      const stageOne = [...state.stageOne] as StageOne;
      stageOne[action.index] = !stageOne[action.index];
      return { ...state, stageOne };
    }
  }
}

/** The criteria a review would use right now, or null when custom criteria still need reading and confirming. */
export function activeCriteria(state: AppState): Criterion[] | null {
  if (state.criteriaMode === "preset") return BUILD_WITH_AI_BASICS;
  return state.confirmedFor !== null && state.confirmedFor === state.criteriaText ? state.criteria : null;
}

/** A friendly message when the input can't be reviewed, or null when it can. */
export function validateInput(state: AppState): string | null {
  if (state.criteriaMode === "custom") {
    if (state.criteriaText.trim().length === 0) return "Paste the judging criteria first. I can't mark against a rubric I haven't seen.";
    if (state.criteriaText.length > MAX_CRITERIA_TEXT_CHARS) {
      return `Your criteria run past ${MAX_CRITERIA_TEXT_CHARS.toLocaleString("en-US")} characters. Cut them down to the rubric itself and try again.`;
    }
  }
  const length = state.description.trim().length;
  if (length < MIN_REVIEW_CHARS) {
    return `That's not enough to mark. Paste at least ${MIN_REVIEW_CHARS} characters of your description.`;
  }
  if (state.description.length > MAX_DESCRIPTION_CHARS) {
    return `Your description runs past ${MAX_DESCRIPTION_CHARS.toLocaleString("en-US")} characters. A judge won't read that much either, so tighten it and try again.`;
  }
  if (state.transcript.length > MAX_TRANSCRIPT_CHARS) {
    return `Your transcript runs past ${MAX_TRANSCRIPT_CHARS.toLocaleString("en-US")} characters. Trim it to what you actually say in the video and try again.`;
  }
  return null;
}

/** Chips are valid when there are 1 to 8, each with a name and a description. */
export function chipsValid(chips: Criterion[]): boolean {
  return (
    chips.length >= 1 &&
    chips.length <= MAX_CRITERIA &&
    chips.every((c) => c.name.trim().length > 0 && c.description.trim().length > 0)
  );
}

export function errorMessage(code: string): string {
  switch (code) {
    case "rate_limited":
      return "The free API is busy. Wait a minute and try again.";
    case "timeout":
      return "That took too long and I had to put my pen down. Try again in a moment.";
    case "too_long":
      return "That's more than I can mark in one sitting. Trim it and try again.";
    default:
      return "I couldn't mark your paper this time. Try again.";
  }
}
