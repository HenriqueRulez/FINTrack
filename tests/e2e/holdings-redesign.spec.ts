/**
 * E2E Tests — Holdings Page (data-driven, EUR-fixo)
 * Working Item: .claude/working-items/holdings-redesign.md
 * Reescrito em 2026-08-05 (QA/Etapa 3 do AUDIT_MELHORIAS.md): a página deixou de
 * usar mock-data.ts (F-04) e passou a derivar tudo do ledger real via
 * GET /api/portfolio/holdings (F-02/F-03), em EUR fixo (sem selector de moeda).
 *
 * Removido do spec antigo (não existe mais na UI, não re-testado):
 *  - CA-05 Selector de moeda EUR/USD/Native — decisão do dono: EUR fixo, sem toggle.
 *  - "Cash" como 7º KPI — nunca foi um dado real (F-04); o KPI strip agora tem 5
 *    células reais: Holdings Value, Unrealized P/L, Realized P/L, Total P/L, Holdings.
 *  - Ícone "1ª letra + AllocPill com barra de alocação" tal como descrito no CA-03
 *    antigo — a CompanyCell actual (src/components/holdings/CompanyCell.tsx) ainda
 *    tem o placeholder 32×32 + barra de alocação, mantido abaixo.
 *
 * Estratégia de dados: cria 1 posição activa (AAPL) + 1 ciclo fechado (MSFT
 * buy→sell) via API antes dos testes, e apaga tudo no fim — não depende do
 * estado real do ledger do dono nem o polui.
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
  fee?: number;
}

// AAPL fica activa (não vendida) — custo determinístico (EUR, fx=1 sempre).
// MSFT compra+venda fecha o ciclo com realized P&L determinístico (+50,00 €).
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
// Auth redirect (unauthenticated context, no storageState)
// ─────────────────────────────────────────────────────────────────────────────

test("auth › /holdings sem sessão redirige para /passphrase, sem erros JS", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/holdings");
  await page.waitForLoadState("networkidle");

  expect(page.url()).toMatch(/passphrase/);
  expect(errors).toHaveLength(0);

  await ctx.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Estado vazio e estado de erro — via mock de rede (não mexe no ledger real)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Holdings — estados vazio e erro (route mock)", () => {
  test("carteira vazia › KPIs a 0 reais e empty state distinto (não erro)", async ({
    page,
  }) => {
    await page.route("**/api/portfolio/holdings**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            positions: [],
            kpis: {
              totalValueEur: 0,
              holdingsValueEur: 0,
              unrealizedEur: 0,
              realizedEur: 0,
              totalPlEur: 0,
              activeCount: 0,
              soldCount: 0,
              hasPriceGaps: false,
            },
          },
        }),
      })
    );

    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Ainda não há posições")).toBeVisible();
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    await expect(kpiStrip.getByText(/0,00\s*€/).first()).toBeVisible();
  });

  test("erro de rede › banner role=alert visível, sem €0,00 falso", async ({ page }) => {
    await page.route("**/api/portfolio/holdings**", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
    );

    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");

    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Não foi possível carregar");
    // Sem KPI strip fabricado nesta rota de erro (falha no 1º load)
    await expect(page.locator('[role="region"][aria-label*="KPI"]')).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dados reais (fixtures via API) — 1 activa (AAPL) + 1 fechada (MSFT)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Holdings — com dados reais do ledger", () => {
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
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");
  });

  test("KPI strip › 5 células com labels correctos e valores EUR", async ({ page }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    await expect(kpiStrip).toBeVisible();
    await expect(kpiStrip.locator(":scope > div")).toHaveCount(5);

    for (const label of [
      "Holdings Value",
      "Unrealized P/L",
      "Realized P/L",
      "Total P/L",
      "Holdings",
    ]) {
      await expect(kpiStrip.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("KPI strip › Realized P/L reflecte o ciclo MSFT fechado (+50,00 €) com cor gain", async ({
    page,
  }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    const realizedCell = kpiStrip.locator(":scope > div").filter({
      has: page.getByText("Realized P/L", { exact: true }),
    });
    await expect(realizedCell).toContainText("50,00");

    const valueEl = realizedCell.locator(".tabular-nums").first();
    const cls = await valueEl.getAttribute("class");
    expect(cls).toContain("--gain");
  });

  test("KPI strip › Holdings mostra 1 posição activa", async ({ page }) => {
    const kpiStrip = page.locator('[role="region"][aria-label*="KPI"]');
    const holdingsCell = kpiStrip.locator(":scope > div").filter({
      has: page.getByText("Holdings", { exact: true }),
    });
    await expect(holdingsCell.locator(".tabular-nums")).toHaveText("1");
  });

  test("tabela › 9 colunas na ordem correcta", async ({ page }) => {
    const headers = page.locator("table thead th");
    await expect(headers).toHaveCount(9);

    const expected = [
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
    const texts = await headers.evaluateAll((ths) =>
      ths.map((th) => th.textContent?.replace(/[▲▼↕]/g, "").trim() ?? "")
    );
    expect(texts).toEqual(expected);
  });

  test("tabela › AAPL activa visível por defeito; MSFT fechada oculta (showSold OFF)", async ({
    page,
  }) => {
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(
      page.locator("table tbody").getByText("AAPL", { exact: true })
    ).toBeVisible();
    await expect(
      page.locator("table tbody").getByText("MSFT", { exact: true })
    ).not.toBeVisible();
  });

  test("tabela › AAPL mostra Shares=2, Avg Cost=100,00 €, Total Invested=200,00 €, Portfolio%=100.0%", async ({
    page,
  }) => {
    const row = page.locator("table tbody tr").first();
    await expect(row.locator("td").nth(2)).toHaveText("100.0%");
    await expect(row.locator("td").nth(3)).toHaveText("2");
    await expect(row.locator("td").nth(4)).toContainText("100,00");
    await expect(row.locator("td").nth(5)).toContainText("200,00");
  });

  test("tabela › Company cell mostra ticker, moeda EUR e nome", async ({ page }) => {
    const row = page.locator("table tbody tr").first();
    await expect(row.locator("span.font-semibold").first()).toHaveText("AAPL");
    await expect(row.getByText("| EUR")).toBeVisible();
  });

  test("tabela › Type badge mostra 'Stock' para AAPL", async ({ page }) => {
    const row = page.locator("table tbody tr").first();
    await expect(row.locator("td").nth(1)).toHaveText("Stock");
  });

  test("Show sold › toggle OFF por defeito; ligar mostra MSFT com opacity 0.55 e refaz o fetch", async ({
    page,
  }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechadas"]');
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    const reqPromise = page.waitForResponse((r) =>
      r.url().includes("/api/portfolio/holdings") && r.url().includes("showSold=true")
    );
    await toggle.click();
    await reqPromise;

    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("table tbody tr")).toHaveCount(2);

    const msftRow = page
      .locator("table tbody tr")
      .filter({ has: page.locator("span.font-semibold", { hasText: "MSFT" }) });
    await expect(msftRow).toBeVisible();
    const opacity = await msftRow.evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("0.55");

    // Posição fechada — Portfolio% e Shares mostram valores neutros
    await expect(msftRow.locator("td").nth(2)).toHaveText("—");

    // MSFT: realized 50,00 € com cor gain no Total Gain/Loss
    const gainCell = msftRow.locator("td").last();
    await expect(gainCell).toContainText("50,00");
    const gainSpan = gainCell.locator("span.font-medium.tabular-nums");
    const cls = await gainSpan.getAttribute("class");
    expect(cls).toContain("--gain");
  });

  test("sort › ordenação por defeito é Market Value descendente", async ({ page }) => {
    const marketValueTh = page.locator('table thead th[aria-sort="descending"]');
    await expect(marketValueTh).toBeVisible();
    await expect(marketValueTh).toContainText("Market Value");
  });

  test("sort › clicar header Shares ordena; segundo clique inverte direcção", async ({
    page,
  }) => {
    const toggle = page.locator('[role="switch"][aria-label*="fechadas"]');
    await toggle.click();
    await expect(page.locator("table tbody tr")).toHaveCount(2);

    const sharesHeader = page
      .locator("table thead th button")
      .filter({ hasText: "Shares" });
    await sharesHeader.click();
    await expect(page.locator('table thead th[aria-sort="descending"]')).toContainText(
      "Shares"
    );
    // AAPL (2 shares) antes de MSFT (0 shares fechada) em desc
    const firstTickerDesc = await page
      .locator("table tbody tr")
      .first()
      .locator("span.font-semibold")
      .first()
      .textContent();
    expect(firstTickerDesc?.trim()).toBe("AAPL");

    await sharesHeader.click();
    await expect(page.locator('table thead th[aria-sort="ascending"]')).toContainText(
      "Shares"
    );
    const firstTickerAsc = await page
      .locator("table tbody tr")
      .first()
      .locator("span.font-semibold")
      .first()
      .textContent();
    expect(firstTickerAsc?.trim()).toBe("MSFT");
  });

  test("refresh › botão Actualizar posições refaz o fetch", async ({ page }) => {
    const reqPromise = page.waitForResponse((r) => r.url().includes("/api/portfolio/holdings"));
    await page.locator('[aria-label="Actualizar posições"]').click();
    const resp = await reqPromise;
    expect(resp.status()).toBe(200);
  });

  // ─── Sidebar e navegação ────────────────────────────────────────────────

  test("sidebar › link Holdings activo com href e aria-current=page", async ({ page }) => {
    const holdingsLink = page.locator("aside nav a").filter({ hasText: "Holdings" });
    await expect(holdingsLink).toHaveAttribute("href", "/holdings");
    await expect(holdingsLink).toHaveAttribute("aria-current", "page");
    const cls = await holdingsLink.getAttribute("class");
    expect(cls).toContain("text-primary");
  });

  // ─── Design system ──────────────────────────────────────────────────────

  test("design › dark mode forçado, h1 visível, sem erros JS", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
    await expect(page.locator("h1").filter({ hasText: "Holdings" })).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  // ─── Responsividade ─────────────────────────────────────────────────────

  test("responsive › overflow-x-auto na tabela e sidebar oculta em mobile", async ({
    page,
  }) => {
    await expect(page.locator(".overflow-x-auto")).toBeVisible();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("aside")).toBeHidden();
  });
});
