import { test, expect } from "@playwright/test";

test("CA1: botão Terminar sessão visível na página de Configurações", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Terminar sessão" })).toBeVisible();
});

test("CA3: botão de logout está num card separado das informações de perfil", async ({ page }) => {
  await page.goto("/settings");
  const cardContainsEmail = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Terminar sessão")
    );
    if (!btn) return null;
    const card = btn.closest(".rounded-xl");
    return card ? card.textContent?.includes("E-mail") : null;
  });
  expect(cardContainsEmail).toBe(false);
});

// CA2 + CA4 combinados numa única acção real de logout: supabase.auth.signOut()
// usa scope=global e revoga a sessão no servidor, o que invalidaria o
// storageState partilhado para qualquer teste subsequente que dependa da mesma
// sessão. Por isso o logout real só acontece UMA vez, aqui, cobrindo os dois CAs.
test("CA2 + CA4: logout mostra estado pending, termina sessão e bloqueia rotas protegidas", async ({
  page,
}) => {
  // Atrasa a chamada real ao Supabase Auth para tornar o estado pending
  // observável de forma determinística.
  await page.route("**/auth/v1/logout**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });

  await page.goto("/settings");
  const button = page.getByRole("button", { name: "Terminar sessão" });
  await button.click();

  // O botão tem aria-label estático ("Terminar sessão"), por isso o texto
  // visível pending não é pesquisável por accessible name — usa-se o texto
  // do DOM directamente.
  const pendingButton = page.locator("button", { hasText: "A terminar sessão" });
  await expect(pendingButton).toBeVisible();
  await expect(pendingButton).toBeDisabled();

  await expect(page).toHaveURL(/passphrase/, { timeout: 10_000 });

  // Sessão terminada: voltar a uma rota protegida deve redireccionar de novo.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/passphrase/, { timeout: 10_000 });
});
