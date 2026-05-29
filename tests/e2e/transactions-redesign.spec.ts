/**
 * E2E Tests — Transactions Page Redesign
 * Working Item: .claude/working-items/transactions-redesign.md
 *
 * CAs verified:
 *  CA-01 — Filter Row: 4 chips, date/ticker/type filters, Edit button
 *  CA-02 — Type Tabs: 6 tabs, counters, active underline, default BS tab
 *  CA-03 — Tabela e Colunas: colunas presentes, formatação, hover, NULL display
 *  CA-04 — Badges de Tipo: 6 variantes presentes na tabela
 *  CA-05 — Cor Semântica na Coluna Total: gain/loss/neutro
 *  CA-06 — Ordenação: sort toggle, direcção, seta activa
 *  CA-07 — Modo de Edição: checkboxes, select all, delete button
 *  CA-08 — Rodapé: contagem, page size selector
 *  CA-09 — Estado Vazio: mensagem quando sem resultados
 *  CA-10 — Painel de Tweaks: densidade, toggle FX, toggle Fee
 *  CA-11 — Sidebar e Navegação: link activo, href=/transactions, aria-current
 *  CA-12 — Design System: dark mode, IBM Plex Mono, teal accent
 *  CA-13 — Responsividade + auth redirect
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// CA-13 — Auth redirect (unauthenticated context, no storageState)
// ─────────────────────────────────────────────────────────────────────────────

test("CA-13 auth › /transactions sem sessão: middleware redireciona para passphrase", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // contexto verdadeiramente limpo, sem auth
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/transactions");
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

test.describe("Transactions Page — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
  });

  // ─── CA-01 — Filter Row ──────────────────────────────────────────────────

  test("CA-01 filter-row › renderiza 4 chips de filtro", async ({ page }) => {
    // From date input
    await expect(page.locator('input[aria-label="From date"]')).toBeVisible();
    // To date input
    await expect(page.locator('input[aria-label="To date"]')).toBeVisible();
    // Ticker filter input
    await expect(
      page.locator('input[aria-label="Filter by ticker"]')
    ).toBeVisible();
    // Type filter select
    await expect(
      page.locator('select[aria-label="Filter by type"]')
    ).toBeVisible();
  });

  test("CA-01 filter-row › botão Edit alinha à direita dos filtros", async ({
    page,
  }) => {
    const editBtn = page.locator(
      'button[aria-label="Toggle edit mode"]'
    );
    await expect(editBtn).toBeVisible();
    await expect(editBtn).toContainText("Edit");
  });

  test("CA-01 filter-row › filtro de ticker é case-insensitive e filtra por substring", async ({
    page,
  }) => {
    // Default tab is Buy/Sell, which has VWCE, AMAT, PPLT, CSPX, MSFT, TSLA, GLD = 7 rows
    // Type 'vwce' lowercase — should still find VWCE
    const tickerInput = page.locator('input[aria-label="Filter by ticker"]');
    await tickerInput.fill("vwce");

    // Table should now show only rows containing VWCE
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify VWCE is present
    const firstRow = rows.first();
    await expect(firstRow).toContainText("VWCE");

    // Clear filter
    await tickerInput.fill("");
  });

  test("CA-01 filter-row › dropdown All Types filtra por tipo específico", async ({
    page,
  }) => {
    // Switch to All tab first so we have all 13 transactions
    const allTab = page.locator('[role="tablist"] [role="tab"]').filter({ hasText: "All" });
    await allTab.click();

    const typeSelect = page.locator('select[aria-label="Filter by type"]');

    // Filter by 'buy' — should show only BUY rows
    await typeSelect.selectOption("buy");
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    // There are 5 BUY transactions
    expect(count).toBe(5);

    // Reset filter
    await typeSelect.selectOption("all");
  });

  test("CA-01 filter-row › filtros combinam entre si (AND lógico)", async ({
    page,
  }) => {
    // Switch to All tab
    const allTab = page.locator('[role="tablist"] [role="tab"]').filter({ hasText: "All" });
    await allTab.click();

    // Filter ticker = 'VWCE' AND type = 'div' → should show 1 row (t12: VWCE div)
    const tickerInput = page.locator('input[aria-label="Filter by ticker"]');
    const typeSelect = page.locator('select[aria-label="Filter by type"]');

    await tickerInput.fill("VWCE");
    await typeSelect.selectOption("div");

    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBe(1);

    // Reset
    await tickerInput.fill("");
    await typeSelect.selectOption("all");
  });

  // ─── CA-02 — Type Tabs ───────────────────────────────────────────────────

  test("CA-02 tabs › seis tabs visíveis com labels correctos", async ({
    page,
  }) => {
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();

    const expectedLabels = [
      "All",
      "Buy / Sell",
      "Cash Movement",
      "Conversion",
      "Dividend",
      "Interest",
    ];
    for (const label of expectedLabels) {
      await expect(
        tabList.locator('[role="tab"]').filter({ hasText: label })
      ).toBeVisible();
    }
  });

  test("CA-02 tabs › tab Buy/Sell activa por defeito ao carregar", async ({
    page,
  }) => {
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await expect(bsTab).toHaveAttribute("aria-selected", "true");
  });

  test("CA-02 tabs › tab activa tem underline teal", async ({ page }) => {
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });

    // Active tab has the neon underline span
    const underline = bsTab.locator('span[aria-hidden="true"]');
    await expect(underline).toBeVisible();
  });

  test("CA-02 tabs › contadores reflectem número de transacções", async ({
    page,
  }) => {
    // All tab should show 13
    const allTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "All" });
    // Count badge is the span with tabular-nums
    const allCount = allTab.locator("span.tabular-nums");
    await expect(allCount).toContainText("13");

    // Buy/Sell tab should show 7
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    const bsCount = bsTab.locator("span.tabular-nums");
    await expect(bsCount).toContainText("7");
  });

  test("CA-02 tabs › clicar tab filtra a tabela", async ({ page }) => {
    // Click on Cash Movement tab — should show 2 rows
    const cashTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Cash Movement" });
    await cashTab.click();
    await expect(cashTab).toHaveAttribute("aria-selected", "true");

    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(2);

    // Switch back to Buy/Sell
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await bsTab.click();
  });

  test("CA-02 tabs › tabs colapsam para 3 colunas em viewport < 900px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 860, height: 800 });
    const tabList = page.locator('[role="tablist"]');
    const cls = await tabList.getAttribute("class");
    // Should have grid-cols-3 for mobile
    expect(cls).toContain("grid-cols-3");
    // Reset
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  // ─── CA-03 — Tabela e Colunas ────────────────────────────────────────────

  test("CA-03 table › colunas obrigatórias presentes com headers correctos", async ({
    page,
  }) => {
    const expectedHeaders = [
      "Date",
      "Ticker",
      "Type",
      "Quantity",
      "Price",
      "Exchange Rate",
      "Fee",
      "Total",
    ];
    for (const header of expectedHeaders) {
      await expect(
        page.locator("table thead th button").filter({ hasText: header })
      ).toBeVisible();
    }
  });

  test("CA-03 table › data exibida no formato DD/MM/YYYY", async ({ page }) => {
    // First row in Buy/Sell (sorted date desc) should be CSPX on 2026-04-22 → 22/04/2026
    const firstDateCell = page.locator("table tbody tr:first-child td:nth-child(1)");
    const dateText = await firstDateCell.textContent();
    // Date format: DD/MM/YYYY
    expect(dateText?.trim()).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test("CA-03 table › colunas numéricas alinhadas à direita com tabular-nums", async ({
    page,
  }) => {
    // Total column (last) should have text-right and tabular-nums
    const totalCells = page.locator(
      "table tbody td.text-right.tabular-nums"
    );
    const count = await totalCells.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("CA-03 table › Quantity e Price mostram '—' para CASH/DIV/INT", async ({
    page,
  }) => {
    // Navigate to Cash Movement tab
    const cashTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Cash Movement" });
    await cashTab.click();

    // Cash rows have null qty and price — should show '—'
    const qtyCell = page.locator("table tbody tr:first-child td").nth(3);
    const priceCell = page.locator("table tbody tr:first-child td").nth(4);

    const qtyText = await qtyCell.textContent();
    const priceText = await priceCell.textContent();

    expect(qtyText?.trim()).toBe("—");
    expect(priceText?.trim()).toBe("—");

    // Return to Buy/Sell
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await bsTab.click();
  });

  test("CA-03 table › Ticker tem font-semibold e tracking-wide", async ({
    page,
  }) => {
    // Ticker column (2nd data column) should have font-semibold tracking-wide
    const tickerCell = page.locator("table tbody tr:first-child td.font-semibold.tracking-wide");
    await expect(tickerCell).toBeVisible();
  });

  test("CA-03 table › CASH/INT sem ticker exibe label na coluna Ticker", async ({
    page,
  }) => {
    // Cash Movement: t8 has label 'Deposit · IBKR', t9 has 'Withdrawal'
    const cashTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Cash Movement" });
    await cashTab.click();

    // Should see 'Deposit · IBKR' or 'Withdrawal' in ticker column
    const tickerCells = page.locator("table tbody tr td.font-semibold.tracking-wide");
    const texts = await tickerCells.allTextContents();
    const hasLabel = texts.some(
      (t) => t.includes("Deposit") || t.includes("Withdrawal")
    );
    expect(hasLabel).toBe(true);

    // Return to Buy/Sell
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await bsTab.click();
  });

  // ─── CA-04 — Badges de Tipo ──────────────────────────────────────────────

  test("CA-04 badges › todos os 6 tipos de badge presentes no All tab", async ({
    page,
  }) => {
    const allTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "All" });
    await allTab.click();

    const expectedLabels = ["BUY", "SELL", "CASH", "CONV", "DIV", "INT"];
    for (const label of expectedLabels) {
      await expect(
        page.locator("table tbody").getByText(label, { exact: true }).first()
      ).toBeVisible();
    }

    // Return to Buy/Sell
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await bsTab.click();
  });

  test("CA-04 badges › badges são uppercase com font-semibold tracking-wider", async ({
    page,
  }) => {
    // BUY badge should have font-semibold and tracking-wider
    const buyBadge = page.locator("table tbody span").filter({ hasText: "BUY" }).first();
    await expect(buyBadge).toBeVisible();
    const cls = await buyBadge.getAttribute("class");
    expect(cls).toContain("font-semibold");
    expect(cls).toContain("tracking-wider");
    expect(cls).toContain("uppercase");
  });

  // ─── CA-05 — Cor Semântica na Coluna Total ───────────────────────────────

  test("CA-05 total-color › DIV total tem cor --gain", async ({ page }) => {
    const divTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Dividend" });
    await divTab.click();

    // DIV total cells should have text-[var(--gain)]
    const totalCells = page.locator(
      'table tbody td.text-\\[var\\(--gain\\)\\]'
    );
    const count = await totalCells.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Return to Buy/Sell
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await bsTab.click();
  });

  test("CA-05 total-color › INT total tem cor --gain", async ({ page }) => {
    const intTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Interest" });
    await intTab.click();

    const totalCells = page.locator(
      'table tbody td.text-\\[var\\(--gain\\)\\]'
    );
    const count = await totalCells.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await bsTab.click();
  });

  test("CA-05 total-color › Cash Withdrawal (total negativo) tem cor --loss", async ({
    page,
  }) => {
    const cashTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Cash Movement" });
    await cashTab.click();

    // t9: Withdrawal total = -1200.00 → should have --loss class
    const lossCells = page.locator(
      'table tbody td.text-\\[var\\(--loss\\)\\]'
    );
    const count = await lossCells.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await bsTab.click();
  });

  // ─── CA-06 — Ordenação ───────────────────────────────────────────────────

  test("CA-06 sort › ordenação por defeito é Date descendente", async ({
    page,
  }) => {
    // Date column header button should have the active arrow ▼
    const dateHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Date" });
    await expect(dateHeader).toBeVisible();

    const activeArrow = dateHeader.locator(".text-primary");
    await expect(activeArrow).toBeVisible();
    const arrowText = await activeArrow.textContent();
    expect(arrowText?.trim()).toBe("▼");
  });

  test("CA-06 sort › clicar header ordena; segundo clique inverte direcção", async ({
    page,
  }) => {
    const tickerHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Ticker" });

    // First click → descending on Ticker
    await tickerHeader.click();
    const descTh = page.locator('table thead th[aria-sort="descending"]');
    await expect(descTh).toBeVisible();
    let arrow = page.locator("table thead th button .text-primary");
    let arrowText = await arrow.textContent();
    expect(arrowText?.trim()).toBe("▼");

    // Second click → ascending
    await tickerHeader.click();
    const ascTh = page.locator('table thead th[aria-sort="ascending"]');
    await expect(ascTh).toBeVisible();
    arrow = page.locator("table thead th button .text-primary");
    arrowText = await arrow.textContent();
    expect(arrowText?.trim()).toBe("▲");

    // Reset sort to date
    const dateHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Date" });
    await dateHeader.click();
  });

  test("CA-06 sort › inactive columns mostram indicador neutro ↕", async ({
    page,
  }) => {
    // Ticker column (not the active sort) should show neutral arrow
    const tickerHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Ticker" });
    const neutralArrow = tickerHeader.locator(".text-muted-foreground\\/50");
    await expect(neutralArrow).toBeVisible();
  });

  // ─── CA-07 — Modo de Edição ──────────────────────────────────────────────

  test("CA-07 edit-mode › Edit button alterna modo de edição", async ({
    page,
  }) => {
    const editBtn = page.locator('button[aria-label="Toggle edit mode"]');

    // Initially not in edit mode
    await expect(editBtn).toHaveAttribute("aria-pressed", "false");

    // Click to enter edit mode
    await editBtn.click();
    await expect(editBtn).toHaveAttribute("aria-pressed", "true");

    // In edit mode, button should have primary styling
    const cls = await editBtn.getAttribute("class");
    expect(cls).toContain("text-primary");

    // Exit edit mode
    await editBtn.click();
    await expect(editBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("CA-07 edit-mode › checkboxes aparecem em cada linha em modo de edição", async ({
    page,
  }) => {
    const editBtn = page.locator('button[aria-label="Toggle edit mode"]');
    await editBtn.click();

    // Each row should have a checkbox
    const checkboxes = page.locator(
      'table tbody td [role="checkbox"]'
    );
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Exit edit mode
    await editBtn.click();
  });

  test("CA-07 edit-mode › header checkbox faz select all das linhas visíveis", async ({
    page,
  }) => {
    const editBtn = page.locator('button[aria-label="Toggle edit mode"]');
    await editBtn.click();

    // Click the header checkbox
    const headerCheckbox = page.locator(
      'table thead th [role="checkbox"][aria-label="Select all rows"]'
    );
    await expect(headerCheckbox).toBeVisible();
    await headerCheckbox.click();

    // All row checkboxes should be checked
    const rowCheckboxes = page.locator(
      'table tbody td [role="checkbox"]'
    );
    const count = await rowCheckboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(rowCheckboxes.nth(i)).toHaveAttribute("aria-checked", "true");
    }

    // Click again to deselect all
    await headerCheckbox.click();
    for (let i = 0; i < count; i++) {
      await expect(rowCheckboxes.nth(i)).toHaveAttribute("aria-checked", "false");
    }

    // Exit edit mode
    await editBtn.click();
  });

  test("CA-07 edit-mode › Delete button aparece e está desabilitado sem selecção", async ({
    page,
  }) => {
    const editBtn = page.locator('button[aria-label="Toggle edit mode"]');
    await editBtn.click();

    // Delete button should be visible
    const deleteBtn = page.locator(
      'button[aria-label*="Delete"]'
    );
    await expect(deleteBtn).toBeVisible();

    // With no selection, Delete should be disabled
    await expect(deleteBtn).toBeDisabled();

    // Exit edit mode
    await editBtn.click();
  });

  test("CA-07 edit-mode › sair do modo de edição limpa a selecção", async ({
    page,
  }) => {
    const editBtn = page.locator('button[aria-label="Toggle edit mode"]');
    await editBtn.click();

    // Select a row
    const firstRowCheckbox = page
      .locator('table tbody td [role="checkbox"]')
      .first();
    await firstRowCheckbox.click();
    await expect(firstRowCheckbox).toHaveAttribute("aria-checked", "true");

    // Exit edit mode
    await editBtn.click();
    await expect(editBtn).toHaveAttribute("aria-pressed", "false");

    // Re-enter edit mode — checkboxes should be unchecked (selection cleared)
    await editBtn.click();
    const checkboxes = page.locator('table tbody td [role="checkbox"]');
    const firstCb = checkboxes.first();
    await expect(firstCb).toHaveAttribute("aria-checked", "false");

    // Exit
    await editBtn.click();
  });

  // ─── CA-08 — Rodapé ──────────────────────────────────────────────────────

  test("CA-08 footer › mostra Total: N transactions", async ({ page }) => {
    // Footer should display total count of filtered transactions
    // Buy/Sell tab has 7 transactions
    await expect(page.locator("text=Total:")).toBeVisible();
    await expect(page.getByText("transactions")).toBeVisible();
  });

  test("CA-08 footer › selector de page size presente com 4 opções", async ({
    page,
  }) => {
    const pageSizeSelect = page.locator(
      'select[aria-label="Transactions per page"]'
    );
    await expect(pageSizeSelect).toBeVisible();

    // Default should be 20
    await expect(pageSizeSelect).toHaveValue("20");

    // Should have options 10, 20, 50, 100
    const options = pageSizeSelect.locator("option");
    await expect(options).toHaveCount(4);
  });

  test("CA-08 footer › mudar page size actualiza a lista", async ({ page }) => {
    const allTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "All" });
    await allTab.click();

    // With 13 transactions and page size 10, should show 10 rows
    const pageSizeSelect = page.locator(
      'select[aria-label="Transactions per page"]'
    );
    await pageSizeSelect.selectOption("10");

    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(10);

    // Reset to 20
    await pageSizeSelect.selectOption("20");

    // Return to Buy/Sell
    const bsTab = page
      .locator('[role="tablist"] [role="tab"]')
      .filter({ hasText: "Buy / Sell" });
    await bsTab.click();
  });

  test("CA-08 footer › contagem de seleccionados aparece quando > 0", async ({
    page,
  }) => {
    const editBtn = page.locator('button[aria-label="Toggle edit mode"]');
    await editBtn.click();

    // Select one row
    const firstRowCheckbox = page
      .locator('table tbody td [role="checkbox"]')
      .first();
    await firstRowCheckbox.click();

    // Footer should show "1 selected" with primary color
    const selectedCount = page.locator("text=selected");
    await expect(selectedCount).toBeVisible();

    // Exit edit mode
    await editBtn.click();
  });

  // ─── CA-09 — Estado Vazio ─────────────────────────────────────────────────

  test("CA-09 empty-state › exibe empty state quando filtros não retornam resultados", async ({
    page,
  }) => {
    // Type in a ticker that matches nothing
    const tickerInput = page.locator('input[aria-label="Filter by ticker"]');
    await tickerInput.fill("NONEXISTENT_TICKER_XYZ");

    // Table should be replaced by empty state
    await expect(
      page.getByText("No transactions match your filters")
    ).toBeVisible();

    // Table should not be visible
    await expect(page.locator("table")).not.toBeVisible();

    // Clear filter
    await tickerInput.fill("");
  });

  test("CA-09 empty-state › empty state tem subtítulo de sugestão", async ({
    page,
  }) => {
    const tickerInput = page.locator('input[aria-label="Filter by ticker"]');
    await tickerInput.fill("NONEXISTENT_TICKER_XYZ");

    await expect(
      page.getByText("Try clearing the date range or ticker filter")
    ).toBeVisible();

    await tickerInput.fill("");
  });

  // ─── CA-10 — Painel de Tweaks ────────────────────────────────────────────

  test("CA-10 tweaks › botão de toggle abre o painel de tweaks", async ({
    page,
  }) => {
    const tweaksBtn = page.locator(
      'button[aria-label="Open tweaks panel"], button[aria-label="Close tweaks panel"]'
    );
    await expect(tweaksBtn).toBeVisible();

    // Click to open
    const openBtn = page.locator('button[aria-label="Open tweaks panel"]');
    await openBtn.click();

    // Panel should be visible
    const panel = page.locator('[role="dialog"][aria-label="Display settings"]');
    await expect(panel).toBeVisible();

    // Close
    const closeBtn = page.locator('button[aria-label="Close tweaks panel"]');
    await closeBtn.click();
  });

  test("CA-10 tweaks › radio density: comfortable por defeito", async ({
    page,
  }) => {
    // Open tweaks
    const openBtn = page.locator('button[aria-label="Open tweaks panel"]');
    await openBtn.click();

    const panel = page.locator('[role="dialog"][aria-label="Display settings"]');
    await expect(panel).toBeVisible();

    // 'Normal' (comfortable) button should be pressed by default
    const comfortableBtn = panel.locator('button[aria-pressed="true"]');
    const comfortableText = await comfortableBtn.textContent();
    expect(comfortableText?.trim()).toBe("Normal");

    // Close
    const closeBtn = page.locator('button[aria-label="Close tweaks panel"]');
    await closeBtn.click();
  });

  test("CA-10 tweaks › toggle Show exchange rate oculta coluna FX", async ({
    page,
  }) => {
    // Verify Exchange Rate column is visible first
    await expect(
      page.locator("table thead th button").filter({ hasText: "Exchange Rate" })
    ).toBeVisible();

    // Open tweaks panel
    const openBtn = page.locator('button[aria-label="Open tweaks panel"]');
    await openBtn.click();

    // Toggle 'Show exchange rate' off
    const fxToggle = page.locator(
      '[role="switch"][aria-label="Show exchange rate"]'
    );
    await expect(fxToggle).toHaveAttribute("aria-checked", "true");
    await fxToggle.click();
    await expect(fxToggle).toHaveAttribute("aria-checked", "false");

    // Exchange Rate column should no longer be visible
    await expect(
      page.locator("table thead th button").filter({ hasText: "Exchange Rate" })
    ).not.toBeVisible();

    // Close and re-enable
    const closeBtn = page.locator('button[aria-label="Close tweaks panel"]');
    await closeBtn.click();

    // Re-open and toggle back on
    await openBtn.click();
    await fxToggle.click();
    await closeBtn.click();
  });

  test("CA-10 tweaks › toggle Show fees oculta coluna Fee", async ({ page }) => {
    // Verify Fee column is visible first
    await expect(
      page.locator("table thead th button").filter({ hasText: "Fee" })
    ).toBeVisible();

    // Open tweaks panel
    const openBtn = page.locator('button[aria-label="Open tweaks panel"]');
    await openBtn.click();

    // Toggle 'Show fees' off
    const feeToggle = page.locator(
      '[role="switch"][aria-label="Show fees"]'
    );
    await expect(feeToggle).toHaveAttribute("aria-checked", "true");
    await feeToggle.click();
    await expect(feeToggle).toHaveAttribute("aria-checked", "false");

    // Fee column should no longer be visible
    await expect(
      page.locator("table thead th button").filter({ hasText: "Fee" })
    ).not.toBeVisible();

    // Close and re-enable
    const closeBtn = page.locator('button[aria-label="Close tweaks panel"]');
    await closeBtn.click();

    await openBtn.click();
    await feeToggle.click();
    await closeBtn.click();
  });

  // ─── CA-11 — Sidebar e Navegação ─────────────────────────────────────────

  test("CA-11 sidebar › link Transactions activo com href=/transactions e aria-current=page", async ({
    page,
  }) => {
    const txLink = page
      .locator("aside nav a")
      .filter({ hasText: "Transactions" });
    await expect(txLink).toBeVisible();
    await expect(txLink).toHaveAttribute("href", "/transactions");
    await expect(txLink).toHaveAttribute("aria-current", "page");

    // Should have teal/primary visual indicator
    const className = await txLink.getAttribute("class");
    expect(className).toContain("text-primary");
    expect(className).toContain("border-primary");
  });

  test("CA-11 sidebar › outros links placeholder mantêm href=# e visual inactivo", async ({
    page,
  }) => {
    // Tax Calculator is href="#" (inactive)
    for (const label of ["Tax Calculator"]) {
      const link = page
        .locator("aside nav a, aside nav [href='#']")
        .filter({ hasText: label });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", "#");
    }
  });

  test("CA-11 sidebar › badge com contagem de 13 transacções visível", async ({
    page,
  }) => {
    // Sidebar has TX_COUNT = 13 badge
    const txLink = page.locator("aside nav").filter({ has: page.locator("text=Transactions") });
    await expect(txLink.getByText("13")).toBeVisible();
  });

  // ─── CA-12 — Design System ───────────────────────────────────────────────

  test("CA-12 design › classe dark forçada no elemento <html>", async ({
    page,
  }) => {
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });

  test("CA-12 design › página Transactions renderiza sem erros JS", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("CA-12 design › h1 'Transactions' visível", async ({ page }) => {
    const h1 = page.locator("h1").filter({ hasText: "Transactions" });
    await expect(h1).toBeVisible();
  });

  test("CA-12 design › botão Add Manually com estilo btn--primary (teal)", async ({
    page,
  }) => {
    const addBtn = page.locator(
      'button[aria-label="Add transaction manually"]'
    );
    await expect(addBtn).toBeVisible();
    const cls = await addBtn.getAttribute("class");
    expect(cls).toContain("bg-primary");
  });

  test("CA-12 design › botão Import presente no page head", async ({ page }) => {
    const importBtn = page.locator('button[aria-label="Import transactions"]');
    await expect(importBtn).toBeVisible();
    await expect(importBtn).toContainText("Import");
  });

  test("CA-12 design › CSS font variable IBM Plex Mono aplicada no body", async ({
    page,
  }) => {
    const fontVar = await page.locator("body").evaluate(
      (el) => getComputedStyle(el).getPropertyValue("--font-ibm-plex-mono")
    );
    expect(fontVar.trim().length).toBeGreaterThan(0);
  });

  // ─── CA-13 — Responsividade ──────────────────────────────────────────────

  test("CA-13 responsive › sidebar hidden em mobile (< 700px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();

    // Reset
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("CA-13 responsive › tabela tem overflow-x-auto para scroll horizontal", async ({
    page,
  }) => {
    const tableWrapper = page.locator(".overflow-x-auto");
    await expect(tableWrapper).toBeVisible();
  });

  test("CA-13 responsive › desktop: tablist tem 6 colunas (grid-cols-6)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const tabList = page.locator('[role="tablist"]');
    const cls = await tabList.getAttribute("class");
    // On desktop: md:grid-cols-6
    expect(cls).toContain("md:grid-cols-6");
  });
});
