"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { CriteriaChips } from "@/components/CriteriaChips";
import { InputScreen } from "@/components/InputScreen";
import { MarkingState } from "@/components/MarkingState";
import { ResultsScreen } from "@/components/ResultsScreen";
import type { Criterion, ReviewResponse } from "@/lib/schema";
import { activeCriteria, errorMessage, initialState, reducer, validateInput } from "@/lib/state";

type Sample = { description: string; transcript: string };

/** POST JSON; returns the parsed body, or the error code the server sent (or "server" if it never answered). */
async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; code: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: data as T };
    return { ok: false, code: typeof data?.error === "string" ? data.error : "server" };
  } catch {
    return { ok: false, code: "server" };
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hasSample, setHasSample] = useState(false);
  const sample = useRef<Sample | null>(null);

  // /api/sample only answers in mock mode, so its answer tells us whether to offer the sample button.
  useEffect(() => {
    fetch("/api/sample")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: Sample | null) => {
        if (s) {
          sample.current = s;
          setHasSample(true);
        }
      })
      .catch(() => {});
  }, []);

  async function runReview(criteria: Criterion[]) {
    dispatch({ type: "review_start" });
    const texts = { description: state.description, transcript: state.transcript || undefined };
    const res = await postJson<ReviewResponse>("/api/review", { criteria, ...texts });
    if (res.ok) dispatch({ type: "review_ok", response: res.data, texts });
    else dispatch({ type: "fail", message: errorMessage(res.code) });
  }

  async function handleSubmit() {
    const problem = validateInput(state);
    if (problem) {
      dispatch({ type: "notice", message: problem });
      return;
    }
    const criteria = activeCriteria(state);
    if (criteria) {
      await runReview(criteria);
      return;
    }
    // Custom criteria that haven't been read (or have been edited since): read them, then let the user confirm.
    dispatch({ type: "parse_start" });
    const res = await postJson<{ criteria: Criterion[] }>("/api/parse-criteria", { text: state.criteriaText });
    if (res.ok) dispatch({ type: "parse_ok", chips: res.data.criteria });
    else dispatch({ type: "fail", message: errorMessage(res.code) });
  }

  function handleConfirmChips() {
    dispatch({ type: "chips_confirm" });
    void runReview(state.chips);
  }

  function useSample() {
    if (!sample.current) return;
    dispatch({ type: "set", field: "description", value: sample.current.description });
    dispatch({ type: "set", field: "transcript", value: sample.current.transcript });
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <header className="mb-8">
        <h1 className="font-hand text-5xl font-bold text-redpen">Judge Mirror</h1>
        <p className="text-grey-note">See your submission the way a judge will read it, before the deadline.</p>
      </header>

      {state.view === "input" && (
        // Keyed so the transcript box re-opens correctly when coming back with "Review again".
        <InputScreen
          key="input"
          state={state}
          dispatch={dispatch}
          onSubmit={handleSubmit}
          hasSample={hasSample}
          onUseSample={useSample}
        />
      )}

      {state.view === "confirm" && (
        <CriteriaChips
          chips={state.chips}
          onChange={(chips) => dispatch({ type: "chips_change", chips })}
          onConfirm={handleConfirmChips}
          onBack={() => dispatch({ type: "chips_back" })}
        />
      )}

      {state.view === "marking" && <MarkingState text={state.description} />}

      {state.view === "results" && state.result && (
        <ResultsScreen
          texts={state.result.texts}
          result={state.result.response}
          stageOne={state.stageOne}
          onToggleStage={(index) => dispatch({ type: "toggle_stage", index })}
          onReviewAgain={() => dispatch({ type: "review_again" })}
        />
      )}

      {state.view === "error" && (
        <section role="alert" className="mx-auto max-w-3xl space-y-4 rounded-sm border border-rule bg-paper p-6 shadow-md">
          <p className="font-hand text-3xl text-redpen">{state.error}</p>
          <p className="text-grey-note">Your text is still here.</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "back_to_input" })}
            className="rounded-sm border-2 border-redpen px-4 py-2 font-semibold text-redpen hover:bg-redpen hover:text-paper"
          >
            Back to my text
          </button>
        </section>
      )}
    </main>
  );
}
