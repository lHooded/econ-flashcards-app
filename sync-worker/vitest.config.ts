import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["sync-worker/src/**/*.test.ts"],
    exclude: ["sync-worker/src/**/*.integration.test.ts"],
  },
});
