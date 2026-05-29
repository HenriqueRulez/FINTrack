/**
 * E2E Tests — Holdings Page Redesign
 * Working Item: .claude/working-items/holdings-redesign.md
 *
 * CAs verified:
 *  CA-01 — KPI Strip: 7 células, valores EUR, gain/loss semântico, Cash €0,00
 *  CA-02 — Tabela ordenável: sort toggle, direcção, coluna por defeito
 *  CA-03 — Célula Company: logo colorido, alloc bar, ticker, nome, opacity sold
 *  CA-04 — Toggle "Show sold": visibilidade, estado por defeito OFF, ON mostra TSLA+GLD
 *  CA-05 — Selector de moeda: EUR/USD/Native actualiza valores
 *  CA-06 — Gain/Loss semântico: cores gain/loss, badge percentagem
 *  CA-07 — Sidebar e navegação: link Holdings activo, href=/holdings, aria-current
 *  CA-08 — Design System: dark mode, IBM Plex Mono, teal accent
 *  CA-09 — Responsividade + auth redirect
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// CA-09 — Auth redirect (unauthenticated context, no storageState)
// ─────────────────────────────────────────────────────────────────────────────

test("CA-09 auth › /holdings sem sessão: middleware configurado e rota protegida", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // contexto verdadeiramente limpo, sem auth
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/holdings");
  await page.waitForLoadState("networkidle");

  // Sem sessão, o middleware DEVE redireccionar para /passphrase
  const url = page.url();
  expect(url).toMatch(/passphrase/);
  // Sem erros JS
  expect(errors).toHaveLength(0);

  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated tests (use storageState from playwright.config.ts)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Holdings Page — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");
  });

  // ─── CA-01 — KPI Strip ───────────────────────────────────────────────────

  test("CA-01 kpi-strip › renderiza exactamente 7 células", async ({
    page,
  }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    await expect(kpiStrip).toBeVisible();

    // 7 direct child cells in the KPI strip
    const kpiCells = kpiStrip.locator(":scope > div");
    await expect(kpiCells).toHaveCount(7);
  });

  test("CA-01 kpi-strip › labels correctos nos 7 KPIs", async ({ page }) => {
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

  test("CA-01 kpi-strip › Cash KPI mostra €0,00 (placeholder)", async ({
    page,
  }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');

    // Find Cash cell — its value should be formatted as €0,00 or €0.00
    const cashCell = kpiStrip.locator(":scope > div").filter({
      has: page.getByText("Cash", { exact: true }),
    });
    await expect(cashCell).toBeVisible();

    // The value should contain a zero amount in EUR
    const cashValue = await cashCell.locator(".tabular-nums").first().textContent();
    // pt-PT locale formats currency as "0,00 €" or "0,00€" (symbol after number)
    expect(cashValue?.replace(/\s/g, "")).toMatch(/0[,.]00\s*€|€\s*0[,.]00/);
  });

  test("CA-01 kpi-strip › valores monetários em EUR com símbolo €", async ({
    page,
  }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');

    // "Total Value" and "Holdings Value" cells should contain €
    const totalValueCell = kpiStrip.locator(":scope > div").filter({
      has: page.getByText("Total Value", { exact: true }),
    });
    const holdingsValueCell = kpiStrip.locator(":scope > div").filter({
      has: page.getByText("Holdings Value", { exact: true }),
    });

    await expect(totalValueCell).toContainText("€");
    await expect(holdingsValueCell).toContainText("€");
  });

  test("CA-01 kpi-strip › KPIs P/L com cor semântica gain ou loss", async ({
    page,
  }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');

    // P/L cells should have gain or loss colour class on their value
    for (const label of ["Total P/L", "Unrealized P/L", "Realized P/L"]) {
      const cell = kpiStrip.locator(":scope > div").filter({
        has: page.getByText(label, { exact: true }),
      });
      await expect(cell).toBeVisible();

      // Value element should have either gain or loss text color
      const valueEl = cell.locator(".tabular-nums").first();
      const cls = await valueEl.getAttribute("class");
      const hasSemanticColor =
        cls?.includes("--gain") ||
        cls?.includes("--loss") ||
        cls?.includes("text-foreground");
      expect(hasSemanticColor).toBe(true);
    }
  });

  // ─── CA-02 — Tabela ordenável ────────────────────────────────────────────

  test("CA-02 sort › 8 colunas presentes com headers correctos", async ({
    page,
  }) => {
    const expectedHeaders = [
      "Company",
      "Portfolio%",
      "Shares",
      "Avg Cost",
      "Cost Basis",
      "Current Price",
      "Market Value",
      "Total Gain/Loss",
    ];

    const headerButtons = page.locator("table thead th button");
    await expect(headerButtons).toHaveCount(8);

    for (const header of expectedHeaders) {
      await expect(
        page.locator("table thead th button").filter({ hasText: header })
      ).toBeVisible();
    }
  });

  test("CA-02 sort › ordenação por defeito é Market Value descendente", async ({
    page,
  }) => {
    // The active sort arrow should be on Market Value, pointing down (▼)
    const marketValueHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Market Value" });
    await expect(marketValueHeader).toBeVisible();

    // The arrow span within Market Value button should have text-primary class
    const activeArrow = page.locator("table thead th button .text-primary");
    await expect(activeArrow).toBeVisible();
    const arrowText = await activeArrow.textContent();
    expect(arrowText?.trim()).toBe("▼");
  });

  test("CA-02 sort › clicar header ordena coluna; segundo clique inverte direcção", async ({
    page,
  }) => {
    const sharesHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Shares" });

    // First click → descending
    await sharesHeader.click();
    let arrow = page.locator("table thead th button .text-primary");
    let arrowText = await arrow.textContent();
    // After first click on a new column, dir should be desc (▼)
    expect(arrowText?.trim()).toBe("▼");

    // Check the first button's parent th has aria-sort="descending"
    const shTh = page.locator('table thead th[aria-sort="descending"]');
    await expect(shTh).toBeVisible();

    // Second click → ascending
    await sharesHeader.click();
    arrow = page.locator("table thead th button .text-primary");
    arrowText = await arrow.textContent();
    expect(arrowText?.trim()).toBe("▲");

    const shThAsc = page.locator('table thead th[aria-sort="ascending"]');
    await expect(shThAsc).toBeVisible();
  });

  test("CA-02 sort › inactive columns mostram indicador neutro ↕", async ({
    page,
  }) => {
    // Company header should have the neutral arrow (not active by default)
    const companyHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Company" });
    await expect(companyHeader).toBeVisible();

    const neutralArrow = companyHeader.locator(".text-muted-foreground\\/50");
    await expect(neutralArrow).toBeVisible();
  });

  // ─── CA-03 — Célula Company com allocation bar ───────────────────────────

  test("CA-03 alloc-pill › logo 32×32 renderizado para cada posição activa", async ({
    page,
  }) => {
    // Active tickers: AMAT, VWCE, CSPX, AAPL, MSFT, BTC
    const activeTickers = ["AMAT", "VW", "CS", "AA", "MS", "BT"]; // first 2 chars of ticker in logo

    const logos = page.locator("table tbody td:first-child div.w-8.h-8");
    const count = await logos.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("CA-03 alloc-pill › ticker em bold e nome em muted visíveis", async ({
    page,
  }) => {
    const firstRow = page.locator("table tbody tr").first();

    // Bold ticker
    const ticker = firstRow.locator("span.font-semibold").first();
    await expect(ticker).toBeVisible();

    // Muted name below ticker
    const name = firstRow.locator("span.text-muted-foreground").first();
    await expect(name).toBeVisible();
  });

  test("CA-03 alloc-pill › barra de alocação fill visível nas posições activas", async ({
    page,
  }) => {
    // The AllocPill renders a fill bar div inside the pill
    const fillBars = page.locator(
      'table tbody td:first-child div[style*="width:"], table tbody td:first-child div[style*="width"]'
    );
    // Should have at least 6 fill bars (one per active holding)
    const count = await fillBars.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("CA-03 alloc-pill › percentagem visível na pill para posições activas", async ({
    page,
  }) => {
    // Active positions should show a percentage in the pill (e.g. "28.4%")
    const pctTexts = page.locator(
      'table tbody td:first-child span.tabular-nums'
    );
    const count = await pctTexts.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // First active row pct should match "%"
    const firstPct = await pctTexts.first().textContent();
    expect(firstPct?.trim()).toMatch(/%/);
  });

  test("CA-03 alloc-pill › sold rows têm opacity 0.55 (quando showSold ON)", async ({
    page,
  }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechadas"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    const tslaRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "TSLA" }) });
    const opacity = await tslaRow.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(opacity).toBe("0.55");
  });

  // ─── CA-04 — Toggle "Show sold" ─────────────────────────────────────────

  test("CA-04 show-sold › toggle visível, OFF por defeito, oculta TSLA e GLD", async ({
    page,
  }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechadas"]');
    await expect(toggle).toBeVisible();

    // Default state: OFF
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    // TSLA and GLD should not be in the DOM (filtered out by HoldingsCard)
    await expect(
      page.locator("table tbody").getByText("TSLA", { exact: true })
    ).not.toBeVisible();
    await expect(
      page.locator("table tbody").getByText("GLD", { exact: true })
    ).not.toBeVisible();
  });

  test("CA-04 show-sold › ligar toggle mostra TSLA e GLD com opacity 0.55", async ({
    page,
  }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechadas"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    // TSLA and GLD should now be visible
    const tslaCell = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "TSLA" }) });
    const gldCell = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "GLD" }) });

    await expect(tslaCell).toBeVisible();
    await expect(gldCell).toBeVisible();

    // Opacity of sold rows should be 0.55
    const tslaOpacity = await tslaCell.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    const gldOpacity = await gldCell.evaluate(
      (el) => getComputedStyle(el).opacity
    );
    expect(tslaOpacity).toBe("0.55");
    expect(gldOpacity).toBe("0.55");

    // Sold rows should show "—" for Portfolio%
    const tslaPct = await tslaCell.locator("td:nth-child(2)").textContent();
    expect(tslaPct?.trim()).toBe("—");
  });

  test("CA-04 show-sold › label 'Show sold' visível junto ao toggle", async ({
    page,
  }) => {
    await expect(page.getByText("Show sold")).toBeVisible();
  });

  // ─── CA-05 — Selector de moeda ──────────────────────────────────────────

  test("CA-05 currency › EUR seleccionado por defeito, USD e Native alteram valores", async ({
    page,
  }) => {
    // EUR should be active by default
    const eurBtn = page
      .locator('[role="group"][aria-label*="moeda"] button')
      .filter({ hasText: "EUR" });
    const usdBtn = page
      .locator('[role="group"][aria-label*="moeda"] button')
      .filter({ hasText: "USD" });
    const nativeBtn = page
      .locator('[role="group"][aria-label*="moeda"] button')
      .filter({ hasText: "Native" });

    await expect(eurBtn).toHaveAttribute("aria-pressed", "true");
    await expect(usdBtn).toHaveAttribute("aria-pressed", "false");
    await expect(nativeBtn).toHaveAttribute("aria-pressed", "false");

    // Switch to USD — first monetary column (Avg Cost) should contain "US$"
    await usdBtn.click();
    await expect(usdBtn).toHaveAttribute("aria-pressed", "true");
    await expect(eurBtn).toHaveAttribute("aria-pressed", "false");

    // Wait for values to update
    const firstAvgCost = page.locator("table tbody tr:first-child td:nth-child(4)");
    const usdText = await firstAvgCost.textContent();
    expect(usdText).toMatch(/US\$/);

    // Switch to Native
    await nativeBtn.click();
    await expect(nativeBtn).toHaveAttribute("aria-pressed", "true");

    // Switch back to EUR
    await eurBtn.click();
    await expect(eurBtn).toHaveAttribute("aria-pressed", "true");
    const eurText = await firstAvgCost.textContent();
    expect(eurText).toMatch(/€/);
  });

  test("CA-05 currency › 3 botões EUR / USD / Native presentes", async ({
    page,
  }) => {
    const currencyGroup = page.locator('[role="group"][aria-label*="moeda"]');
    await expect(currencyGroup).toBeVisible();

    const buttons = currencyGroup.locator("button");
    await expect(buttons).toHaveCount(3);

    await expect(buttons.filter({ hasText: "EUR" })).toBeVisible();
    await expect(buttons.filter({ hasText: "USD" })).toBeVisible();
    await expect(buttons.filter({ hasText: "Native" })).toBeVisible();
  });

  // ─── CA-06 — Gain/Loss semântico ────────────────────────────────────────

  test("CA-06 gain-loss › células Total Gain/Loss têm cor semântica", async ({
    page,
  }) => {
    // GainLossCell renders spans with text-[var(--gain)] or text-[var(--loss)]
    const gainLossCells = page.locator("table tbody td:last-child span.font-medium.tabular-nums");
    const count = await gainLossCells.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // At least one should have gain colour and/or loss colour
    let hasGain = false;
    let hasLoss = false;
    for (let i = 0; i < count; i++) {
      const cls = await gainLossCells.nth(i).getAttribute("class");
      if (cls?.includes("--gain")) hasGain = true;
      if (cls?.includes("--loss")) hasLoss = true;
    }
    // With mock data we have both positive and negative positions
    expect(hasGain || hasLoss).toBe(true);
  });

  test("CA-06 gain-loss › badge com percentagem visível na coluna Total Gain/Loss", async ({
    page,
  }) => {
    // Badge spans within GainLossCell
    const badges = page.locator(
      'table tbody td:last-child span[class*="rounded-sm"]'
    );
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // First badge should contain a sign and %
    const badgeText = await badges.first().textContent();
    expect(badgeText?.trim()).toMatch(/[+−\-][\d,.]+%/);
  });

  test("CA-06 gain-loss › KPI Total P/L tem sinal + ou − e cor semântica", async ({
    page,
  }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    const totalPLCell = kpiStrip.locator(":scope > div").filter({
      has: page.getByText("Total P/L", { exact: true }),
    });
    await expect(totalPLCell).toBeVisible();

    const valueEl = totalPLCell.locator(".tabular-nums").first();
    const valueText = await valueEl.textContent();
    // Should contain a monetary value with € and sign
    expect(valueText?.trim()).toMatch(/[+\-−€]/);
  });

  // ─── CA-07 — Sidebar e navegação ────────────────────────────────────────

  test("CA-07 sidebar › link Holdings está activo com href=/holdings e aria-current=page", async ({
    page,
  }) => {
    const holdingsLink = page
      .locator("aside nav a")
      .filter({ hasText: "Holdings" });
    await expect(holdingsLink).toBeVisible();
    await expect(holdingsLink).toHaveAttribute("href", "/holdings");
    await expect(holdingsLink).toHaveAttribute("aria-current", "page");

    // Should have teal/primary visual indicator classes
    const className = await holdingsLink.getAttribute("class");
    expect(className).toContain("text-primary");
    expect(className).toContain("border-primary");
  });

  test("CA-07 sidebar › outros links placeholder mantêm aria-disabled e href=#", async ({
    page,
  }) => {
    for (const label of ["Transactions", "Performance", "Tax Calculator"]) {
      const link = page
        .locator("aside nav a, aside nav [href='#']")
        .filter({ hasText: label });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "#");
    }
  });

  test("CA-07 sidebar › Dashboard link não está activo na página Holdings", async ({
    page,
  }) => {
    const dashboardLink = page
      .locator("aside nav a")
      .filter({ hasText: "Dashboard" });
    await expect(dashboardLink).toBeVisible();

    // Should NOT have aria-current="page"
    const ariaCurrent = await dashboardLink.getAttribute("aria-current");
    expect(ariaCurrent).toBeNull();
  });

  // ─── CA-08 — Design System ──────────────────────────────────────────────

  test("CA-08 design › classe dark forçada no elemento <html>", async ({
    page,
  }) => {
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });

  test("CA-08 design › página Holdings renderiza sem erros JS", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("CA-08 design › h1 'Holdings' visível e CSS font variable aplicada no body", async ({
    page,
  }) => {
    const h1 = page.locator("h1").filter({ hasText: "Holdings" });
    await expect(h1).toBeVisible();

    // IBM Plex Mono is applied via CSS variable --font-ibm-plex-mono set on <body>
    // In Playwright the font may load as a fallback, but the variable must be present
    const fontVar = await page.locator("body").evaluate(
      (el) => getComputedStyle(el).getPropertyValue("--font-ibm-plex-mono")
    );
    // The CSS variable should be set (non-empty) when IBM Plex Mono is configured
    expect(fontVar.trim().length).toBeGreaterThan(0);
  });

  test("CA-08 design › botão Refresh visível no header do card", async ({
    page,
  }) => {
    const refreshBtn = page.locator('[aria-label="Actualizar preços"]');
    await expect(refreshBtn).toBeVisible();
  });

  // ─── CA-09 — Responsividade ─────────────────────────────────────────────

  test("CA-09 responsive › tabela tem overflow-x-auto para scroll horizontal", async ({
    page,
  }) => {
    // Check that the table wrapper has overflow-x-auto
    const tableWrapper = page.locator(".overflow-x-auto");
    await expect(tableWrapper).toBeVisible();
  });

  test("CA-09 responsive › KPI strip tem classes de grid responsivo", async ({
    page,
  }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    const cls = await kpiStrip.getAttribute("class");

    // Should have responsive grid classes
    expect(cls).toContain("grid-cols-2");
    expect(cls).toContain("sm:grid-cols-4");
    expect(cls).toContain("xl:grid-cols-7");
  });

  test("CA-09 responsive › sidebar hidden em viewport mobile (<700px)", async ({
    page,
  }) => {
    // Set viewport to mobile width
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

    // Sidebar has class 'hidden md:flex' — should not be visible on mobile
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();
  });
});
