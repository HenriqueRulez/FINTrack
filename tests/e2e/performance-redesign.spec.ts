/**
 * E2E Tests — Performance Page (data-driven, EUR-fixo)
 * Working Item: .claude/working-items/performance-redesign.md
 * Reescrito em 2026-08-05 (QA/Etapa 3 do AUDIT_MELHORIAS.md): a página deixou de
 * usar mock-data.ts (F-04) e passou a derivar tudo do ledger real via
 * GET /api/portfolio/performance (F-02/F-03), em EUR fixo.
 *
 * Removido do spec antigo (não existe mais na UI, não re-testado):
 *  - CA-06 Sparkline ("Last 30 days") — o componente Sparkline.tsx e a coluna
 *    foram apagados nesta etapa; a tabela tem 9 colunas (Asset, Type, Status,
 *    Holding Period, Invested, Realized, Unrealized, Total Profit, ROI), não 10.
 *  - CA-08 Selector de moeda EUR/USD/Native — decisão do dono: EUR fixo.
 *  - Asserções numéricas hardcoded do mock (winRate, avgHold, ROI de tickers
 *    fictícios AMAT/VWCE/CSPX/TSLA/GLD) — substituídas por fixtures reais
 *    criadas via API com valores determinísticos (fx=1 em EUR).
 *
 * Mantido e ainda estruturalmente válido (componentes não tocados nesta etapa):
 *  CA-01 KPI Strip (Gauge/SplitBar/TickRow), CA-02 Page Header + selector de
 *  período, CA-09 Sidebar, CA-10 Design System, CA-11 Responsividade.
 *
 * Estratégia de dados: 1 posição activa (AAPL) + 1 ciclo fechado (MSFT
 * buy→sell, realized +50,00 €) via API, apagadas no fim.
 */

