import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: "automatic" },
  resolve: {
    alias: { "server-only": new URL("./tests/server-only.ts", import.meta.url).pathname },
  },
  test: {
    environment: "jsdom",
    include: ["tests/{unit,integration}/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
});
