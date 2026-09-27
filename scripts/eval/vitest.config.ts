import { defineConfig } from "vitest/config";

// The price benchmark only: live calls, real money, never part of `npm test`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { environment: "node", include: ["scripts/eval/**/*.bench.ts"], testTimeout: 60 * 60 * 1000 },
});
