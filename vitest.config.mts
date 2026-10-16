import { defineConfig } from "vitest/config";

// Unit tests cover the pure functions only (spec.md > What Was Simplified and Why).
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
