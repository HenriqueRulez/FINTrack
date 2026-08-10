import { test, expect, type BrowserContext } from "@playwright/test";
import {
  createIsolatedAuthedContext,
  refreshSharedAuthState,
} from "../support/auth-session";

// CA1 e CA3 são leitura pura (não terminam sessão) — usam o storageState
// partilhado do projecto sem risco.
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

// CA2 + CA4: a acção real de logout. O signOut() de produção usa scope=global e
// revoga sessões no servidor por user_id — o que invalidaria o storageState
// PARTILHADO e partiria todos os specs @authed seguintes (BUG-4). Por isso o
// logout corre numa sessão ISOLADA (refresh token próprio) e o afterAll RE-SEMEIA
// o storageState partilhado com uma sessão fresca. Assim a ordem dos specs deixa
// de importar. O fix é no teste — o signOut() de produção fica intacto (global).
test.describe("CA2 + CA4 — logout real (sessão isolada)", () => {
  let isolated: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    isolated = await createIsolatedAuthedContext(browser);
  });

  test.afterAll(async ({ browser }) => {
    await isolated.close();
    await refreshSharedAuthState(browser);
  });

  test("logout mostra estado pending, termina sessão e bloqueia rotas protegidas", async () => {
    const page = await isolated.newPage();

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

    await page.close();
  });
});
