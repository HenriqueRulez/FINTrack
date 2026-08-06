import { test as setup, expect } from "@playwright/test";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

// Autentica um utilizador de teste dedicado (E2E_EMAIL/E2E_PASSPHRASE do
// .env.local) SEM passar pela UI de login: a página /passphrase tem o email
// fixo `owner@fintrack.local` (passphrase/page.tsx:21), por isso o login por
// formulário só serve a conta real. Aqui geramos a sessão com o próprio
// @supabase/ssr — o mesmo encoding de cookies que a app usa (à prova de versão)
// — e injetamos os cookies resultantes no contexto do browser.
setup("autenticar utilizador de teste", async ({ context, page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSPHRASE;
  if (!email || !password) {
    throw new Error(
      "E2E_EMAIL e/ou E2E_PASSPHRASE não definidas. Adicione ambas ao .env.local."
    );
  }

  // Captura os cookies de sessão que o @supabase/ssr quer persistir no login.
  const captured: Array<{ name: string; value: string }> = [];
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
      "Login sem cookies de sessão — verifique as credenciais de teste no .env.local."
    );
  }

  await context.addCookies(
    captured.map(({ name, value }) => ({
      name,
      value,
      url: "http://localhost:3000",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    }))
  );

  // Confirma que a sessão injetada é válida: o middleware deixa passar /dashboard
  // só com utilizador autenticado (senão redireciona para /passphrase).
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });

  await context.storageState({ path: authFile });
});
