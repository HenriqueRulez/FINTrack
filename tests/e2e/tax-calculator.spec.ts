/**
 * E2E Tests — Tax Calculator (Phase 1: visual + mock, no API)
 * Working Item: .claude/working-items/tax-calculator.md
 *
 * CAs verified (functional / Playwright — visual CAs covered by Chrome Extension):
 *  CA-01 — Page Header: h1, help icon (title), Tax Year chip (2026 default), year switch updates "Sum for {year}" + empty texts
 *  CA-02 — KPI Strip: 3 cards, sample OFF → €0.00 / From 0 events, sample ON 2026 → €219.16 / €207.57 / €11.59, neon-loss conditional
 *  CA-03 — Capital Gains panel: title, seg selector Aggregate default, switching changes content
 *  CA-04 — Capital Gains Aggregate: 4 rows + reference values
 *  CA-05 — Capital Gains Detailed: 6-column table, 4 rows
 *  CA-06 — Dividend Tax panel: badge 28% rate, 3 agg rows + 4-col table, reference values
 *  CA-07 — Empty states: sample OFF → "No taxable sales found" / "No dividend income found"
 *  CA-08 — TweaksPanel: Show sample data toggle (OFF default), CG view radio synced with seg selector
 *  CA-09 — Sidebar/Nav: Tax Calculator active (aria-current=page, href=/tax-calculator), auth redirect
 *  CA-10 — Design System: dark mode, IBM Plex Mono, rise d1/d2/d3, U+2212 negative sign
 *  CA-11 — Responsiveness: sidebar hidden mobile, KPI/panel grid responsive classes, table overflow-x
 */

import { test, expect, type Page } from "@playwright/test";

