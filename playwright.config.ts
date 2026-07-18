import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  reporter: "html",
  webServer: {
    command: "pnpm exec next dev --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    env: { ...process.env, GROQ_API_KEY: "", DEMO_FALLBACKS_ENABLED: "true", NEXT_PUBLIC_E2E_AUTH_BYPASS: "true" },
  },
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
