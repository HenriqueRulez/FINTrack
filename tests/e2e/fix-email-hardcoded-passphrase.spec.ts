import { test, expect } from "@playwright/test";

// BUG-1 / FIN-8 — email owner@fintrack.local deixou de estar hardcoded num
// Client Component. O login passou a correr via POST /api/auth/login
// (server-side); o cliente (passphrase/page.tsx) só envia a passphrase.
//
// CA1 (login válido) e CA3 (protecção de rotas sem sessão) já têm cobertura
// equivalente noutros specs (auth.setup.ts autentica com sucesso e persiste
// sessão; smoke.spec.ts cobre o redirect sem sessão) — não duplicados aqui.

test.describe("BUG-1 — email não hardcoded no login", () => {
  test("passphrase incorrecta mantém em /passphrase e mostra erro", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto("/passphrase");

    await page.locator('input[type="password"]').fill("passphrase-definitivamente-errada");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page.getByText("Palavra-passe incorrecta.")).toBeVisible();
    await expect(page).toHaveURL(/passphrase/);

    await ctx.close();
  });

  test("resposta de /api/auth/login nunca inclui o email do dono", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { passphrase: "qualquer-coisa-invalida" },
    });
    const body = await res.text();
    expect(body).not.toContain("fintrack.local");
    expect(body).not.toContain("@");
  });

  test("HTML servido em /passphrase não contém o email do dono", async ({ request }) => {
    const res = await request.get("/passphrase");
    const html = await res.text();
    expect(html).not.toContain("fintrack.local");
  });
});
