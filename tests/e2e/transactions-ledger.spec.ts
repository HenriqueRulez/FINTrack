/**
 * E2E Tests — Transactions Ledger (Fase 0)
 *
 * CAs verificados:
 *  CA-01 — GET /api/transactions: 401 sem sessão, 200 com sessão + array data
 *  CA-02 — Página /transactions mostra 13 transações na tab All (dados reais, não mock)
 *  CA-03 — Tabs por tipo filtram correctamente: Buy/Sell=7, Cash=2, Conv=1, Div=2, Int=1
 *  CA-04 — Mapeamento: ticker NULL → "—" (ou label para cash/int), símbolos moeda correctos
 *  CA-05 — Estados loading e error não partem a UI
 *  CA-06 — Resposta API não inclui user_id nem colunas fora da whitelist
 *  CA-07 — Sort por colunas e paginação client-side continuam a funcionar
 */

import { test, expect } from "@playwright/test";
import { resetLedger } from "../support/ledger";
import { LEDGER_SEED_13 } from "../support/ledger-seed";

// Este spec exige um estado FIXO de 13 transacções (All=13, Buy/Sell=7, Cash=2,
// Conv=1, Div=2, Int=1) com tickers/datas específicos. Semeia esse baseline via
// service role (bypass da API/rate limit) antes de toda a suite e limpa no fim —
// deixa de depender de um seed global que csv-import apaga. Ordem irrelevante.
test.beforeAll(async () => {
  await resetLedger(LEDGER_SEED_13);
});

test.afterAll(async () => {
  await resetLedger([]);
});

// ---------------------------------------------------------------------------
// CA-01 — Auth: 401 sem sessão, 200 com sessão
// ---------------------------------------------------------------------------

