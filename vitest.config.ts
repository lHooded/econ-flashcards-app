import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["sync-worker/**/*.integration.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    restoreMocks: true,
    testTimeout: 15_000,
  },
});
