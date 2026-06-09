/**
 * E2E Tests — Holdings Page Reformulacao (Fase 1 — visual/mock)
 * Working Item: .claude/working-items/reformular-pagina-holdings.md
 *
 * CAs verified:
 *  CA1  — Coluna Company: ícone 32x32 com inicial do ticker
 *  CA2  — Ticker | Exchange visível no formato correcto
 *  CA3  — Campo exchange no mock, nenhuma linha com exchange vazio/undefined
 *  CA4  — Coluna "Type" existe (derivada de assetClass)
 *  CA5  — Labels dos badges em inglês singular: Stock / ETF / Crypto / Other
 *  CA6  — Label "Total Invested" (não "Cost Basis")
 *  CA7  — Coluna "Market Value" presente (9ª coluna)
 *  CA8  — Colunas Portfolio%, Shares, Avg Cost, Current Price, Gain/Loss mantidas
 *  CA9  — Avg Cost é valor mock fixo (sem cálculo ponderado)
 *  CA10 — [REMOVIDO 2026-06-09] Botão "+ Add position" eliminado — Holdings é só
 *         visão geral; entrada/edição de dados passa a viver em Transactions.
 *         CA11–CA15 (modal Add position) ficam obsoletos pela mesma razão.
 *  CA16 — 7 KPIs do topo presentes
 *  CA17 — CurrencySelector presente e funcional (default = Native)
 *  CA18 — Labels de UI em inglês
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Holdings Reformulacao — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");
  });

  // ─── CA1 — Ícone 32×32 com inicial do ticker ────────────────────────────

  test("CA1 company-cell › ícone placeholder 32×32 presente para cada linha activa", async ({
    page,
  }) => {
    // CompanyCell renders: div.w-8.h-8 (32x32) as icon placeholder
    const icons = page.locator("table tbody td:first-child div.w-8.h-8");
    const count = await icons.count();
    // At least 6 active holdings (AMAT, VWCE, CSPX, AAPL, MSFT, BTC)
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("CA1 company-cell › ícone mostra a 1ª letra do ticker", async ({
    page,
  }) => {
    const firstRow = page.locator("table tbody tr").first();
    const icon = firstRow.locator("td:first-child div.w-8.h-8");
    await expect(icon).toBeVisible();

    // The icon should contain exactly 1 letter (first letter of ticker)
    const iconText = await icon.textContent();
    expect(iconText?.trim()).toHaveLength(1);
    expect(iconText?.trim()).toMatch(/[A-Z]/i);
  });

  test("CA1 company-cell › ícone tem classes bg-muted e border", async ({
    page,
  }) => {
    const firstRow = page.locator("table tbody tr").first();
    const icon = firstRow.locator("td:first-child div.w-8.h-8");
    const cls = await icon.getAttribute("class");
    expect(cls).toContain("bg-muted");
    expect(cls).toContain("border");
  });

  // ─── CA2 — Ticker | Exchange formato ────────────────────────────────────

  test("CA2 exchange › linha AAPL mostra 'AAPL' e '| NASDAQ' visíveis", async ({
    page,
  }) => {
    const aaplRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "AAPL" }) });
    await expect(aaplRow).toBeVisible();

    // The ticker span
    const tickerSpan = aaplRow.locator("span.font-semibold").first();
    await expect(tickerSpan).toContainText("AAPL");

    // The exchange span containing "| NASDAQ"
    const exchangeSpan = aaplRow.locator("span.text-muted-foreground\\/60");
    await expect(exchangeSpan).toBeVisible();
    const exchangeText = await exchangeSpan.textContent();
    expect(exchangeText).toContain("NASDAQ");
    expect(exchangeText).toContain("|");
  });

  test("CA2 exchange › linha VWCE mostra '| XETRA'", async ({ page }) => {
    const vwceRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "VWCE" }) });
    await expect(vwceRow).toBeVisible();

    const exchangeSpan = vwceRow.locator("span.text-muted-foreground\\/60");
    const exchangeText = await exchangeSpan.textContent();
    expect(exchangeText).toContain("XETRA");
  });

  // ─── CA3 — exchange no mock, nenhuma linha com undefined/vazio ───────────

  test("CA3 mock-exchange › nenhuma linha activa mostra exchange vazio ou 'undefined'", async ({
    page,
  }) => {
    const exchangeSpans = page.locator(
      "table tbody td:first-child span.text-muted-foreground\\/60"
    );
    const count = await exchangeSpans.count();
    expect(count).toBeGreaterThanOrEqual(6);

    for (let i = 0; i < count; i++) {
      const text = await exchangeSpans.nth(i).textContent();
      // Must not be empty, "undefined", "null", or only "|"
      expect(text?.trim()).not.toBe("|");
      expect(text?.trim()).not.toContain("undefined");
      expect(text?.trim()).not.toContain("null");
      // Should be "| SOMETHING" with a non-empty exchange value
      expect(text?.trim().replace("|", "").trim()).not.toBe("");
    }
  });

  // ─── CA4 — Coluna Type existe ────────────────────────────────────────────

  test("CA4 type-column › header 'Type' existe na tabela", async ({ page }) => {
    // Type column is not sortable, so it renders as <span> not <button>
    const typeHeader = page.locator("table thead th").filter({ hasText: "Type" });
    await expect(typeHeader).toBeVisible();
  });

  test("CA4 type-column › cada linha activa tem um badge de tipo visível", async ({
    page,
  }) => {
    // TypeBadge renders as <span> in the 2nd cell
    const typeCells = page.locator("table tbody td:nth-child(2)");
    const count = await typeCells.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // Each cell should have non-empty text
    for (let i = 0; i < count; i++) {
      const text = await typeCells.nth(i).textContent();
      expect(text?.trim()).not.toBe("");
    }
  });

  // ─── CA5 — Labels dos badges em inglês singular ──────────────────────────

  test("CA5 type-badge › badges mostram valores em inglês singular", async ({
    page,
  }) => {
    const validLabels = ["Stock", "ETF", "Crypto", "Other"];

    const typeCells = page.locator("table tbody td:nth-child(2)");
    const count = await typeCells.count();
    expect(count).toBeGreaterThanOrEqual(6);

    for (let i = 0; i < count; i++) {
      const text = await typeCells.nth(i).textContent();
      const trimmed = text?.trim() ?? "";
      expect(validLabels).toContain(trimmed);
    }
  });

  test("CA5 type-badge › mock tem Stock, ETF, e Crypto representados", async ({
    page,
  }) => {
    // With show sold OFF: AMAT(Stock), VWCE(ETF), CSPX(ETF), AAPL(Stock), MSFT(Stock), BTC(Crypto)
    const stockBadges = page
      .locator("table tbody td:nth-child(2) span")
      .filter({ hasText: "Stock" });
    const etfBadges = page
      .locator("table tbody td:nth-child(2) span")
      .filter({ hasText: "ETF" });
    const cryptoBadges = page
      .locator("table tbody td:nth-child(2) span")
      .filter({ hasText: "Crypto" });

    await expect(stockBadges.first()).toBeVisible();
    await expect(etfBadges.first()).toBeVisible();
    await expect(cryptoBadges.first()).toBeVisible();
  });

  // ─── CA6 — Label "Total Invested" (não "Cost Basis") ────────────────────

  test("CA6 total-invested › header 'Total Invested' existe (não 'Cost Basis')", async ({
    page,
  }) => {
    // "Total Invested" should be present
    const totalInvestedHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Total Invested" });
    await expect(totalInvestedHeader).toBeVisible();

    // "Cost Basis" should NOT be present anywhere in the table headers
    const allHeaderText = await page.locator("table thead").textContent();
    expect(allHeaderText).not.toContain("Cost Basis");
  });

  // ─── CA7 — Coluna "Market Value" presente (9ª coluna) ───────────────────

  test("CA7 market-value › header 'Market Value' existe", async ({ page }) => {
    const marketValueHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Market Value" });
    await expect(marketValueHeader).toBeVisible();
  });

  test("CA7 market-value › tabela tem 9 colunas", async ({ page }) => {
    const headers = page.locator("table thead th");
    await expect(headers).toHaveCount(9);
  });

  // ─── CA8 — Colunas obrigatórias mantidas ────────────────────────────────

  test("CA8 columns › Portfolio%, Shares, Avg Cost, Current Price, Total Gain/Loss presentes", async ({
    page,
  }) => {
    const requiredHeaders = [
      "Portfolio%",
      "Shares",
      "Avg Cost",
      "Current Price",
      "Total Gain/Loss",
    ];

    for (const header of requiredHeaders) {
      const th = page.locator("table thead th").filter({ hasText: header });
      await expect(th).toBeVisible();
    }
  });

  // ─── CA9 — Avg Cost é valor mock fixo ───────────────────────────────────

  test("CA9 avg-cost › coluna Avg Cost tem valor numérico (mock fixo, não calculado)", async ({
    page,
  }) => {
    const firstActiveRow = page.locator("table tbody tr").first();
    // Avg Cost is the 5th column (Company=1, Type=2, Portfolio%=3, Shares=4, Avg Cost=5)
    const avgCostCell = firstActiveRow.locator("td:nth-child(5)");
    const text = await avgCostCell.textContent();

    // Should contain a monetary value — not empty or "—"
    expect(text?.trim()).not.toBe("");
    expect(text?.trim()).not.toBe("—");
    // Should contain a currency symbol (€ or $) and digits
    expect(text).toMatch(/[€$\d]/);
  });

  test("CA9 avg-cost › AMAT avg cost é consistente entre recarregamentos (mock fixo)", async ({
    page,
  }) => {
    const amatRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "AMAT" }) });
    await expect(amatRow).toBeVisible();

    const avgCostCell = amatRow.locator("td:nth-child(5)");
    const text1 = await avgCostCell.textContent();

    // Reload and check same value
    await page.reload();
    await page.waitForLoadState("networkidle");

    const amatRow2 = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "AMAT" }) });
    const avgCostCell2 = amatRow2.locator("td:nth-child(5)");
    const text2 = await avgCostCell2.textContent();

    // Same value after reload — confirms it is a fixed mock value
    expect(text1?.trim()).toBe(text2?.trim());
  });

  // ─── CA10 — Botão "+ Add position" REMOVIDO ─────────────────────────────
  // Holdings passou a ser só visão geral; a entrada/edição de dados vive em
  // Transactions. O botão e o modal Add position foram eliminados (2026-06-09).
  // CA11–CA15 (que exercitavam o modal) ficaram obsoletos e foram removidos.

  test("CA10 no-add-button › botão '+ Add position' NÃO existe na página", async ({
    page,
  }) => {
    const addBtn = page.locator("button", { hasText: "Add position" });
    await expect(addBtn).toHaveCount(0);
  });

  test("CA10 no-add-button › nenhum modal/dialog presente na página de Holdings", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveCount(0);
  });

  // ─── CA16 — 7 KPIs do topo presentes ────────────────────────────────────

  test("CA16 kpis › 7 KPIs do topo mantêm-se intactos", async ({ page }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    await expect(kpiStrip).toBeVisible();

    const kpiCells = kpiStrip.locator(":scope > div");
    await expect(kpiCells).toHaveCount(7);
  });

  test("CA16 kpis › labels dos 7 KPIs correctos em inglês", async ({ page }) => {
    const expectedLabels = [
      "Total Value",
      "Holdings Value",
      "Cash",
      "Total P/L",
      "Unrealized P/L",
      "Realized P/L",
      "Holdings",
    ];

    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    for (const label of expectedLabels) {
      await expect(kpiStrip.getByText(label, { exact: true })).toBeVisible();
    }
  });

  // ─── CA17 — CurrencySelector presente e independente ────────────────────

  test("CA17 currency-selector › EUR/USD/Native buttons presentes e funcionais", async ({
    page,
  }) => {
    const currencyGroup = page.locator('[role="group"][aria-label*="moeda"]');
    await expect(currencyGroup).toBeVisible();

    const buttons = currencyGroup.locator("button");
    await expect(buttons).toHaveCount(3);
  });

  test("CA17 currency-selector › 'Native' seleccionado por defeito", async ({
    page,
  }) => {
    const nativeBtn = page
      .locator('[role="group"][aria-label*="moeda"] button')
      .filter({ hasText: "Native" });
    await expect(nativeBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("CA17 currency-selector › mudar para USD activa aria-pressed", async ({
    page,
  }) => {
    const usdBtn = page
      .locator('[role="group"][aria-label*="moeda"] button')
      .filter({ hasText: "USD" });
    await usdBtn.click();

    // USD should now be active
    await expect(usdBtn).toHaveAttribute("aria-pressed", "true");
  });

  // ─── CA18 — Labels em inglês ─────────────────────────────────────────────

  test("CA18 english-labels › headers das colunas da tabela estão em inglês", async ({
    page,
  }) => {
    const englishHeaders = [
      "Company",
      "Type",
      "Portfolio%",
      "Shares",
      "Avg Cost",
      "Total Invested",
      "Current Price",
      "Market Value",
      "Total Gain/Loss",
    ];

    for (const header of englishHeaders) {
      const th = page.locator("table thead th").filter({ hasText: header });
      await expect(th).toBeVisible();
    }
  });

  test("CA18 english-labels › caption da tabela é 'Holdings positions' (EN)", async ({
    page,
  }) => {
    const caption = page.locator("table caption");
    // Caption is sr-only but must exist in DOM
    const captionText = await caption.textContent();
    expect(captionText?.trim()).toBe("Holdings positions");
  });

  // ─── Ordem das colunas ───────────────────────────────────────────────────

  test("column-order › 9 colunas na ordem correcta: Company|Type|Portfolio%|Shares|Avg Cost|Total Invested|Current Price|Market Value|Total Gain/Loss", async ({
    page,
  }) => {
    const headers = page.locator("table thead th");
    await expect(headers).toHaveCount(9);

    const expectedOrder = [
      "Company",
      "Type",
      "Portfolio%",
      "Shares",
      "Avg Cost",
      "Total Invested",
      "Current Price",
      "Market Value",
      "Total Gain/Loss",
    ];

    for (let i = 0; i < expectedOrder.length; i++) {
      const th = headers.nth(i);
      const text = await th.textContent();
      expect(text?.trim().replace(/[▲▼↕]/g, "").trim()).toContain(
        expectedOrder[i]
      );
    }
  });

  // ─── Sem erros JS ────────────────────────────────────────────────────────

  test("no-js-errors › página /holdings carrega sem erros JS (esta feature)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

    // Filter out known pre-existing unrelated errors
    const featureErrors = errors.filter(
      (e) =>
        !e.includes("yahoo-finance") &&
        !e.includes("InvalidOptionsError") &&
        !e.includes("historical called with invalid options")
    );
    expect(featureErrors).toHaveLength(0);
  });
});