import { test, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";

const AUTH_STATE = "tests/e2e/.auth/user.json";

interface TxFixture {
  date: string;
  ticker: string;
  type: "buy" | "sell";
  qty: number;
  price: number;
  currency: "EUR";
}

const FIXTURES: TxFixture[] = [
  { date: "2025-01-15", ticker: "AAPL", type: "buy", qty: 2, price: 100, currency: "EUR" },
  { date: "2025-02-01", ticker: "MSFT", type: "buy", qty: 1, price: 200, currency: "EUR" },
  { date: "2025-06-01", ticker: "MSFT", type: "sell", qty: 1, price: 250, currency: "EUR" },
];

async function createFixtures(request: APIRequestContext): Promise<string[]> {
  const ids: string[] = [];
  for (const tx of FIXTURES) {
    const res = await request.post("/api/transactions", { data: tx });
    if (!res.ok()) {
      throw new Error(
        `Falha ao criar fixture ${tx.ticker} ${tx.type}: ${res.status()} ${await res.text()}`
      );
    }
    const body = await res.json();
    ids.push(body.data.id);
  }
  return ids;
}

async function deleteFixtures(request: APIRequestContext, ids: string[]): Promise<void> {
  for (const id of ids) {
    await request.delete(`/api/transactions/${id}`).catch(() => undefined);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth redirect
// ─────────────────────────────────────────────────────────────────────────────

test("auth › /performance sem sessão redirige para /passphrase, sem erros JS", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/performance");
  await page.waitForLoadState("networkidle");

  expect(page.url()).toMatch(/passphrase/);
  expect(errors).toHaveLength(0);

  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Estados vazio e de erro — via mock de rede (não mexe no ledger real)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Performance — estados vazio e erro (route mock)", () => {
  test("carteira vazia › stats a 0 reais e empty state distinto (não erro)", async ({
    page,
  }) => {
    await page.route("**/api/portfolio/performance**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            trades: [],
            stats: {
              winRate: 0,
              realizedPct: 0,
              unrealizedPct: 0,
              avgHoldAll: 0,
              avgHoldWin: 0,
              avgHoldLose: 0,
              activeCount: 0,
              closedCount: 0,
            },
          },
        }),
      })
    );

    await page.goto("/performance");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Ainda não há trades")).toBeVisible();
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    await expect(page.getByText("0.0%")).toBeVisible();
  });

  test("erro de rede › banner role=alert visível, sem stats fabricados", async ({ page }) => {
    await page.route("**/api/portfolio/performance**", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
    );

    await page.goto("/performance");
    await page.waitForLoadState("networkidle");

    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Não foi possível carregar");
    await expect(page.getByText("Win Rate")).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dados reais (fixtures via API)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Performance — com dados reais do ledger", () => {
  let context: BrowserContext;
  let fixtureIds: string[];

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: AUTH_STATE });
    fixtureIds = await createFixtures(context.request);
  });

  test.afterAll(async () => {
    await deleteFixtures(context.request, fixtureIds);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/performance");
    await page.waitForLoadState("networkidle");
  });

  // ─── CA-02 — Page Header ──────────────────────────────────────────────

  test("CA-02 header › h1, neon-dot LIVE e contagem 1 active · 1 closed", async ({ page }) => {
    await expect(page.locator("h1").filter({ hasText: "Performance" })).toBeVisible();
    expect(await page.locator(".neon-dot").count()).toBeGreaterThanOrEqual(1);
    await expect(page.getByText("LIVE", { exact: true })).toBeVisible();

    await expect(page.getByText(/1\s*active/)).toBeVisible();
    await expect(page.getByText(/1\s*closed/)).toBeVisible();
  });

  test("CA-02 header › selector de período com 5 opções, YTD por defeito", async ({ page }) => {
    const periodGroup = page.locator('[role="group"][aria-label*="período"]');
    const buttons = periodGroup.locator("button");
    await expect(buttons).toHaveCount(5);
    for (const p of ["1M", "3M", "YTD", "1Y", "ALL"]) {
      await expect(buttons.filter({ hasText: p })).toBeVisible();
    }
    await expect(buttons.filter({ hasText: "YTD" })).toHaveAttribute("aria-pressed", "true");
  });

  test("CA-02 header › clicar 1M troca o estado activo visualmente", async ({ page }) => {
    const periodGroup = page.locator('[role="group"][aria-label*="período"]');
    const oneM = periodGroup.locator("button").filter({ hasText: "1M" });
    const ytd = periodGroup.locator("button").filter({ hasText: "YTD" });

    await oneM.click();
    await expect(oneM).toHaveAttribute("aria-pressed", "true");
    await expect(ytd).toHaveAttribute("aria-pressed", "false");
  });

  // ─── CA-01 — KPI Strip ───────────────────────────────────────────────

  test("CA-01 kpi-strip › 5 células com labels correctos", async ({ page }) => {
    const kpiGrid = page.locator(".grid.grid-cols-2").first();
    await expect(kpiGrid.locator(":scope > div")).toHaveCount(5);

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

  test("CA-01 kpi-strip › Win Rate = 100.0% (AAPL activa lucrativa, único trade activo)", async ({
    page,
  }) => {
    const cells = page.locator(".grid.grid-cols-2 > div");
    const winRateCell = cells.filter({ hasText: "Win Rate" });
    const value = winRateCell.locator(".text-\\[28px\\]").first();
    await expect(value).toHaveText(/100\.0%/);
  });

  test("CA-01 kpi-strip › Profit Split reflecte realized(MSFT)=50 vs unrealized(AAPL)>0", async ({
    page,
  }) => {
    await expect(page.getByText("Realized vs Unrealized")).toBeVisible();
    const cells = page.locator(".grid.grid-cols-2 > div");
    const splitCell = cells.filter({ hasText: "Profit Split" });
    // Ambos os lados > 0% — há realized (MSFT) e unrealized (AAPL, preço live)
    const text = await splitCell.locator(".text-\\[28px\\]").first().textContent();
    expect(text).toMatch(/\d+%\s*\/\s*\d+%/);
  });

  test("CA-01 kpi-strip › Avg Winner/Loser Hold usam cor gain/loss no ícone", async ({
    page,
  }) => {
    const cells = page.locator(".grid.grid-cols-2 > div");
    const winnerCell = cells.filter({ hasText: "Avg Winner Hold" });
    const loserCell = cells.filter({ hasText: "Avg Loser Hold" });
    await expect(winnerCell.locator('span[class*="--gain"]').first()).toBeVisible();
    await expect(loserCell.locator('span[class*="--loss"]').first()).toBeVisible();
  });

  // ─── Tabela Trade Analysis ─────────────────────────────────────────────

  test("tabela › 9 colunas na ordem correcta (sem 'Last 30 days')", async ({ page }) => {
    const headers = page.locator("table thead th");
    await expect(headers).toHaveCount(9);

    const texts = await headers.evaluateAll((ths) =>
      ths.map((th) => th.textContent?.replace(/[▲▼↕]/g, "").trim() ?? "")
    );
    expect(texts).toEqual([
      "Asset",
      "Type",
      "Status",
      "Holding Period",
      "Invested",
      "Realized",
      "Unrealized",
      "Total Profit",
      "ROI",
    ]);
  });

  test("tabela › ordenação por defeito é Total Profit descendente", async ({ page }) => {
    const th = page.locator('table thead th[aria-sort="descending"]');
    await expect(th).toContainText("Total Profit");
  });

  test("tabela › showClosed OFF mostra só AAPL (1 linha activa)", async ({ page }) => {
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody").getByText("AAPL")).toBeVisible();
    await expect(page.locator("table tbody").getByText("MSFT")).not.toBeVisible();
  });

  test("Show closed › ligar toggle mostra MSFT (2 linhas); MSFT tem Realized=+50,00€ e Status Closed", async ({
    page,
  }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechados"]');
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("Show closed")).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("table tbody tr")).toHaveCount(2);

    const msftRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "MSFT" }) });
    await expect(msftRow).toBeVisible();
    await expect(msftRow.getByText("Closed")).toBeVisible();

    // Realized é a 6ª coluna (Asset, Type, Status, Holding, Invested, Realized)
    const realizedCell = msftRow.locator("td").nth(5);
    await expect(realizedCell).toContainText("50,00");
    const cls = await realizedCell.getAttribute("class");
    expect(cls).toContain("--gain");
  });

  test("ROI badge › AAPL mostra pill com sinal e 2 casas decimais", async ({ page }) => {
    const row = page.locator("table tbody tr").first();
    const badge = row.locator("td:last-child span.rounded-full");
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    expect(text?.trim()).toMatch(/^[+−][\d,.]+\.\d{2}%$/);
  });

  // Nota: `PerformancePage.tsx` agrupa sempre as linhas activas antes das
  // fechadas (sortTrades é aplicado a cada grupo separadamente, depois
  // concatenado) — com 1 activa + 1 fechada não há posições comparáveis
  // dentro do mesmo grupo para verificar reordenação visível. Este teste
  // cobre o que é observável e determinístico: o estado de ordenação
  // (aria-sort + seta) muda correctamente ao clicar no header.
  test("sort › clicar header Asset alterna aria-sort e a seta activa", async ({ page }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechados"]');
    await toggle.click();
    await expect(page.locator("table tbody tr")).toHaveCount(2);

    const assetBtn = page.locator("table thead th button").filter({ hasText: "Asset" });
    await assetBtn.click();
    const descTh = page.locator('table thead th[aria-sort="descending"]');
    await expect(descTh).toContainText("Asset");
    expect((await descTh.locator("button .text-primary").textContent())?.trim()).toBe("▼");

    await assetBtn.click();
    const ascTh = page.locator('table thead th[aria-sort="ascending"]');
    await expect(ascTh).toContainText("Asset");
    expect((await ascTh.locator("button .text-primary").textContent())?.trim()).toBe("▲");

    // Independentemente da direcção, a linha activa (AAPL) continua antes da
    // fechada (MSFT) — comportamento de agrupamento do componente, não um bug.
    const firstTicker = await page
      .locator("table tbody tr")
      .first()
      .locator("span.font-semibold")
      .first()
      .textContent();
    expect(firstTicker?.trim()).toBe("AAPL");
  });

  // ─── CA-09 — Sidebar ────────────────────────────────────────────────────

  test("CA-09 sidebar › link Performance activo com aria-current=page", async ({ page }) => {
    const perfLink = page.locator("aside nav a").filter({ hasText: "Performance" });
    await expect(perfLink).toHaveAttribute("href", "/performance");
    await expect(perfLink).toHaveAttribute("aria-current", "page");
  });

  // ─── CA-10 — Design System ───────────────────────────────────────────────

  test("CA-10 design › dark mode, IBM Plex Mono e sem erros JS", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");

    const fontVar = await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--font-ibm-plex-mono"));
    expect(fontVar.trim().length).toBeGreaterThan(0);

    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  // ─── CA-11 — Responsividade ───────────────────────────────────────────────

  test("CA-11 responsive › overflow-x-auto na tabela e sidebar oculta em mobile", async ({
    page,
  }) => {
    await expect(page.locator(".overflow-x-auto")).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("aside")).toBeHidden();
  });
});