// Helper: open the floating tweaks panel and toggle "Show sample data" ON.
async function enableSampleData(page: Page) {
  const fab = page.locator('button[aria-label="Open tweaks panel"]');
  await fab.click();
  const toggle = page.locator('[role="switch"][aria-label="Show sample data"]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
}

// ─────────────────────────────────────────────────────────────────────────────
// CA-09 — Auth redirect (unauthenticated context, no storageState)
// ─────────────────────────────────────────────────────────────────────────────

test("CA-09 auth › /tax-calculator sem sessão redirige para /passphrase", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // contexto limpo, sem auth
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/tax-calculator");
  await page.waitForLoadState("networkidle");

  expect(page.url()).toMatch(/passphrase/);
  expect(errors).toHaveLength(0);

  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated tests (storageState from playwright.config.ts)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Tax Calculator — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tax-calculator");
    await page.waitForLoadState("networkidle");
  });

  // ─── CA-09 — page loads with session, no JS errors ────────────────────────

  test("CA-09 › página carrega com sessão sem erros JS", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/tax-calculator");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toMatch(/tax-calculator/);
    await expect(page.locator("h1", { hasText: "Tax Calculator" })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("CA-09 › sem chamadas de rede a API/Supabase/Yahoo ao carregar (mock client-side)", async ({
    page,
  }) => {
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      const u = req.url();
      if (/\/api\/|supabase|yahoo|anthropic/i.test(u)) apiCalls.push(u);
    });
    await page.goto("/tax-calculator");
    await page.waitForLoadState("networkidle");
    expect(apiCalls).toHaveLength(0);
  });

  // ─── CA-01 — Page Header ──────────────────────────────────────────────────

  test("CA-01 header › h1 'Tax Calculator' visível", async ({ page }) => {
    await expect(page.locator("h1").filter({ hasText: "Tax Calculator" })).toBeVisible();
  });

  test("CA-01 header › ícone de ajuda com title='How is this calculated?'", async ({ page }) => {
    const help = page.locator('button[title="How is this calculated?"]');
    await expect(help).toBeVisible();
    await expect(help).toHaveAttribute("aria-label", "How is this calculated?");
  });

  test("CA-01 header › label 'Tax Year:' e chip select com 2026 por defeito", async ({ page }) => {
    await expect(page.getByText("Tax Year:", { exact: true })).toBeVisible();
    const select = page.locator('select[aria-label="Tax Year"]');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue("2026");
    const options = await select.locator("option").allTextContents();
    expect(options.map((o) => o.trim())).toEqual(["2026", "2025", "2024"]);
  });

  test("CA-01 header › 'Sum for 2026' por defeito no cartão principal", async ({ page }) => {
    await expect(page.getByText("Sum for 2026", { exact: true })).toBeVisible();
  });

  test("CA-01 header › trocar ano para 2025 actualiza 'Sum for {year}' e estados vazios", async ({
    page,
  }) => {
    const select = page.locator('select[aria-label="Tax Year"]');
    await select.selectOption("2025");

    await expect(page.getByText("Sum for 2025", { exact: true })).toBeVisible();
    await expect(
      page.getByText("No taxable sales found for 2025", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("No dividend income found for 2025", { exact: true })
    ).toBeVisible();
  });

  // ─── CA-02 — KPI Strip ────────────────────────────────────────────────────

  test("CA-02 kpi › 3 cartões em grid 1.4fr 1fr 1fr", async ({ page }) => {
    const strip = page.locator(".grid.grid-cols-\\[1\\.4fr_1fr_1fr\\]");
    await expect(strip).toBeVisible();
    await expect(strip.locator(":scope > div")).toHaveCount(3);
  });

  test("CA-02 kpi › labels dos 3 cartões", async ({ page }) => {
    for (const label of [
      "Total Estimated Tax Liability",
      "Capital Gains Tax",
      "Dividend Tax",
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("CA-02 kpi › sample OFF (default): 3 KPIs €0.00, 'From 0 sale events' / 'From 0 dividend events', sem neon-loss", async ({
    page,
  }) => {
    const strip = page.locator(".grid.grid-cols-\\[1\\.4fr_1fr_1fr\\]");
    const cards = strip.locator(":scope > div");

    // Each card value (text-[32px]) is €0.00
    for (let i = 0; i < 3; i++) {
      const val = cards.nth(i).locator(".text-\\[32px\\]");
      await expect(val).toHaveText("€0.00");
    }

    await expect(page.getByText("From 0 sale events", { exact: true })).toBeVisible();
    await expect(page.getByText("From 0 dividend events", { exact: true })).toBeVisible();

    // Liability value has no neon-loss when 0
    const liabilityValue = cards.nth(0).locator(".text-\\[32px\\]");
    const cls = await liabilityValue.getAttribute("class");
    expect(cls).not.toContain("neon-loss");
  });

  test("CA-02 kpi › sample ON + 2026: €219.16 / €207.57 / €11.59 e neon-loss no liability", async ({
    page,
  }) => {
    await enableSampleData(page);

    const strip = page.locator(".grid.grid-cols-\\[1\\.4fr_1fr_1fr\\]");
    const cards = strip.locator(":scope > div");

    await expect(cards.nth(0).locator(".text-\\[32px\\]")).toHaveText("€219.16");
    await expect(cards.nth(1).locator(".text-\\[32px\\]")).toHaveText("€207.57");
    await expect(cards.nth(2).locator(".text-\\[32px\\]")).toHaveText("€11.59");

    // neon-loss now applied to liability value
    const cls = await cards.nth(0).locator(".text-\\[32px\\]").getAttribute("class");
    expect(cls).toContain("neon-loss");

    // sub-texts plural counts
    await expect(page.getByText("From 4 sale events", { exact: true })).toBeVisible();
    await expect(page.getByText("From 3 dividend events", { exact: true })).toBeVisible();
  });

  test("CA-02 kpi › sample ON mas ano 2025: KPIs voltam a €0.00 (só há mock para 2026)", async ({
    page,
  }) => {
    await enableSampleData(page);
    await page.locator('select[aria-label="Tax Year"]').selectOption("2025");

    const strip = page.locator(".grid.grid-cols-\\[1\\.4fr_1fr_1fr\\]");
    const cards = strip.locator(":scope > div");
    for (let i = 0; i < 3; i++) {
      await expect(cards.nth(i).locator(".text-\\[32px\\]")).toHaveText("€0.00");
    }
  });

  // ─── CA-03 / CA-04 / CA-05 — Capital Gains panel ──────────────────────────

  test("CA-03 cg › título 'Capital Gains' e seg selector Aggregate por defeito", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Capital Gains" })).toBeVisible();

    const seg = page.locator('[role="group"][aria-label="Capital gains view"]');
    await expect(seg).toBeVisible();
    const agg = seg.locator("button").filter({ hasText: "Aggregate" });
    const det = seg.locator("button").filter({ hasText: "Detailed" });
    await expect(agg).toHaveAttribute("aria-pressed", "true");
    await expect(det).toHaveAttribute("aria-pressed", "false");
  });

  test("CA-04 cg-aggregate › sample ON: 4 linhas com valores de referência", async ({ page }) => {
    await enableSampleData(page);

    // The four aggregate labels are present
    for (const label of [
      "Total proceeds",
      "Total cost basis",
      "Net realised gain",
      "Capital gains tax due",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    // Reference values
    await expect(page.getByText("€5,559.77", { exact: true })).toBeVisible();
    await expect(page.getByText("€5,190.00", { exact: true })).toBeVisible();
    // Net realised gain signed with U+2212-aware "+"
    await expect(page.getByText("+€369.77", { exact: true })).toBeVisible();
    // Capital gains tax due — €207.57 (also appears in KPI; at least one visible here)
    await expect(page.getByText("€207.57").first()).toBeVisible();
    // tier-weighted suffix
    await expect(page.getByText("tier-weighted", { exact: true })).toBeVisible();
  });

  test("CA-05 cg-detailed › trocar para Detailed mostra tabela 6 colunas + 4 linhas", async ({
    page,
  }) => {
    await enableSampleData(page);

    const seg = page.locator('[role="group"][aria-label="Capital gains view"]');
    await seg.locator("button").filter({ hasText: "Detailed" }).click();

    // Find the Capital Gains table (caption distinguishes it)
    const cgTable = page.locator("table", {
      has: page.locator("caption", { hasText: "Capital gains by sale event" }),
    });
    await expect(cgTable).toBeVisible();

    const headers = await cgTable.locator("thead th").allTextContents();
    expect(headers.map((h) => h.trim())).toEqual([
      "Date",
      "Asset",
      "Hold",
      "Gain",
      "Rate",
      "Tax",
    ]);

    await expect(cgTable.locator("tbody tr")).toHaveCount(4);

    // A known row: TSLA gain +€85.86, hold 1.2y, rate 28.0%, tax €24.04
    const tslaRow = cgTable.locator("tbody tr").filter({ hasText: "TSLA" });
    await expect(tslaRow).toContainText("12/03/2026");
    await expect(tslaRow).toContainText("1.2y");
    await expect(tslaRow).toContainText("28.0%");
    await expect(tslaRow).toContainText("+€85.86");
    await expect(tslaRow).toContainText("€24.04");

    // AAPL is a loss → gain shown with U+2212 sign, tax €0.00
    const aaplRow = cgTable.locator("tbody tr").filter({ hasText: "AAPL" });
    await expect(aaplRow).toContainText("−€520.00");
  });

  // ─── CA-06 — Dividend Tax panel ───────────────────────────────────────────

  test("CA-06 div › título, badge '28% rate', 3 agg rows + tabela 4 colunas (sample ON)", async ({
    page,
  }) => {
    await enableSampleData(page);

    await expect(page.getByRole("heading", { name: "Dividend Tax" })).toBeVisible();
    await expect(page.getByText("28% rate", { exact: true })).toBeVisible();

    for (const label of [
      "Total dividends received",
      "Dividend tax due",
      "Net dividend income",
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    // Reference values
    await expect(page.getByText("+€41.40", { exact: true })).toBeVisible();
    await expect(page.getByText("€11.59").first()).toBeVisible();
    await expect(page.getByText("€29.81", { exact: true })).toBeVisible();

    const divTable = page.locator("table", {
      has: page.locator("caption", { hasText: "Dividend income by event" }),
    });
    await expect(divTable).toBeVisible();
    const headers = await divTable.locator("thead th").allTextContents();
    expect(headers.map((h) => h.trim())).toEqual(["Date", "Asset", "Amount", "Tax"]);
    await expect(divTable.locator("tbody tr")).toHaveCount(3);
  });

  // ─── CA-07 — Empty states ─────────────────────────────────────────────────

  test("CA-07 empty › sample OFF (default): ambos os painéis em estado vazio para 2026", async ({
    page,
  }) => {
    await expect(
      page.getByText("No taxable sales found for 2026", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("No dividend income found for 2026", { exact: true })
    ).toBeVisible();
  });

  // ─── CA-08 — TweaksPanel ──────────────────────────────────────────────────

  test("CA-08 tweaks › título 'Tax Calculator · Tweaks', toggle OFF por defeito", async ({
    page,
  }) => {
    const fab = page.locator('button[aria-label="Open tweaks panel"]');
    await expect(fab).toBeVisible();
    await fab.click();

    await expect(page.getByText("Tax Calculator · Tweaks", { exact: true })).toBeVisible();
    const toggle = page.locator('[role="switch"][aria-label="Show sample data"]');
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("CA-08 tweaks › ligar/desligar 'Show sample data' actualiza KPIs sem reload", async ({
    page,
  }) => {
    const strip = page.locator(".grid.grid-cols-\\[1\\.4fr_1fr_1fr\\]");
    const liability = strip.locator(":scope > div").nth(0).locator(".text-\\[32px\\]");

    await expect(liability).toHaveText("€0.00");

    await enableSampleData(page);
    await expect(liability).toHaveText("€219.16");

    // Toggle OFF again
    const toggle = page.locator('[role="switch"][aria-label="Show sample data"]');
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(liability).toHaveText("€0.00");
  });

  test("CA-08 tweaks › radio 'Capital Gains view' sincronizado com seg selector do painel", async ({
    page,
  }) => {
    const fab = page.locator('button[aria-label="Open tweaks panel"]');
    await fab.click();

    const tweakGroup = page.locator('[role="group"][aria-label="Capital Gains view"]');
    const panelSeg = page.locator('[role="group"][aria-label="Capital gains view"]');

    const tweakAgg = tweakGroup.locator("button").filter({ hasText: "Aggregate" });
    const tweakDet = tweakGroup.locator("button").filter({ hasText: "Detailed" });
    const panelAgg = panelSeg.locator("button").filter({ hasText: "Aggregate" });
    const panelDet = panelSeg.locator("button").filter({ hasText: "Detailed" });

    // Both aggregate initially
    await expect(tweakAgg).toHaveAttribute("aria-pressed", "true");
    await expect(panelAgg).toHaveAttribute("aria-pressed", "true");

    // Change via tweaks → reflects on panel seg
    await tweakDet.click();
    await expect(tweakDet).toHaveAttribute("aria-pressed", "true");
    await expect(panelDet).toHaveAttribute("aria-pressed", "true");

    // Change via panel seg → reflects on tweaks
    await panelAgg.click();
    await expect(panelAgg).toHaveAttribute("aria-pressed", "true");
    await expect(tweakAgg).toHaveAttribute("aria-pressed", "true");
  });

  // ─── CA-09 — Sidebar e Navegação ──────────────────────────────────────────

  test("CA-09 sidebar › link Tax Calculator activo: aria-current=page, href=/tax-calculator", async ({
    page,
  }) => {
    const link = page.locator("aside nav a").filter({ hasText: "Tax Calculator" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/tax-calculator");
    await expect(link).toHaveAttribute("aria-current", "page");
    const cls = await link.getAttribute("class");
    expect(cls).toContain("text-primary");
    expect(cls).toContain("border-primary");
  });

  test("CA-09 sidebar › Dashboard não tem aria-current=page em /tax-calculator", async ({
    page,
  }) => {
    const dash = page.locator("aside nav a").filter({ hasText: "Dashboard" });
    await expect(dash).toBeVisible();
    expect(await dash.getAttribute("aria-current")).toBeNull();
  });

  // ─── CA-10 — Design System e Animações ────────────────────────────────────

  test("CA-10 design › classe dark forçada no <html>", async ({ page }) => {
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });

  test("CA-10 design › IBM Plex Mono via CSS variable no body", async ({ page }) => {
    const fontVar = await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--font-ibm-plex-mono"));
    expect(fontVar).toContain("IBM Plex Mono");
  });

  test("CA-10 design › classes rise d1/d2/d3 presentes no DOM", async ({ page }) => {
    await expect(page.locator(".d1")).toBeVisible();
    await expect(page.locator(".d2")).toBeVisible();
    await expect(page.locator(".d3")).toBeVisible();
  });

  test("CA-10 design › sinal negativo usa U+2212 (não hífen) — AAPL gain", async ({ page }) => {
    await enableSampleData(page);
    const seg = page.locator('[role="group"][aria-label="Capital gains view"]');
    await seg.locator("button").filter({ hasText: "Detailed" }).click();

    const aaplRow = page.locator("tbody tr").filter({ hasText: "AAPL" });
    const text = await aaplRow.textContent();
    expect(text).toContain("−"); // U+2212
    expect(text).not.toMatch(/-€/); // never hyphen-minus before €
  });

  // ─── CA-11 — Responsividade ───────────────────────────────────────────────

  test("CA-11 responsive › KPI strip tem grid-cols-[1.4fr_1fr_1fr] + breakpoints", async ({
    page,
  }) => {
    const strip = page.locator(".grid.grid-cols-\\[1\\.4fr_1fr_1fr\\]");
    const cls = await strip.getAttribute("class");
    expect(cls).toContain("grid-cols-[1.4fr_1fr_1fr]");
    expect(cls).toContain("max-[1100px]:grid-cols-2");
    expect(cls).toContain("max-[700px]:grid-cols-1");
  });

  test("CA-11 responsive › panel grid 2 colunas → 1 em ≤1100px", async ({ page }) => {
    const panelGrid = page.locator("section.grid.grid-cols-2.max-\\[1100px\\]\\:grid-cols-1");
    await expect(panelGrid).toBeVisible();
  });

  test("CA-11 responsive › tabelas têm overflow-x-auto (sample ON)", async ({ page }) => {
    await enableSampleData(page);
    const wrappers = page.locator(".overflow-x-auto");
    expect(await wrappers.count()).toBeGreaterThanOrEqual(1);
  });

  test("CA-11 responsive › sidebar oculta em viewport mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/tax-calculator");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("aside")).toBeHidden();
  });
});
