// Tunable limits. See spec.md > Quote verification and Important Failure Modes.

/** A quote shorter than this can't be matched meaningfully (a 2-character "quote" would match anywhere). */
export const MIN_QUOTE_CHARS = 12;
/** A quote longer than this would underline a whole paragraph. */
export const MAX_QUOTE_CHARS = 300;

/** Below this many characters the submission is blocked with a friendly message. */
export const MIN_REVIEW_CHARS = 50;
/** Below this many characters the submission box only shows a warning. */
export const WARN_BELOW_CHARS = 300;

export const MAX_CRITERIA_TEXT_CHARS = 4000;
export const MAX_DESCRIPTION_CHARS = 15000;
export const MAX_TRANSCRIPT_CHARS = 30000;

export const MIN_CRITERIA = 1;
export const MAX_CRITERIA = 8;
