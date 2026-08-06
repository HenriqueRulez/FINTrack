/**
 * E2E Tests — Import CSV (Trading212) em /transactions
 *
 * CAs verificados (working item: .claude/working-items/csv-import.md):
 *  CA1  — Modal abre; só .csv é aceite
 *  CA2  — Preview classifica cada linha (new/duplicate/ignored/error); nada é gravado
 *  CA3  — Contadores visíveis por estado
 *  CA6  — Confirmar grava só as "new"; tabela actualiza sem reload (cash/div incluídos)
 *  CA7  — Reimport do mesmo ficheiro: 0 novas, tudo duplicado (idempotência)
 *  CA8  — Fixture real: 38 buy / 5 sell / 5 cash / 8 div / 0 ignoradas / 0 erros
 *  CA9  — fx do ficheiro: NVDA buy 2026-05-28 total 37.50 EUR; NVDA div 2026-06-26 total 0.04 EUR
 *  CA10 — Cash com label "Deposit", sinal positivo; dividendos sempre positivos
 *  CA11 — Fluxo manual "Add Manually" não afectado por esta feature (smoke check;
 *         cobertura de estilo/detalhe já existe em transactions-redesign.spec.ts)
 *
 * NOTA IMPORTANTE sobre estado partilhado (dívida G-05, ver TODO.md):
 * O utilizador de teste e2e@fintrack.local tinha 1 transacção residual de um ciclo
 * anterior (MSFT buy manual) — não pertence a esta feature. Para satisfazer a
 * pré-condição do CA8 ("ledger vazio"), o beforeAll desta suite APAGA todas as
 * transacções existentes do utilizador de teste antes de importar a fixture.
 * Isto deixa o ledger do utilizador de teste com as 56 entradas do Trading212 no
 * fim da suite — qualquer spec de regressão que assuma uma seed diferente (ex.:
 * transactions-ledger.spec.ts espera 13 linhas específicas) fica desactualizado.
 * Reportado no relatório QA para o dono decidir re-seed.
 */

import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_PATH = resolve(__dirname, "../../positions_export/trading212.csv");

interface ApiTxRow {
  id: string;
  date: string;
  ticker: string | null;
  type: string;
  qty: number | null;
  price: number | null;
  currency: string;
  fx: number;
  fee: number;
  total: number;
  label: string | null;
}

async function getAllTransactions(page: Page): Promise<ApiTxRow[]> {
  const resp = await page.request.get("/api/transactions");
  expect(resp.status()).toBe(200);
  const body = (await resp.json()) as { data: ApiTxRow[] };
  return body.data;
}

// DELETE /api/transactions/[id] partilha o rate limit "transactions:write"
// (30/60s) com o resto da escrita manual — ao limpar mais de 30 linhas
// sequencialmente batemos nesse limite. Espera o reset da janela e continua
// em vez de falhar (é setup de teste, não parte do fluxo sob teste).
async function wipeLedger(page: Page): Promise<number> {
  const rows = await getAllTransactions(page);
  for (const row of rows) {
    let resp = await page.request.delete(`/api/transactions/${row.id}`);
    if (resp.status() === 429) {
      await new Promise((r) => setTimeout(r, 61_000));
      resp = await page.request.delete(`/api/transactions/${row.id}`);
    }
    expect(resp.status()).toBe(200);
  }
  return rows.length;
}

