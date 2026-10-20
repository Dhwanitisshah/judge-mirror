// Score consistency experiment (spec.md > Prompting and Scoring Consistency).
//
//   npx tsx scripts/consistency.ts --model gemini-3.6-flash [--runs 3] [--temperature 0.2] [--fixtures sample,weak]
//
// Runs each fixture submission several times against ONE pinned model and prints, per criterion, the scores, the
// spread (max - min) and how many quotes verification dropped. The model is pinned with NO fallback on purpose:
// with a fallback chain we would be measuring the model mix, not the consistency of a model.
//
// Spend rules: at least 6 seconds between calls, no retries, and it stops at the first 429.
// It reads GEMINI_API_KEY from .env.local and never prints it. LLM_MOCK is ignored (forced off for this script).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LlmError, reviewWithModel } from "../src/lib/llm";
import { BUILD_WITH_AI_BASICS } from "../src/lib/presets";
import { buildReviewResponse } from "../src/lib/review";

const args = process.argv.slice(2);
const arg = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const model: string = arg("model") ?? "";
if (!model) throw new Error("Pass --model <id>, for example --model gemini-3.6-flash");
const runs = Number(arg("runs", "3"));
const temperature = arg("temperature") !== undefined ? Number(arg("temperature")) : undefined;
const wanted = (arg("fixtures", "sample,weak") as string).split(",");
const GAP_MS = 6500;

// ---- environment: key from .env.local, mock forced off
const root = process.cwd();
const envFile = join(root, ".env.local");
if (!process.env.GEMINI_API_KEY && existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^GEMINI_API_KEY=(.*)$/.exec(line.trim());
    if (m) process.env.GEMINI_API_KEY = m[1];
  }
}
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not found in the environment or .env.local");
process.env.LLM_MOCK = "";

// ---- fixtures
const read = (name: string) => readFileSync(join(root, "fixtures", name), "utf8");
const FIXTURES: Record<string, { description: string; transcript?: string; label: string }> = {
  sample: { description: read("sample-submission.txt"), transcript: read("sample-transcript.txt"), label: "sample (PantryPal, with transcript)" },
  weak: { description: read("weak-submission.txt"), label: "weak (NoteNest)" },
  injection: { description: read("injection-submission.txt"), label: "injection (TaskTamer)" },
};

type RunResult = {
  ok: boolean;
  error?: string;
  ms: number;
  answeredBy?: string;
  scores?: (number | null)[];
  states?: string[];
  dropped?: number[];
  attempts?: string;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const results: Record<string, RunResult[]> = {};
let stopped = false;

async function main() {
  console.log(`model=${model} (no fallback) runs=${runs} temperature=${temperature ?? "default"} gap=${GAP_MS}ms`);

  outer: for (const name of wanted) {
    const fx = FIXTURES[name];
    if (!fx) throw new Error(`Unknown fixture "${name}"`);
    results[name] = [];
    for (let i = 1; i <= runs; i++) {
      const t0 = Date.now();
      let r: RunResult;
      try {
        const input = { criteria: BUILD_WITH_AI_BASICS, description: fx.description, transcript: fx.transcript };
        const out = await reviewWithModel(input, undefined, [model], { temperature });
        const response = buildReviewResponse(out.output, input, { model: out.model, mock: false });
        r = {
          ok: true,
          ms: Date.now() - t0,
          answeredBy: out.model,
          scores: response.criteria.map((c) => c.score),
          states: response.criteria.map((c) => c.state),
          dropped: response.criteria.map((c) => c.droppedCount),
          attempts: out.attempts.map((a) => `${a.model}:${a.status}:${a.ms}ms`).join(" > "),
        };
      } catch (e) {
        const code = e instanceof LlmError ? e.code : "unexpected";
        r = { ok: false, error: code, ms: Date.now() - t0 };
        if (code === "rate_limited") stopped = true;
      }
      results[name].push(r);
      console.log(`${name} run ${i}/${runs}: ${r.ok ? `scores ${r.scores!.join(",")} states ${r.states!.join(",")} dropped ${r.dropped!.join(",")}` : `FAILED (${r.error})`} in ${(r.ms / 1000).toFixed(1)}s`);
      if (stopped) {
        console.log("Stopping at the first 429, as agreed. Not retrying.");
        break outer;
      }
      if (!(name === wanted[wanted.length - 1] && i === runs)) await sleep(GAP_MS);
    }
  }

  // ---- report
  const spreadOf = (xs: (number | null)[]) => {
    const n = xs.filter((x): x is number => x !== null);
    return n.length < 2 ? null : Math.max(...n) - Math.min(...n);
  };
  console.log("\n==== Spread per criterion (max - min over the runs that scored; target: at most 1) ====");
  const summary: Record<string, unknown> = {};
  for (const name of Object.keys(results)) {
    const good = results[name].filter((r) => r.ok);
    console.log(`\n${FIXTURES[name].label}: ${good.length} of ${results[name].length} runs answered`);
    const rows = BUILD_WITH_AI_BASICS.map((c, i) => {
      const scores = good.map((r) => r.scores![i]);
      const dropped = good.reduce((n, r) => n + r.dropped![i], 0);
      const spread = spreadOf(scores);
      const states = good.map((r) => r.states![i]);
      console.log(`  ${c.name.padEnd(17)} scores [${scores.map((s) => s ?? "n/a").join(", ")}]  spread ${spread ?? "n/a"}  dropped quotes ${dropped}  states [${[...new Set(states)].join("/")}]`);
      return { criterion: c.name, scores, spread, dropped, states };
    });
    const worst = Math.max(0, ...rows.map((r) => r.spread ?? 0));
    console.log(`  worst spread: ${worst} ${worst <= 1 ? "(within target)" : "(ABOVE target)"}`);
    summary[name] = { rows, worst, runs: results[name] };
  }

  const mean = (xs: (number | null)[]) => {
    const n = xs.filter((x): x is number => x !== null);
    return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
  };
  if (results.sample && results.weak) {
    console.log("\n==== Strong vs weak: mean score per criterion ====");
    BUILD_WITH_AI_BASICS.forEach((c, i) => {
      const s = mean(results.sample.filter((r) => r.ok).map((r) => r.scores![i]));
      const w = mean(results.weak.filter((r) => r.ok).map((r) => r.scores![i]));
      console.log(`  ${c.name.padEnd(17)} sample ${s?.toFixed(1) ?? "n/a"}   weak ${w?.toFixed(1) ?? "n/a"}`);
    });
  }

  const all = Object.values(results).flat();
  const latencies = all.filter((r) => r.ok).map((r) => r.ms / 1000);
  console.log(`\nCalls: ${all.length}, answered ${all.filter((r) => r.ok).length}, failed ${all.filter((r) => !r.ok).map((r) => r.error).join(",") || "none"}`);
  if (latencies.length) console.log(`Latency (s): min ${Math.min(...latencies).toFixed(1)}, max ${Math.max(...latencies).toFixed(1)}, mean ${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)}`);

  if (latencies.length === 0) {
    console.log("\nNo run answered, so nothing was saved.");
    return;
  }
  const outDir = join(root, "docs", "experiments");
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `consistency-${model}${temperature !== undefined ? `-t${temperature}` : ""}-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(file, JSON.stringify({ model, temperature: temperature ?? "default", runs, at: new Date().toISOString(), summary }, null, 2));
  console.log(`\nSaved ${file.replace(root, ".")}`);
}

main().catch((e) => {
  console.error("consistency.ts failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
