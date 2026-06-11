import { defineConfig, devices } from "@playwright/test";

// Config dedicada do sandbox Fable 5 (tests/fable5) — separada da suite raiz
// (tests/e2e) de propósito: o sandbox não tem auth, logo dispensa o projecto
// "setup" de passphrase/storageState da config principal.
// Correr com: npx playwright test -c playwright.fable5.config.ts

export default defineConfig({
  testDir: "./tests/fable5",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
