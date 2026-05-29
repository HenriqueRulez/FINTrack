/**
 * E2E Tests — Performance Page Redesign
 * Working Item: .claude/working-items/performance-redesign.md
 *
 * CAs verified:
 *  CA-01 — KPI Strip: 5 células, valores, gauge, split bar, tick rows, cores semânticas
 *  CA-02 — Page Header: h1, neon-dot LIVE, contagem activos/fechados, selector de período YTD default
 *  CA-03 — Tabela Trade Analysis: 9 colunas, sort toggle, direcção, default sort Total Profit desc
 *  CA-04 — Célula Asset: logo 36×36, ticker bold, nome muted, min-width 240px
 *  CA-05 — Status Pill: Active (dot neon gain), Closed (dot muted)
 *  CA-06 — Sparkline: SVG 96×28 activos, dash para fechados, dot final, delta %
 *  CA-07 — ROI Badge: pill rounded-full, gain verde / loss vermelho, sinal e 2 decimais
 *  CA-08 — Selector de Moeda e Toggle Show Closed: EUR default, conversão FX, toggle show/hide
 *  CA-09 — Sidebar e Navegação: Performance activo aria-current=page, placeholders href=#
 *  CA-10 — Design System: dark mode, IBM Plex Mono, teal accent, neon-dot, animações rise
 *  CA-11 — Responsividade: sidebar oculta mobile, KPI grid breakpoints, overflow-x table
 */

import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// Auth redirect (unauthenticated context, no storageState)
// ─────────────────────────────────────────────────────────────────────────────

