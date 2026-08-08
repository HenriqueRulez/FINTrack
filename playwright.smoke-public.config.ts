import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv } from "./tests/support/test-env";

// Config E2E PÚBLICA — corre APENAS os smoke que não precisam de login nem de
// base de dados: redirect para /passphrase sem sessão + render da página de
// passphrase. É o que o CI corre (C4, escopo A): o projeto é Cloud-only e não há
// banco de teste, então a app arranca com env Supabase DUMMY e o middleware, ao
// falhar `getUser`, redireciona — exactamente o comportamento sob teste.
//
// O teste `@authed` (dashboard após login) exige base real e fica FORA daqui
// (grepInvert). Localmente corre pela playwright.smoke.config.ts (com auth.setup).
// Mesma fonte de env que as outras configs (tests/support/test-env.ts).
loadTestEnv();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  // Exclui os testes que exigem login/base real — sem projeto `setup`, sem
  // storageState: este smoke é 100% não-autenticado.
  grepInvert: /@authed/,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "smoke-public",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
