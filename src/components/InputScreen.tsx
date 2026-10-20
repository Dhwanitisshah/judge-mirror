"use client";

import { useState, type Dispatch } from "react";
import { MAX_DESCRIPTION_CHARS, WARN_BELOW_CHARS } from "@/lib/limits";
import { BUILD_WITH_AI_BASICS } from "@/lib/presets";
import type { Action, AppState, CriteriaMode } from "@/lib/state";

const fieldClass =
  "w-full rounded-sm border border-rule bg-paper p-3 text-[1.02rem] leading-7 shadow-inner focus:border-redpen focus:outline-none focus:ring-1 focus:ring-redpen";

export function InputScreen({
  state,
  dispatch,
  onSubmit,
  hasSample,
  onUseSample,
}: {
  state: AppState;
  dispatch: Dispatch<Action>;
  onSubmit: () => void;
  /** True in mock mode, when the bundled sample submission is available. */
  hasSample: boolean;
  onUseSample: () => void;
}) {
  // The transcript box is collapsed until the user opens it, but never hides a transcript that is already filled in.
  const [opened, setOpened] = useState(false);
  const transcriptOpen = opened || state.transcript.length > 0;
  const count = state.description.length;
  const showShortWarning = count > 0 && count < WARN_BELOW_CHARS;

  return (
    <form
      className="mx-auto max-w-3xl space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <section className="space-y-3">
        <label htmlFor="criteria-mode" className="block text-lg font-semibold">
          Judging criteria
        </label>
        <select
          id="criteria-mode"
          value={state.criteriaMode}
          onChange={(e) => dispatch({ type: "set", field: "criteriaMode", value: e.target.value as CriteriaMode })}
          className={fieldClass + " max-w-xs"}
        >
          <option value="preset">Build With AI: Basics</option>
          <option value="custom">Custom</option>
        </select>

        {state.criteriaMode === "preset" ? (
          <ul className="space-y-1 rounded-sm border border-rule bg-paper p-3 text-sm text-grey-note">
            {BUILD_WITH_AI_BASICS.map((c) => (
              <li key={c.name}>
                <span className="font-semibold text-ink">{c.name}.</span> {c.description}
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <label htmlFor="criteria-text" className="sr-only">
              Paste your judging criteria
            </label>
            <textarea
              id="criteria-text"
              rows={5}
              value={state.criteriaText}
              onChange={(e) => dispatch({ type: "set", field: "criteriaText", value: e.target.value })}
              placeholder="Paste the judging criteria from the hackathon page. You'll check how they were read before anything is marked."
              className={fieldClass}
            />
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="description" className="block text-lg font-semibold">
            Your submission description
          </label>
          {hasSample && (
            <button
              type="button"
              onClick={onUseSample}
              className="text-sm text-grey-note underline underline-offset-2 hover:text-redpen"
            >
              Use the sample submission (mock mode)
            </button>
          )}
        </div>
        <textarea
          id="description"
          rows={12}
          value={state.description}
          onChange={(e) => dispatch({ type: "set", field: "description", value: e.target.value })}
          placeholder="Paste the text of your Devpost description here."
          className={fieldClass}
          aria-describedby="description-count"
        />
        <p id="description-count" className="text-sm text-grey-note">
          {count.toLocaleString("en-US")} characters
          {count > MAX_DESCRIPTION_CHARS && ` (the limit is ${MAX_DESCRIPTION_CHARS.toLocaleString("en-US")})`}
        </p>
        {showShortWarning && (
          <p className="font-medium text-redpen">
            Under {WARN_BELOW_CHARS} characters. A judge won&apos;t have much to go on, and neither will I.
          </p>
        )}
      </section>

      <section className="space-y-2">
        {transcriptOpen ? (
          <>
            <label htmlFor="transcript" className="block text-lg font-semibold">
              Video transcript <span className="text-sm font-normal text-grey-note">(optional)</span>
            </label>
            <textarea
              id="transcript"
              rows={6}
              value={state.transcript}
              onChange={(e) => {
                setOpened(true); // once you have typed here the box stays open, even if you clear it
                dispatch({ type: "set", field: "transcript", value: e.target.value });
              }}
              placeholder="Paste what you say in your demo video."
              className={fieldClass}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="text-grey-note underline underline-offset-2 hover:text-redpen"
          >
            + Add a video transcript (optional)
          </button>
        )}
      </section>

      <section className="space-y-3">
        {state.notice && (
          <p role="alert" className="font-medium text-redpen">
            {state.notice}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={state.parsing}
            className="rounded-sm border-2 border-redpen bg-redpen px-5 py-2.5 font-semibold text-paper hover:bg-paper hover:text-redpen disabled:opacity-60"
          >
            {state.parsing ? "Reading your criteria…" : "Review my submission"}
          </button>
          <p className="text-sm text-grey-note">Uses a free AI tier. Don&apos;t paste anything private.</p>
        </div>
      </section>
    </form>
  );
}
