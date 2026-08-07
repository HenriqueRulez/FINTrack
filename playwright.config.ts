import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Carrega .env.local (E2E_EMAIL/E2E_PASSPHRASE + chaves do Supabase) na mesma
// ordem que o Next — o Playwright não lê .env.local sozinho.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
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
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Local: reutiliza um dev server já a correr (evita arrancar um segundo e
    // colidir na porta 3000). CI: NUNCA reutiliza — arranca um server fresco por
    // run e o Playwright mata-o no fim, garantindo ambiente limpo e determinístico
    // (sem estado partilhado entre runs, sem processos órfãos).
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
