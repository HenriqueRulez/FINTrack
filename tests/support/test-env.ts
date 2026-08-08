import { loadEnvConfig } from "@next/env";
import fs from "fs";
import path from "path";

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

// Carrega a mesma fonte de env para qualquer config Playwright (E2E). Ordem:
//   1. .env.local (chaves públicas do Supabase que o auth.setup usa) via Next
//   2. .env.test.local (secret local) → .env.test (defaults versionados)
// O ambiente (shell/CI) tem sempre precedência sobre tudo isto.
export function loadTestEnv(): void {
  loadEnvConfig(process.cwd());
  overlayEnvFile(".env.test.local");
  overlayEnvFile(".env.test");
}
