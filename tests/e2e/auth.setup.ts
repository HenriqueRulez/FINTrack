import { test as setup, expect } from "@playwright/test";
import { captureTestUserCookies, SHARED_AUTH_FILE } from "../support/auth-session";

// Autentica um utilizador de teste dedicado SEM passar pela UI de login e grava o
// storageState partilhado. A lógica de login/captura de cookies vive em
// tests/support/auth-session.ts (fonte única de verdade, reutilizada pelos specs
// de logout que precisam de sessão isolada). Ver esse ficheiro para o porquê do
// @supabase/ssr em vez do formulário /passphrase.
setup("autenticar utilizador de teste", async ({ context, page }) => {
  const cookies = await captureTestUserCookies();

  await context.addCookies(
    cookies.map(({ name, value }) => ({
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

  await context.storageState({ path: SHARED_AUTH_FILE });
});
