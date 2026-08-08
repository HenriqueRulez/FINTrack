import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import fs from "fs";
import path from "path";

// Carrega .env.local (chaves públicas do Supabase que o auth.setup usa) na
// mesma ordem que o Next — o Playwright não lê .env.local sozinho.
loadEnvConfig(process.cwd());

// Overlay determinístico das credenciais de teste E2E (fonte única de verdade):
//   - .env.test        → VERSIONADO, não-secreto: E2E_EMAIL + defaults
//   - .env.test.local  → gitignored: E2E_PASSPHRASE real (local)
// O CI injeta E2E_PASSPHRASE como secret via process.env; por isso NUNCA
// sobrepomos uma variável já definida no ambiente — shell/CI ganha sempre.
// Parser mínimo (KEY=VALUE, aspas exteriores opcionais) para não depender do
// `dotenv`, que é só transitivo (não está em package.json).
function overlayEnvFile(file: string): void {
  let contents: string;
  try {
    contents = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  } catch {
    return; // ausente (ex.: CI sem .env.test.local) — passphrase vem do secret
  }
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).replace(/^export\s+/, "").trim();
    if (!key || process.env[key] !== undefined) continue; // ambiente ganha
    let value = line.slice(eq + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value[value.length - 1] === quote) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// .env.test.local primeiro: o secret local tem precedência sobre os defaults.
overlayEnvFile(".env.test.local");
overlayEnvFile(".env.test");

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
