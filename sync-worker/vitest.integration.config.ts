import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./sync-worker/wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["sync-worker/src/**/*.integration.test.ts"],
    testTimeout: 30_000,
  },
});
