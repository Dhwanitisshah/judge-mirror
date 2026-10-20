// Wording and numbers shared by the server pipeline and the screens.

/** Without a video transcript the Presentation criterion can only be judged on the written text, so it is capped here. */
export const PRESENTATION_CAP_WITHOUT_TRANSCRIPT = 3;

/** The pen note on the Presentation card when no transcript was given (prd.md > The Scorecard). */
export const TEXT_ONLY_NOTE = "Judged on your text only. Judges weigh the video; paste its transcript for a full mark.";

/** A criterion counts as "Presentation" by its name, so the rule also applies to a custom criterion called that. */
export const isPresentation = (name: string) => name.trim().toLowerCase() === "presentation";