async function openImportModal(page: Page) {
  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Loading transactions")).not.toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: /Import transactions/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe.serial("csv-import — Trading212", () => {
  test.beforeAll(async ({ browser }) => {
    // Pode esperar o reset do rate limit (61s) se houver >30 linhas a apagar.
    test.setTimeout(120_000);
    // Limpa o ledger do utilizador de teste UMA VEZ antes de toda a suite —
    // garante a pré-condição "ledger vazio" do CA8.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const deleted = await wipeLedger(page);
    // eslint-disable-next-line no-console
    console.log(`[csv-import setup] ledger limpo: ${deleted} transacção(ões) pré-existente(s) apagada(s).`);
    await ctx.close();
  });

  test("CA1 — modal abre e só aceite .csv", async ({ page }) => {
    await openImportModal(page);
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute("accept", ".csv");
  });

  test("CA1 — ficheiro sem extensão .csv é rejeitado client-side, sem round-trip", async ({
    page,
  }) => {
    await openImportModal(page);
    const badFile = resolve(__dirname, "../../package.json"); // existe, extensão .json
    await page.locator('input[type="file"]').setInputFiles(badFile);
    await expect(
      page.getByText("Apenas ficheiros .csv são aceites.")
    ).toBeVisible();
    // Não deve avançar para a fase de preview (nenhuma tabela)
    await expect(page.locator("table")).not.toBeVisible();
  });

  test("CA2/CA3/CA8 — preview da fixture real mostra as contagens exactas (ledger vazio)", async ({
    page,
  }) => {
    // Confirma pré-condição: ledger vazio antes do import (CA8 exige isto).
    const before = await getAllTransactions(page);
    expect(before.length).toBe(0);

    await openImportModal(page);
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);

    // Aguarda o fim do dryRun (fase "preview")
    await expect(page.getByRole("heading", { name: "Pré-visualização" })).toBeVisible({
      timeout: 15_000,
    });

    // Contadores — a API classifica por status (new/duplicate/ignored/error),
    // não por tipo. Verificamos o contador "Novas" = 56 (38+5+5+8), resto = 0.
    await expect(
      page.getByRole("button", { name: "Filtrar por Novas" })
    ).toContainText("56");
    await expect(
      page.getByRole("button", { name: "Filtrar por Duplicadas" })
    ).toContainText("0");
    await expect(
      page.getByRole("button", { name: "Filtrar por Ignoradas" })
    ).toContainText("0");
    await expect(
      page.getByRole("button", { name: "Filtrar por Erros" })
    ).toContainText("0");

    // Nada foi gravado ainda nesta fase (dryRun) — ledger continua vazio.
    const stillEmpty = await getAllTransactions(page);
    expect(stillEmpty.length).toBe(0);

    // Botão de confirmação mostra "Importar 56 novas"
    await expect(
      page.getByRole("button", { name: "Importar 56 novas" })
    ).toBeEnabled();
  });

  test("CA6/CA8/CA9/CA10 — confirmar grava as 56 novas; tabela reflecte cash/div; fx do ficheiro", async ({
    page,
  }) => {
    const before = await getAllTransactions(page);
    expect(before.length).toBe(0);

    await openImportModal(page);
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);
    await expect(page.getByRole("heading", { name: "Pré-visualização" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Importar 56 novas" }).click();

    // Modal fecha sozinho após commit (sem toast, sem ecrã intermédio)
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15_000 });

    // CA6 — tabela actualiza sem reload: sobe o page size para 100 (default é
    // 20 e paginaria as 56 linhas) e usa o "Total: N transactions" do footer,
    // que reflecte o total filtrado (não o nº de linhas renderizadas na página).
    await page.locator('select[aria-label="Transactions per page"]').selectOption("100");
    await page.getByRole("tab", { name: /All/i }).click();
    await expect(page.getByText("Total:")).toContainText("56", { timeout: 10_000 });
    await expect(page.locator("tbody tr")).toHaveCount(56, { timeout: 10_000 });

    // CA6 — tabs Cash e Dividend também reflectem as novas entradas
    await page.getByRole("tab", { name: /Cash/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(5);
    await page.getByRole("tab", { name: /Dividend/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(8);
    await page.getByRole("tab", { name: /Buy.*Sell/i }).click();
    await expect(page.locator("tbody tr")).toHaveCount(43); // 38 buy + 5 sell

    // Confirma via API (fonte de verdade) — contagens finais
    const all = await getAllTransactions(page);
    expect(all.length).toBe(56);
    const byType = (t: string) => all.filter((r) => r.type === t);
    expect(byType("buy").length).toBe(38);
    expect(byType("sell").length).toBe(5);
    expect(byType("cash").length).toBe(5);
    expect(byType("div").length).toBe(8);

    // CA9 — fx do ficheiro: NVDA buy 2026-05-28 total 37.50 EUR
    const nvdaBuy = all.find(
      (r) => r.type === "buy" && r.ticker === "NVDA" && r.date === "2026-05-28"
    );
    expect(nvdaBuy).toBeDefined();
    expect(nvdaBuy!.total).toBe(37.5);
    expect(nvdaBuy!.currency).toBe("USD");

    // CA9 — NVDA div 2026-06-26 total positivo 0.04 EUR (líquido de retenção)
    const nvdaDiv = all.find(
      (r) => r.type === "div" && r.ticker === "NVDA" && r.date === "2026-06-26"
    );
    expect(nvdaDiv).toBeDefined();
    expect(nvdaDiv!.total).toBe(0.04);

    // CA10 — cash: sinal positivo, label "Deposit" em vez de ticker
    const deposits = byType("cash");
    expect(deposits.length).toBe(5);
    for (const d of deposits) {
      expect(d.total).toBeGreaterThan(0);
      expect(d.ticker).toBeNull();
      expect(d.label).toBe("Deposit");
    }

    // CA10 — dividendos sempre positivos
    const divs = byType("div");
    for (const d of divs) {
      expect(d.total).toBeGreaterThan(0);
    }
  });

  test("CA7 — reimportar o mesmo ficheiro: 0 novas, tudo duplicado", async ({
    page,
  }) => {
    // Pré-condição: as 56 entradas do teste anterior já estão gravadas.
    const before = await getAllTransactions(page);
    expect(before.length).toBe(56);

    await openImportModal(page);
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_PATH);
    await expect(page.getByRole("heading", { name: "Pré-visualização" })).toBeVisible({
      timeout: 15_000,
    });

    // Cada contador é um botão "Filtrar por X" com o valor no último span —
    // lê por aria-label para não depender de contagens ambíguas de texto "0".
    await expect(
      page.getByRole("button", { name: "Filtrar por Novas" })
    ).toContainText("0");
    await expect(
      page.getByRole("button", { name: "Filtrar por Duplicadas" })
    ).toContainText("56");
    await expect(
      page.getByRole("button", { name: "Filtrar por Ignoradas" })
    ).toContainText("0");
    await expect(
      page.getByRole("button", { name: "Filtrar por Erros" })
    ).toContainText("0");

    // Botão de confirmação fica desactivado — nada para importar
    const confirmBtn = page.getByRole("button", { name: /Importar 0 novas/i });
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();

    // Ledger continua com exactamente 56 — nenhuma duplicação criada
    const after = await getAllTransactions(page);
    expect(after.length).toBe(56);
  });

  test("CA11 — fluxo manual 'Add Manually' continua a abrir o modal de criação (smoke)", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Loading transactions")).not.toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: /Add transaction manually/i }).click();
    // O modal manual não é o ImportModal — não tem input de ficheiro.
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator('input[type="file"]')).not.toBeVisible();
  });

  test("dashboard/holdings/performance derivam do ledger novo sem erro JS", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    for (const path of ["/dashboard", "/holdings", "/performance"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1, h2").first()).toBeVisible({
        timeout: 10_000,
      });
    }

    expect(errors).toHaveLength(0);
  });
});

test("fixture real tem exactamente 56 linhas de dados (sanity do ficheiro em disco)", () => {
  const text = readFileSync(FIXTURE_PATH, "utf8");
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== "");
  // 1 header + 56 linhas de dados
  expect(lines.length).toBe(57);
});
