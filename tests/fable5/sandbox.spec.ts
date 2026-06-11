// E2E do sandbox /projeto-fable-5 (Fase 2) — sem auth (path público).
// Os testes criam transacções de um ticker dedicado (MSFT) e limpam tudo no
// fim via API, deixando o ledger do utilizador intacto.
// Correr com: npx playwright test -c playwright.fable5.config.ts sandbox

import { expect, test } from "@playwright/test";

const TICKER = "MSFT"; // ticker de teste — nunca usado nos dados reais

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ request }) => {
  // Limpeza: remover transacções do ticker de teste + asset órfão
  const list = await (await request.get("/api/fable5/transactions")).json();
  const ids = (list.data ?? [])
    .filter((t: { ticker: string }) => t.ticker === TICKER)
    .map((t: { id: string }) => t.id);
  if (ids.length > 0) {
    await request.delete("/api/fable5/transactions", { data: { ids } });
  }
  await request.delete(`/api/fable5/assets/${TICKER}`);
});

test("dashboard renderiza hero, sidebar e chart sem login", async ({ page }) => {
  await page.goto("/projeto-fable-5");
  await expect(page.locator("aside a")).toHaveCount(5);
  await expect(page.locator(".neon-primary-text").first()).toBeVisible();
  await expect(page.getByText("over time")).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: "ALL", exact: true })
  ).toBeVisible();
});

test("criar BUY e SELL no dialog; oversell é rejeitado com mensagem", async ({
  page,
}) => {
  await page.goto("/projeto-fable-5/transactions");

  // BUY (ticker novo → select de classe visível)
  await page.getByRole("button", { name: "Add transaction" }).click();
  await page.locator("#f5-tx-date").fill("2026-05-01");
  await page.locator("#f5-tx-ticker").fill(TICKER);
  await expect(page.locator("#f5-tx-asset-type")).toBeVisible();
  await page.locator("#f5-tx-qty").fill("3");
  await page.locator("#f5-tx-price").fill("400");
  await page.getByRole("button", { name: "Adicionar transacção" }).click();
  await expect(page.locator(`td:has-text("${TICKER}")`).first()).toBeVisible({
    timeout: 30_000,
  });

  // SELL parcial
  await page.getByRole("button", { name: "Add transaction" }).click();
  await page.locator("#f5-tx-date").fill("2026-06-01");
  await page.locator("#f5-tx-type").click();
  await page.getByRole("option", { name: "Sell" }).click();
  await page.locator("#f5-tx-ticker").fill(TICKER);
  await page.locator("#f5-tx-qty").fill("1");
  await page.locator("#f5-tx-price").fill("450");
  await page.getByRole("button", { name: "Adicionar transacção" }).click();
  await expect(page.locator("span:has-text('SELL')").first()).toBeVisible({
    timeout: 30_000,
  });

  // Oversell — o ledger rejeita e o dialog mostra a mensagem
  await page.getByRole("button", { name: "Add transaction" }).click();
  await page.locator("#f5-tx-date").fill("2026-06-05");
  await page.locator("#f5-tx-type").click();
  await page.getByRole("option", { name: "Sell" }).click();
  await page.locator("#f5-tx-ticker").fill(TICKER);
  await page.locator("#f5-tx-qty").fill("99");
  await page.locator("#f5-tx-price").fill("450");
  await page.getByRole("button", { name: "Adicionar transacção" }).click();
  await expect(page.getByText("excede a quantidade detida")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Cancelar" }).click();

  // Tab Sell mostra só sells
  await page.getByRole("tab", { name: /^Sell/ }).click();
  await expect(page.locator("#f5-tx-table span:has-text('BUY')")).toHaveCount(0);
});

test("holdings e performance derivam do ledger", async ({ page }) => {
  await page.goto("/projeto-fable-5/holdings");
  await expect(page.getByText("Total Value")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("row", { name: new RegExp(TICKER) })).toBeVisible();

  await page.goto("/projeto-fable-5/performance");
  for (const kpi of [
    "Win Rate",
    "Profit Split",
    "Overall Avg Hold",
    "Avg Winner Hold",
    "Avg Loser Hold",
  ]) {
    await expect(page.getByText(kpi, { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  }
  // agregação: 1 linha por ticker, independentemente do nº de transacções
  await expect(page.locator("tbody tr", { hasText: TICKER })).toHaveCount(1);
});

test("settings mostra gestão de assets; app raiz continua protegido", async ({
  page,
}) => {
  await page.goto("/projeto-fable-5/settings");
  await expect(page.getByText("Assets", { exact: true })).toBeVisible();
  // o ticker partilha o <p> com o contador "N tx" — match não-exacto
  await expect(page.getByText(TICKER).first()).toBeVisible();

  // regressão: o app raiz mantém a passphrase
  await page.goto("/dashboard");
  await page.waitForURL("**/passphrase");
});