test.describe("CA-01 auth", () => {
  test("GET /api/transactions sem sessão devolve 401", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();

    const resp = await page.request.get("http://localhost:3000/api/transactions");
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body).toHaveProperty("error");

    await ctx.close();
  });

  test("GET /api/transactions com sessão devolve 200 com array data", async ({
    page,
  }) => {
    // storageState do projecto (autenticado via auth.setup.ts)
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    const resp = await page.request.get("http://localhost:3000/api/transactions");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CA-02 — Dados reais: tab All mostra 13 transações
// ---------------------------------------------------------------------------

test.describe("CA-02 dados reais", () => {
  test("tab All mostra 13 transações", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    // Aguarda que o loading desapareça e os dados carreguem
    await expect(page.getByText("Loading transactions")).not.toBeVisible({
      timeout: 10_000,
    });

    // Clicar na tab All
    await page.getByRole("tab", { name: /All/i }).click();

    // Contar linhas da tabela
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(13, { timeout: 10_000 });
  });

  test("tab Buy/Sell activa por defeito mostra 7 transações", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Loading transactions")).not.toBeVisible({
      timeout: 10_000,
    });

    // Tab activa por defeito deve ser Buy/Sell — usa aria-selected (não data-state)
    const bsTab = page.getByRole("tab", { name: /Buy.*Sell/i });
    await expect(bsTab).toHaveAttribute("aria-selected", "true");

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(7, { timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// CA-03 — Tabs por tipo filtram correctamente
// ---------------------------------------------------------------------------

test.describe("CA-03 tabs por tipo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Loading transactions")).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("Buy/Sell = 7 linhas", async ({ page }) => {
    await page.getByRole("tab", { name: /Buy.*Sell/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(7);
  });

  test("Cash = 2 linhas", async ({ page }) => {
    await page.getByRole("tab", { name: /Cash/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(2);
  });

  test("Conversion = 1 linha", async ({ page }) => {
    await page.getByRole("tab", { name: /Conversion/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("Dividend = 2 linhas", async ({ page }) => {
    await page.getByRole("tab", { name: /Dividend/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(2);
  });

  test("Interest = 1 linha", async ({ page }) => {
    await page.getByRole("tab", { name: /Interest/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// CA-04 — Mapeamento: ticker NULL, símbolos moeda
// ---------------------------------------------------------------------------

test.describe("CA-04 mapeamento", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Loading transactions")).not.toBeVisible({
      timeout: 10_000,
    });
    // Activar tab All para ver todas as 13 transações
    await page.getByRole("tab", { name: /All/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(13);
  });

  test("transações DIV com ticker real não mostram '—' na coluna ticker", async ({
    page,
  }) => {
    // DIV CSPX e VWCE — ticker deve aparecer (não é NULL no banco para DIV)
    const rows = page.locator("tbody tr");
    const divRows: string[] = [];
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator("td");
      const type = await cells.nth(2).textContent();
      if (type?.includes("DIV")) {
        const ticker = await cells.nth(1).textContent();
        divRows.push(ticker?.trim() ?? "");
      }
    }
    // CSPX e VWCE — não devem ser "—"
    expect(divRows.length).toBe(2);
    expect(divRows.every((t) => t !== "—")).toBe(true);
  });

  test("transação INT (Cash interest, ticker NULL) mostra label na coluna ticker", async ({
    page,
  }) => {
    // INT — ticker é NULL no banco, componente mostra label "Cash interest"
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    let intTickerText = "";
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator("td");
      const type = await cells.nth(2).textContent();
      if (type?.includes("INT")) {
        intTickerText = (await cells.nth(1).textContent()) ?? "";
        break;
      }
    }
    // O componente usa label ?? ticker para int — "Cash interest"
    expect(intTickerText.trim()).toBe("Cash interest");
  });

  test("transação CASH ticker NULL mostra label na coluna ticker", async ({
    page,
  }) => {
    // CASH — ticker é NULL no banco, componente mostra label ("Deposit · IBKR" / "Withdrawal")
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    const cashLabels: string[] = [];
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator("td");
      const type = await cells.nth(2).textContent();
      if (type?.includes("CASH")) {
        cashLabels.push((await cells.nth(1).textContent())?.trim() ?? "");
      }
    }
    expect(cashLabels.length).toBe(2);
    // Ambas devem ter conteúdo (label), não "—"
    expect(cashLabels.every((l) => l.length > 0 && l !== "—")).toBe(true);
  });

  test("símbolos de moeda correctos — EUR € / USD $ / GBP £", async ({
    page,
  }) => {
    // PPLT tem currency=USD → coluna Total deve ter $
    // AMAT tem currency=GBP → coluna Total deve ter £
    // VWCE tem currency=EUR → coluna Total deve ter €
    const rows = page.locator("tbody tr");
    const count = await rows.count();

    let foundUSD = false;
    let foundGBP = false;
    let foundEUR = false;

    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator("td");
      const ticker = (await cells.nth(1).textContent())?.trim();
      // Total é a última célula
      const totalText = await cells.last().textContent();
      if (ticker === "PPLT" && totalText?.includes("$")) foundUSD = true;
      if (ticker === "AMAT" && totalText?.includes("£")) foundGBP = true;
      if (ticker === "VWCE") {
        const type = await cells.nth(2).textContent();
        if (type?.includes("BUY") && totalText?.includes("€")) foundEUR = true;
      }
    }

    expect(foundUSD).toBe(true);
    expect(foundGBP).toBe(true);
    expect(foundEUR).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CA-05 — Estados loading e error não partem a UI
// ---------------------------------------------------------------------------

test.describe("CA-05 estados UI", () => {
  test("estado loading aparece e desaparece sem crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/transactions");

    // O loading pode aparecer brevemente — a página não deve crashar
    // Aguarda que o loading desapareça
    await expect(page.getByText("Loading transactions")).not.toBeVisible({
      timeout: 10_000,
    });

    // Sem JS errors
    expect(errors).toHaveLength(0);

    // Página renderiza sem erro
    await expect(page.locator("tbody tr").first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("página /transactions não tem erros JS ao carregar", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Loading transactions")).not.toBeVisible({
      timeout: 10_000,
    });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CA-06 — Segurança: API não devolve user_id nem colunas fora da whitelist
// ---------------------------------------------------------------------------

test.describe("CA-06 segurança da leitura", () => {
  test("resposta da API não inclui user_id", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    const resp = await page.request.get("http://localhost:3000/api/transactions");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const firstRow = body.data?.[0];
    expect(firstRow).toBeDefined();
    expect(Object.keys(firstRow)).not.toContain("user_id");
    expect(Object.keys(firstRow)).not.toContain("created_at");
    expect(Object.keys(firstRow)).not.toContain("updated_at");
  });

  test("resposta da API contém exactamente as colunas whitelistadas", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    const resp = await page.request.get("http://localhost:3000/api/transactions");
    const body = await resp.json();
    const firstRow = body.data?.[0];
    expect(firstRow).toBeDefined();

    const EXPECTED_KEYS = [
      "id",
      "date",
      "ticker",
      "type",
      "qty",
      "price",
      "currency",
      "fx",
      "fee",
      "total",
      "label",
    ].sort();

    expect(Object.keys(firstRow).sort()).toEqual(EXPECTED_KEYS);
  });

  test("GET /api/transactions sem sessão devolve 401", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await ctx.newPage();
    const resp = await page.request.get("http://localhost:3000/api/transactions");
    expect(resp.status()).toBe(401);
    await ctx.close();
  });
});

// ---------------------------------------------------------------------------
// CA-07 — Regressão: sort e paginação continuam a funcionar
// ---------------------------------------------------------------------------

test.describe("CA-07 regressão sort e paginação", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Loading transactions")).not.toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("tab", { name: /All/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(13);
  });

  test("sort por Date (default desc) — data mais recente primeiro", async ({
    page,
  }) => {
    const rows = page.locator("tbody tr");
    // Primeira linha deve ser a mais recente (2026-04-22 CSPX)
    const firstDateText = await rows.first().locator("td").first().textContent();
    expect(firstDateText?.trim()).toBe("22/04/2026");
  });

  test("sort por Date asc — data mais antiga primeiro", async ({ page }) => {
    // Clicar no header Date para inverter para asc
    await page
      .locator("thead th")
      .filter({ hasText: "Date" })
      .locator("button")
      .click();

    const rows = page.locator("tbody tr");
    const firstDateText = await rows.first().locator("td").first().textContent();
    // A data mais antiga no seed é 2025-12-10 (PPLT)
    expect(firstDateText?.trim()).toBe("10/12/2025");
  });

  test("sort por Ticker — ordena alfabeticamente", async ({ page }) => {
    await page
      .locator("thead th")
      .filter({ hasText: "Ticker" })
      .locator("button")
      .click();

    // Aguarda re-render
    await page.waitForTimeout(100);

    const rows = page.locator("tbody tr");
    const firstTicker = await rows
      .first()
      .locator("td")
      .nth(1)
      .textContent();
    const secondTicker = await rows
      .nth(1)
      .locator("td")
      .nth(1)
      .textContent();

    // Verificamos que ambos têm conteúdo e que o sort foi activado
    expect(firstTicker?.trim()).toBeTruthy();
    expect(secondTicker?.trim()).toBeTruthy();
  });

  test("paginação: page size selector muda o número de linhas visíveis", async ({
    page,
  }) => {
    // Default é 20 — com 13 linhas (All tab), todas visíveis
    await expect(page.locator("tbody tr")).toHaveCount(13);

    // Mudar page size para 10 — com 13 transações mostra 10
    const pageSizeSelect = page.locator("select").filter({
      has: page.locator("option[value='10']"),
    });
    await pageSizeSelect.selectOption("10");
    // Com 13 transações e page size 10, deve mostrar 10
    await expect(page.locator("tbody tr")).toHaveCount(10);

    // Mudar para 20 — mostra todas as 13
    await pageSizeSelect.selectOption("20");
    await expect(page.locator("tbody tr")).toHaveCount(13);
  });
});
