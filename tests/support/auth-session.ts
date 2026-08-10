import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Browser, BrowserContext } from "@playwright/test";

// Fonte única de verdade para autenticar o utilizador de teste E2E sem passar
// pela UI (a /passphrase tem email fixo `owner@fintrack.local`, por isso o login
// por formulário só serve a conta real). Partilhado entre auth.setup.ts (gera o
// storageState partilhado) e os specs que precisam de uma sessão ISOLADA — ex.:
// os testes de logout, cujo signOut() de produção usa scope=global e revoga
// sessões no servidor. Ao correr o logout num contexto próprio, e ao RE-SEMEAR o
// storageState partilhado depois (refreshSharedAuthState), a suite fica imune à
// invalidação de sessão independentemente da ordem dos specs.

export const SHARED_AUTH_FILE = "tests/e2e/.auth/user.json";

interface SessionCookie {
  name: string;
  value: string;
}

// Faz signInWithPassword contra o Supabase real e captura os cookies de sessão
// no mesmo encoding que a app usa (@supabase/ssr) — à prova de versão. Lança erro
// explícito se as credenciais (E2E_EMAIL/E2E_PASSPHRASE) estiverem em falta ou
// inválidas, para o teste falhar alto em vez de fingir um verde.
export async function captureTestUserCookies(): Promise<SessionCookie[]> {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSPHRASE;
  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL e/ou E2E_PASSPHRASE não definidas. E2E_EMAIL vem de .env.test " +
        "(versionado); E2E_PASSPHRASE de .env.test.local (gitignored) — crie-o a " +
        "partir de .env.example. No CI, E2E_PASSPHRASE vem de um secret."
    );
  }

  const captured: SessionCookie[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => captured.map(({ name, value }) => ({ name, value })),
        setAll: (
          cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>
        ) => {
          for (const { name, value } of cookiesToSet) captured.push({ name, value });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Login do utilizador de teste falhou: ${error.message}`);
  }
  if (captured.length === 0) {
    throw new Error(
      "Login sem cookies de sessão — verifique as credenciais de teste em .env.test/.env.test.local."
    );
  }
  return captured;
}

function toPlaywrightCookies(cookies: SessionCookie[]) {
  return cookies.map(({ name, value }) => ({
    name,
    value,
    url: "http://localhost:3000",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));
}

// Cria um BrowserContext com uma sessão de teste ISOLADA (refresh token próprio,
// obtido num login novo). Usado pelos testes de logout: o signOut() de produção
// (scope global) corre neste contexto, não no `page` do storageState partilhado.
export async function createIsolatedAuthedContext(
  browser: Browser
): Promise<BrowserContext> {
  const cookies = await captureTestUserCookies();
  const context = await browser.newContext();
  await context.addCookies(toPlaywrightCookies(cookies));
  return context;
}

// Re-gera o storageState partilhado (tests/e2e/.auth/user.json) com uma sessão
// fresca. Chamado no afterAll dos specs de logout: como o signOut() global revoga
// sessões no servidor por user_id, esta cura garante que qualquer spec que corra
// A SEGUIR encontra um storageState válido — tornando a ordem irrelevante.
export async function refreshSharedAuthState(browser: Browser): Promise<void> {
  const cookies = await captureTestUserCookies();
  const context = await browser.newContext();
  await context.addCookies(toPlaywrightCookies(cookies));
  await context.storageState({ path: SHARED_AUTH_FILE });
  await context.close();
}
