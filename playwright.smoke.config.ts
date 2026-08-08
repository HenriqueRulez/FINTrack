import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv } from "./tests/support/test-env";

// Config E2E MÍNIMA e ISOLADA — corre apenas `auth.setup.ts` + `smoke.spec.ts`.
// É o subconjunto que o C4 leva ao CI (banco efémero por run). Estes specs NÃO
// mutam o ledger: o smoke só verifica redirect sem sessão, a página de
// passphrase e o carregamento do /dashboard autenticado — logo é imune ao
// estado partilhado (dívida G-05) que afeta os specs que escrevem dados.
// Mesma fonte de env que playwright.config.ts (tests/support/test-env.ts).
loadTestEnv();

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
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
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
    // Igual à config principal: local reutiliza um server up; CI arranca fresco
    // por run e o Playwright mata-o no fim (ambiente determinístico, sem órfãos).
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
