// Hand-written JSON schemas sent to Gemini (spec.md > Schema: "two schemas, one contract").
// Only the parts Google documents as supported: type, properties, required, enum, items, minItems/maxItems,
// minimum/maximum on integers. No anyOf, $ref, default, const, minLength or pattern.
// Zod (schema.ts) stays the source of truth and re-checks everything, including what this can't say.
// Property order matters: evidence comes before verdict, score and fix, so the score follows the evidence.

import { MAX_CRITERIA, MIN_CRITERIA } from "./limits";

export const REVIEW_JSON_SCHEMA = {
  type: "object",
  properties: {
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          evidence: {
            type: "array",
            maxItems: 2,
            items: {
              type: "object",
              properties: {
                quote: { type: "string" },
                source: { type: "string", enum: ["description", "transcript"] },
              },
              required: ["quote", "source"],
            },
          },
          verdict: { type: "string" },
          score: { type: "integer", minimum: 1, maximum: 5 },
          fix: { type: "string" },
        },
        required: ["name", "evidence", "verdict", "score", "fix"],
      },
    },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["injection"] },
          quote: { type: "string" },
        },
        required: ["type", "quote"],
      },
    },
  },
  required: ["criteria", "flags"],
} as const;

export const PARSE_CRITERIA_JSON_SCHEMA = {
  type: "object",
  properties: {
    criteria: {
      type: "array",
      minItems: MIN_CRITERIA,
      maxItems: MAX_CRITERIA,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["name", "description"],
      },
    },
  },
  required: ["criteria"],
} as const;