test("auth › /performance sem sessão: rota protegida — redirige para /passphrase ou carrega página", async ({
  browser,
}) => {
  // Middleware adiciona /performance ao PROTECTED. Contexto limpo verifica a protecção.
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // contexto verdadeiramente limpo, sem auth
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/performance");
  await page.waitForLoadState("networkidle");

  // Sem sessão, o middleware DEVE redireccionar para /passphrase
  const url = page.url();
  expect(url).toMatch(/passphrase/);
  expect(errors).toHaveLength(0);

  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated tests (storageState from playwright.config.ts)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Performance Page — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/performance");
    await page.waitForLoadState("networkidle");
  });

  // ─── CA-02 — Page Header ──────────────────────────────────────────────────

  test("CA-02 header › h1 'Performance' visível", async ({ page }) => {
    const h1 = page.locator("h1").filter({ hasText: "Performance" });
    await expect(h1).toBeVisible();
  });

  test("CA-02 header › neon-dot pulsante presente no status LIVE", async ({ page }) => {
    // neon-dot has aria-hidden="true" — check via DOM presence and LIVE text visible
    const neonDotCount = await page.locator(".neon-dot").count();
    expect(neonDotCount).toBeGreaterThanOrEqual(1);
    // LIVE text present (not aria-hidden, so visible)
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
  });

  test("CA-02 header › contagem activos e fechados correcta (4 active · 2 closed)", async ({ page }) => {
    // The counts are rendered as React nodes inside a <span>; use partial text match
    const countSpan = page.locator("span").filter({ hasText: /4.*active/ });
    await expect(countSpan.first()).toBeVisible();
    // "closed" count appears in the same parent span
    const closedText = page.locator("span").filter({ hasText: /2.*closed/ });
    await expect(closedText.first()).toBeVisible();
  });

  test("CA-02 header › selector período: 5 opções, YTD seleccionado por defeito", async ({ page }) => {
    const periodGroup = page.locator('[role="group"][aria-label*="período"]');
    await expect(periodGroup).toBeVisible();

    const buttons = periodGroup.locator("button");
    await expect(buttons).toHaveCount(5);

    for (const period of ["1M", "3M", "YTD", "1Y", "ALL"]) {
      await expect(buttons.filter({ hasText: period })).toBeVisible();
    }

    // YTD is default
    const ytdBtn = buttons.filter({ hasText: "YTD" });
    await expect(ytdBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("CA-02 header › clicar período troca estado activo visualmente", async ({ page }) => {
    const periodGroup = page.locator('[role="group"][aria-label*="período"]');
    const oneM = periodGroup.locator("button").filter({ hasText: "1M" });
    const ytd = periodGroup.locator("button").filter({ hasText: "YTD" });

    // Initial: YTD active
    await expect(ytd).toHaveAttribute("aria-pressed", "true");

    // Click 1M
    await oneM.click();
    await expect(oneM).toHaveAttribute("aria-pressed", "true");
    await expect(ytd).toHaveAttribute("aria-pressed", "false");

    // Click back to YTD
    await ytd.click();
    await expect(ytd).toHaveAttribute("aria-pressed", "true");
  });

  // ─── CA-01 — KPI Strip ───────────────────────────────────────────────────

  test("CA-01 kpi-strip › grid com 5 células visíveis", async ({ page }) => {
    // The KPI strip uses a single card with a grid of 5 columns at xl
    const kpiCard = page.locator(".grid.grid-cols-2");
    await expect(kpiCard).toBeVisible();

    // 5 direct child divs in the grid
    const cells = kpiCard.locator(":scope > div");
    await expect(cells).toHaveCount(5);
  });

  test("CA-01 kpi-strip › grid classes responsivas: 2 → 3 → 5 colunas", async ({ page }) => {
    const kpiGrid = page.locator(".grid.grid-cols-2");
    const cls = await kpiGrid.getAttribute("class");
    expect(cls).toContain("grid-cols-2");
    expect(cls).toContain("md:grid-cols-3");
    expect(cls).toContain("xl:grid-cols-5");
  });

  test("CA-01 kpi-strip › labels Win Rate, Profit Split, Overall Avg Hold, Avg Winner Hold, Avg Loser Hold", async ({ page }) => {
    for (const label of [
      "Win Rate",
      "Profit Split",
      "Overall Avg Hold",
      "Avg Winner Hold",
      "Avg Loser Hold",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("CA-01 kpi-strip › Win Rate mostra valor percentual com %", async ({ page }) => {
    const winRateCell = page.locator(".grid.grid-cols-2 > div").first();
    const valueEl = winRateCell.locator(".text-\\[28px\\]").first();
    const text = await valueEl.textContent();
    expect(text?.trim()).toMatch(/\d+\.\d+%/);
  });

  test("CA-01 kpi-strip › Profit Split: legenda 'Realized vs Unrealized' visível", async ({ page }) => {
    await expect(page.getByText("Realized vs Unrealized", { exact: true })).toBeVisible();
  });

  test("CA-01 kpi-strip › Avg Winner Hold usa cor gain (verde) no ícone", async ({ page }) => {
    // Find Avg Winner Hold cell
    const cells = page.locator(".grid.grid-cols-2 > div");
    const winnerCell = cells.filter({ hasText: "Avg Winner Hold" });
    // Icon span should have text-[var(--gain)]
    const icon = winnerCell.locator('span[class*="--gain"]').first();
    await expect(icon).toBeVisible();
  });

  test("CA-01 kpi-strip › Avg Loser Hold usa cor loss (vermelho) no ícone", async ({ page }) => {
    const cells = page.locator(".grid.grid-cols-2 > div");
    const loserCell = cells.filter({ hasText: "Avg Loser Hold" });
    const icon = loserCell.locator('span[class*="--loss"]').first();
    await expect(icon).toBeVisible();
  });

  test("CA-01 kpi-strip › Overall Avg Hold = 108 ou 109 dias (activas: 54+110+72+198)/4", async ({ page }) => {
    const cells = page.locator(".grid.grid-cols-2 > div");
    const overallCell = cells.filter({ hasText: "Overall Avg Hold" });
    const valueEl = overallCell.locator(".text-\\[28px\\]").first();
    const text = await valueEl.textContent();
    // (54+110+72+198)/4 = 108.5 → rounds to 108 or 109
    expect(text?.trim()).toMatch(/^10[89]/);
  });

  test("CA-01 kpi-strip › Avg Winner Hold = 108 dias (VWCE 54, CSPX 72, MSFT 198)/3", async ({ page }) => {
    const cells = page.locator(".grid.grid-cols-2 > div");
    const winnerCell = cells.filter({ hasText: "Avg Winner Hold" });
    const valueEl = winnerCell.locator(".text-\\[28px\\]").first();
    const text = await valueEl.textContent();
    expect(text?.trim()).toMatch(/^108/);
  });

  test("CA-01 kpi-strip › Avg Loser Hold = 110 dias (AMAT único loser activo)", async ({ page }) => {
    const cells = page.locator(".grid.grid-cols-2 > div");
    const loserCell = cells.filter({ hasText: "Avg Loser Hold" });
    const valueEl = loserCell.locator(".text-\\[28px\\]").first();
    const text = await valueEl.textContent();
    expect(text?.trim()).toMatch(/^110/);
  });

  // ─── CA-03 — Tabela Trade Analysis ───────────────────────────────────────

  test("CA-03 tabela › 9 colunas na ordem correcta", async ({ page }) => {
    const headers = page.locator("table thead th");
    await expect(headers).toHaveCount(9);

    // Verify the text content of all 9 headers via JS to avoid Playwright strict-mode issues
    // with "Realized" substring matching "Unrealized"
    const headerTexts = await page.locator("table thead th").evaluateAll(
      (ths) => ths.map((th) => th.textContent?.trim() ?? "")
    );
    expect(headerTexts).toHaveLength(9);
    // Check each expected label is present as the start of a header text
    for (const label of ["Asset", "Status", "Holding Period", "Invested",
      "Realized", "Unrealized", "Total Profit", "Last 30 days", "ROI"]) {
      const found = headerTexts.some((t) => t.startsWith(label));
      expect(found, `Header "${label}" not found in: ${JSON.stringify(headerTexts)}`).toBe(true);
    }
  });

  test("CA-03 tabela › ordenação por defeito: Total Profit decrescente (aria-sort=descending)", async ({ page }) => {
    const totalProfitTh = page.locator('table thead th[aria-sort="descending"]');
    await expect(totalProfitTh).toBeVisible();
    const text = await totalProfitTh.textContent();
    expect(text?.trim()).toContain("Total Profit");
  });

  test("CA-03 tabela › seta ▼ activa (cor teal/primary) na coluna Total Profit", async ({ page }) => {
    const activeArrow = page.locator("table thead th button .text-primary");
    await expect(activeArrow).toBeVisible();
    const arrowText = await activeArrow.textContent();
    expect(arrowText?.trim()).toBe("▼");
  });

  test("CA-03 tabela › clicar header ordena; segundo clique inverte direcção", async ({ page }) => {
    const assetBtn = page
      .locator("table thead th button")
      .filter({ hasText: "Asset" });

    // Click once → desc
    await assetBtn.click();
    const descTh = page.locator('table thead th[aria-sort="descending"]');
    await expect(descTh).toBeVisible();
    const descArrow = page.locator("table thead th button .text-primary");
    expect(await descArrow.textContent()).toBe("▼");

    // Click again → asc
    await assetBtn.click();
    const ascTh = page.locator('table thead th[aria-sort="ascending"]');
    await expect(ascTh).toBeVisible();
    const ascArrow = page.locator("table thead th button .text-primary");
    expect(await ascArrow.textContent()).toBe("▲");
  });

  test("CA-03 tabela › colunas inactivas mostram seta neutra ↕", async ({ page }) => {
    // Status column (not the active sort) should show ↕
    const statusBtn = page
      .locator("table thead th button")
      .filter({ hasText: "Status" });
    const neutralArrow = statusBtn.locator(".text-muted-foreground\\/50");
    await expect(neutralArrow).toBeVisible();
    expect(await neutralArrow.textContent()).toBe("↕");
  });

  test("CA-03 tabela › hover em linha aplica classe hover:bg-muted/40", async ({ page }) => {
    const firstRow = page.locator("table tbody tr").first();
    const cls = await firstRow.getAttribute("class");
    expect(cls).toContain("hover:bg-muted/40");
    expect(cls).toContain("duration-[140ms]");
  });

  // ─── CA-04 — Célula Asset ─────────────────────────────────────────────────

  test("CA-04 asset-cell › logo 36×36 (w-9 h-9) presente para cada linha activa", async ({ page }) => {
    const logos = page.locator("table tbody td:first-child .w-9.h-9");
    const count = await logos.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test("CA-04 asset-cell › ticker em font-semibold e tracking-wide", async ({ page }) => {
    const firstRow = page.locator("table tbody tr").first();
    const ticker = firstRow.locator("span.font-semibold").first();
    await expect(ticker).toBeVisible();
    const cls = await ticker.getAttribute("class");
    expect(cls).toContain("tracking-wide");
  });

  test("CA-04 asset-cell › nome completo em text-muted-foreground com truncate", async ({ page }) => {
    const firstRow = page.locator("table tbody tr").first();
    const name = firstRow.locator("span.text-muted-foreground.truncate");
    await expect(name).toBeVisible();
  });

  test("CA-04 asset-cell › min-width 240px no contentor da célula", async ({ page }) => {
    const container = page.locator("table tbody td:first-child .min-w-\\[240px\\]").first();
    await expect(container).toBeVisible();
  });

  // ─── CA-05 — Status Pill ─────────────────────────────────────────────────

  test("CA-05 status-pill › 4 pills 'Active' visíveis (showClosed OFF)", async ({ page }) => {
    const activePills = page.locator('span[aria-label="Posição activa"]');
    await expect(activePills).toHaveCount(4);
  });

  test("CA-05 status-pill › Active: dot verde com box-shadow neon gain", async ({ page }) => {
    const activePill = page.locator('span[aria-label="Posição activa"]').first();
    const dot = activePill.locator("span").first();
    await expect(dot).toBeVisible();

    // box-shadow neon gain
    const shadow = await dot.evaluate((el) => window.getComputedStyle(el).boxShadow);
    expect(shadow).toContain("oklch");

    // bg-[var(--gain)] in class
    const cls = await dot.getAttribute("class");
    expect(cls).toContain("bg-[var(--gain)]");
  });

  test("CA-05 status-pill › 'Active' text em cor var(--gain)", async ({ page }) => {
    const activePill = page.locator('span[aria-label="Posição activa"]').first();
    const cls = await activePill.getAttribute("class");
    expect(cls).toContain("--gain");
  });

  // ─── CA-06 — Sparkline ───────────────────────────────────────────────────

  test("CA-06 sparkline › SVG 96×28 presente para todas as posições activas (4)", async ({ page }) => {
    const svgs = page.locator("table tbody td svg");
    await expect(svgs).toHaveCount(4);

    // Each SVG should be 96×28
    const firstSvg = svgs.first();
    await expect(firstSvg).toHaveAttribute("width", "96");
    await expect(firstSvg).toHaveAttribute("height", "28");
  });

  test("CA-06 sparkline › SVG contém fill gradient, path stroke e dot final (circle)", async ({ page }) => {
    const svg = page.locator("table tbody td svg").first();
    // gradient fill path
    await expect(svg.locator("path").first()).toBeVisible();
    // stroke path
    await expect(svg.locator("path").nth(1)).toBeVisible();
    // dot
    await expect(svg.locator("circle")).toBeVisible();
    const circleR = await svg.locator("circle").getAttribute("r");
    expect(parseFloat(circleR ?? "0")).toBeCloseTo(2.2, 1);
  });

  test("CA-06 sparkline › delta % visível à direita do SVG", async ({ page }) => {
    const sparklineWrapper = page.locator("table tbody td .min-w-\\[130px\\]").first();
    await expect(sparklineWrapper).toBeVisible();
    const deltaText = sparklineWrapper.locator("span.tabular-nums");
    await expect(deltaText).toBeVisible();
    const text = await deltaText.textContent();
    expect(text?.trim()).toMatch(/[+−][\d.]+%/);
  });

  test("CA-06 sparkline › seed determinístico: mesmo ticker mesmo resultado entre navegações", async ({ page }) => {
    // Get VWCE sparkline delta before reload
    const firstDelta = await page
      .locator("table tbody td .min-w-\\[130px\\] span.tabular-nums")
      .first()
      .textContent();

    await page.reload();
    await page.waitForLoadState("networkidle");

    const secondDelta = await page
      .locator("table tbody td .min-w-\\[130px\\] span.tabular-nums")
      .first()
      .textContent();

    expect(firstDelta?.trim()).toBe(secondDelta?.trim());
  });

  // ─── CA-07 — ROI Badge ────────────────────────────────────────────────────

  test("CA-07 roi-badge › pills presentes para cada linha activa (4)", async ({ page }) => {
    const badges = page.locator("table tbody td:last-child span.rounded-full");
    await expect(badges).toHaveCount(4);
  });

  test("CA-07 roi-badge › gain: verde, borda verde 40%, fundo gain soft", async ({ page }) => {
    // VWCE has positive ROI (+1246%) → gain badge
    const vwceRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "VWCE" }) });
    const badge = vwceRow.locator("td:last-child span.rounded-full");
    await expect(badge).toBeVisible();
    const cls = await badge.getAttribute("class");
    expect(cls).toContain("--gain");
    expect(cls).toContain("oklch(0.70_0.18_145");
  });

  test("CA-07 roi-badge › loss: vermelho, borda vermelha 40%, fundo loss soft", async ({ page }) => {
    // AMAT has negative ROI → loss badge
    const amatRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "AMAT" }) });
    const badge = amatRow.locator("td:last-child span.rounded-full");
    await expect(badge).toBeVisible();
    const cls = await badge.getAttribute("class");
    expect(cls).toContain("--loss");
    expect(cls).toContain("oklch(0.63_0.22_25");
  });

  test("CA-07 roi-badge › valor formatado com sinal e 2 casas decimais", async ({ page }) => {
    const badges = page.locator("table tbody td:last-child span.rounded-full");
    const count = await badges.count();
    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).textContent();
      expect(text?.trim()).toMatch(/^[+−][\d,.]+\.\d{2}%$/);
    }
  });

  test("CA-07 roi-badge › AMAT ROI = −32.85% (2 casas decimais)", async ({ page }) => {
    const amatRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "AMAT" }) });
    const badge = amatRow.locator("td:last-child span.rounded-full");
    const text = await badge.textContent();
    expect(text?.trim()).toContain("32.85%");
  });

  // ─── CA-08 — Selector de Moeda e Toggle Show Closed ──────────────────────

  test("CA-08 currency › EUR seleccionado por defeito (aria-pressed=true)", async ({ page }) => {
    const currencyGroup = page.locator('[role="group"][aria-label*="moeda"]');
    await expect(currencyGroup).toBeVisible();

    const eurBtn = currencyGroup.locator("button").filter({ hasText: "EUR" });
    const usdBtn = currencyGroup.locator("button").filter({ hasText: "USD" });
    const nativeBtn = currencyGroup.locator("button").filter({ hasText: "Native" });

    await expect(eurBtn).toHaveAttribute("aria-pressed", "true");
    await expect(usdBtn).toHaveAttribute("aria-pressed", "false");
    await expect(nativeBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("CA-08 currency › trocar para USD converte valores com FX mock (VWCE: 180 EUR → ~196.20 USD)", async ({ page }) => {
    const currencyGroup = page.locator('[role="group"][aria-label*="moeda"]');
    const usdBtn = currencyGroup.locator("button").filter({ hasText: "USD" });

    // VWCE invested in EUR before switch
    const vwceRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "VWCE" }) });
    const investedCell = vwceRow.locator("td").nth(3);
    const eurText = await investedCell.textContent();
    expect(eurText).toContain("€");

    await usdBtn.click();
    await expect(usdBtn).toHaveAttribute("aria-pressed", "true");

    const usdText = await investedCell.textContent();
    expect(usdText).toContain("US$");
    // 180 EUR * 1.09 = 196.20 USD
    expect(usdText).toContain("196");
  });

  test("CA-08 currency › Native mostra moeda original do activo (VWCE EUR, MSFT USD)", async ({ page }) => {
    const currencyGroup = page.locator('[role="group"][aria-label*="moeda"]');
    const nativeBtn = currencyGroup.locator("button").filter({ hasText: "Native" });

    await nativeBtn.click();
    await expect(nativeBtn).toHaveAttribute("aria-pressed", "true");

    // VWCE is EUR-native
    const vwceRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "VWCE" }) });
    const vwceInvested = await vwceRow.locator("td").nth(3).textContent();
    expect(vwceInvested).toContain("€");

    // MSFT is USD-native
    const msftRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "MSFT" }) });
    const msftInvested = await msftRow.locator("td").nth(3).textContent();
    expect(msftInvested).toContain("US$");
  });

  test("CA-08 show-closed › toggle visível, OFF por defeito", async ({ page }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechados"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    // Label visible
    await expect(page.getByText("Show closed")).toBeVisible();
  });

  test("CA-08 show-closed › OFF por defeito: TSLA e GLD não visíveis (4 linhas)", async ({ page }) => {
    await expect(page.locator("table tbody tr")).toHaveCount(4);

    // TSLA and GLD not in table
    await expect(
      page.locator("table tbody").getByText("TSLA", { exact: true })
    ).not.toBeVisible();
    await expect(
      page.locator("table tbody").getByText("GLD", { exact: true })
    ).not.toBeVisible();
  });

  test("CA-08 show-closed › ligar toggle mostra TSLA e GLD (6 linhas)", async ({ page }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechados"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await expect(page.locator("table tbody tr")).toHaveCount(6);

    // TSLA and GLD now visible
    const tslaRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "TSLA" }) });
    const gldRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "GLD" }) });

    await expect(tslaRow).toBeVisible();
    await expect(gldRow).toBeVisible();
  });

  test("CA-08 show-closed › TSLA e GLD mostram '—' na coluna Last 30 days", async ({ page }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechados"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    for (const ticker of ["TSLA", "GLD"]) {
      const row = page
        .locator("table tbody tr")
        .filter({ has: page.locator("span.font-semibold", { hasText: ticker }) });
      const spark30 = row.locator("td").nth(7);
      const text = await spark30.textContent();
      expect(text?.trim()).toBe("—");
    }
  });

  test("CA-08 show-closed › TSLA e GLD mostram '—' na coluna Holding Period", async ({ page }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechados"]');
    await toggle.click();

    for (const ticker of ["TSLA", "GLD"]) {
      const row = page
        .locator("table tbody tr")
        .filter({ has: page.locator("span.font-semibold", { hasText: ticker }) });
      const holdCell = row.locator("td").nth(2);
      const text = await holdCell.textContent();
      expect(text?.trim()).toBe("—");
    }
  });

  // ─── CA-09 — Sidebar e Navegação ─────────────────────────────────────────

  test("CA-09 sidebar › link Performance activo: aria-current=page e href=/performance", async ({ page }) => {
    const perfLink = page
      .locator("aside nav a")
      .filter({ hasText: "Performance" });
    await expect(perfLink).toBeVisible();
    await expect(perfLink).toHaveAttribute("href", "/performance");
    await expect(perfLink).toHaveAttribute("aria-current", "page");
  });

  test("CA-09 sidebar › Performance activo tem classes text-primary e border-primary", async ({ page }) => {
    const perfLink = page
      .locator("aside nav a")
      .filter({ hasText: "Performance" });
    const cls = await perfLink.getAttribute("class");
    expect(cls).toContain("text-primary");
    expect(cls).toContain("border-primary");
  });

  test("CA-09 sidebar › Transactions e Tax Calculator mantêm href=# e visual inactivo", async ({ page }) => {
    for (const label of ["Transactions", "Tax Calculator"]) {
      const item = page
        .locator("aside nav a, aside [href='#']")
        .filter({ hasText: label });
      await expect(item).toBeVisible();
      await expect(item).toHaveAttribute("href", "#");
    }
  });

  test("CA-09 sidebar › Dashboard e Holdings não têm aria-current=page em /performance", async ({ page }) => {
    for (const label of ["Dashboard", "Holdings"]) {
      const link = page.locator("aside nav a").filter({ hasText: label });
      await expect(link).toBeVisible();
      const ariaCurrent = await link.getAttribute("aria-current");
      expect(ariaCurrent).toBeNull();
    }
  });

  // ─── CA-10 — Design System e Animações ───────────────────────────────────

  test("CA-10 design › classe dark forçada no elemento <html>", async ({ page }) => {
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });

  test("CA-10 design › IBM Plex Mono configurada via CSS variable no body", async ({ page }) => {
    const fontVar = await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--font-ibm-plex-mono"));
    expect(fontVar.trim().length).toBeGreaterThan(0);
    expect(fontVar).toContain("IBM Plex Mono");
  });

  test("CA-10 design › h1 'Performance' renderiza sem erros JS", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/performance");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
    await expect(page.locator("h1", { hasText: "Performance" })).toBeVisible();
  });

  test("CA-10 design › classe rise + delay classes d1/d2/d3 presentes no DOM", async ({ page }) => {
    // Page head has d1, KPI strip has d2, trade card has d3
    const d1El = page.locator(".d1");
    const d2El = page.locator(".d2");
    const d3El = page.locator(".d3");

    await expect(d1El).toBeVisible();
    await expect(d2El).toBeVisible();
    await expect(d3El).toBeVisible();
  });

  // ─── CA-11 — Responsividade ──────────────────────────────────────────────

  test("CA-11 responsive › tabela tem overflow-x-auto para scroll horizontal", async ({ page }) => {
    const tableWrapper = page.locator(".overflow-x-auto");
    await expect(tableWrapper).toBeVisible();
  });

  test("CA-11 responsive › sidebar hidden em viewport mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/performance");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();
  });

  test("CA-11 responsive › KPI strip tem classes grid-cols-2, md:grid-cols-3, xl:grid-cols-5", async ({ page }) => {
    const kpiGrid = page.locator(".grid.grid-cols-2");
    const cls = await kpiGrid.getAttribute("class");
    expect(cls).toContain("grid-cols-2");
    expect(cls).toContain("md:grid-cols-3");
    expect(cls).toContain("xl:grid-cols-5");
  });
});
