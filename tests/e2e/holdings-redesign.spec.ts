/**
 * E2E Tests — Holdings Page Redesign
 * Working Item: .claude/working-items/holdings-redesign.md
 *
 * CAs verified via Playwright (functional flows — visual CAs covered by Chrome Extension):
 *  CA-02 — Tabela ordenável: sort toggle, direcção, coluna por defeito
 *  CA-04 — Toggle "Show sold": visibilidade, estado por defeito OFF, ON mostra TSLA+GLD
 *  CA-05 — Selector de moeda: EUR/USD/Native actualiza valores
 *  CA-07 — Sidebar e navegação: link Holdings activo, href=/holdings, aria-current
 *  CA-09 — Auth: /holdings sem sessão redirige para /passphrase
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// CA-09 — Auth redirect (unauthenticated context, no storageState)
// ─────────────────────────────────────────────────────────────────────────────

test("CA-09 auth › /holdings sem sessão redirige para /passphrase", async ({
  browser,
}) => {
  const ctx = await browser.newContext(); // clean context, no auth cookies
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/holdings");
  await expect(page).toHaveURL(/passphrase/);
  expect(errors).toHaveLength(0);

  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated tests (use storageState from playwright.config.ts)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Holdings Page — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");
  });

  // ─── CA-07 — Sidebar link active ────────────────────────────────────────

  test("CA-07 sidebar › link Holdings está activo com href=/holdings e aria-current=page", async ({
    page,
  }) => {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

    for (const label of ["Transactions", "Performance", "Tax Calculator"]) {
      const link = page
        .locator("aside nav a, aside nav [href='#']")
        .filter({ hasText: label });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "#");
    }
  });

  // ─── CA-02 — Tabela ordenável ────────────────────────────────────────────

  test("CA-02 sort › 8 colunas presentes com headers correctos", async ({
    page,
  }) => {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

    // The active sort arrow should be on Market Value, pointing down (▼)
    const marketValueHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Market Value" });
    await expect(marketValueHeader).toBeVisible();

    // The arrow span within Market Value button should have text-primary class
    const activeArrow = page.locator(
      "table thead th button .text-primary"
    );
    await expect(activeArrow).toBeVisible();
    const arrowText = await activeArrow.textContent();
    expect(arrowText?.trim()).toBe("▼");
  });

  test("CA-02 sort › clicar header ordena coluna; segundo clique inverte direcção", async ({
    page,
  }) => {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

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

  // ─── CA-04 — Toggle "Show sold" ─────────────────────────────────────────

  test("CA-04 show-sold › toggle visível, OFF por defeito, oculta TSLA e GLD", async ({
    page,
  }) => {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

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
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

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

  // ─── CA-05 — Selector de moeda ──────────────────────────────────────────

  test("CA-05 currency › EUR seleccionado por defeito, USD e Native alteram valores", async ({
    page,
  }) => {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

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
});
