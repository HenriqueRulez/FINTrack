/**
 * E2E Tests — Holdings Page Reformulacao (histórico: Fase 1 visual/mock)
 * Working Item: .claude/working-items/reformular-pagina-holdings.md
 * Reescrito em 2026-08-05 (QA/Etapa 3 do AUDIT_MELHORIAS.md).
 *
 * A maior parte das CAs originais (KPIs, colunas, badges de tipo, botão "Add
 * position" removido) já é coberta por `holdings-redesign.spec.ts` reescrito
 * na mesma sessão — não duplicado aqui. Este ficheiro mantém-se apenas para o
 * que é especificamente desta feature (ícone da CompanyCell) e o que a
 * reescrita tornou obsoleto é documentado e removido, não mockado:
 *
 *  - CA2/CA3 (exchange "| NASDAQ", "| XETRA") — REMOVIDO. `CompanyCell.tsx`
 *    actual mostra a MOEDA da posição ("| EUR", "| USD"), não a bolsa/exchange.
 *    Esse dado nunca existiu no ledger real (só no mock antigo) — não há como
 *    a API derivada (F-03) devolver "exchange" sem uma tabela de instrumentos,
 *    que foi explicitamente descartada (AUDIT_MELHORIAS.md, decisão do dono).
 *  - CA9 ("Avg Cost é mock fixo, idêntico entre reloads") — REMOVIDO. Com dados
 *    reais o Avg Cost é CALCULADO (custo médio do ledger), o oposto do que a
 *    CA testava. O cálculo já está coberto por `tests/unit/derive.spec.ts` e
 *    por `holdings-redesign.spec.ts` (asserção determinística Avg Cost=100,00€).
 *  - CA17 (CurrencySelector EUR/USD/Native) — REMOVIDO. Moeda fixa em EUR
 *    (decisão do dono); o componente não existe mais (apagado nesta etapa).
 *  - CA10 (sem botão "+ Add position" / sem dialog) — MANTIDO, ainda válido.
 *  - CA1 (ícone 32×32 com inicial do ticker) — MANTIDO, componente inalterado.
 *  - CA18/column-order — MANTIDO, mas fundido no teste de ordem de colunas de
 *    `holdings-redesign.spec.ts` para não duplicar; aqui fica só a caption.
 *
 * Estratégia de dados: 1 posição activa via API, apagada no fim.
 */

import { test, expect, type APIRequestContext, type BrowserContext } from "@playwright/test";

const AUTH_STATE = "tests/e2e/.auth/user.json";

async function createFixture(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/transactions", {
    data: {
      date: "2025-03-10",
      ticker: "AAPL",
      type: "buy",
      qty: 1,
      price: 120,
      currency: "EUR",
    },
  });
  if (!res.ok()) {
    throw new Error(`Falha ao criar fixture: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.id as string;
}

test.describe("Holdings Reformulacao — comportamento ainda válido", () => {
  let context: BrowserContext;
  let fixtureId: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: AUTH_STATE });
    fixtureId = await createFixture(context.request);
  });

  test.afterAll(async () => {
    await context.request.delete(`/api/transactions/${fixtureId}`).catch(() => undefined);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/holdings");
    await page.waitForLoadState("networkidle");
  });

  // ─── CA1 — Ícone 32×32 com inicial do ticker (componente inalterado) ────

  test("CA1 company-cell › ícone placeholder 32×32 com a 1ª letra do ticker", async ({
    page,
  }) => {
    const row = page.locator("table tbody tr").first();
    const icon = row.locator("td:first-child div.w-8.h-8");
    await expect(icon).toBeVisible();
    const cls = await icon.getAttribute("class");
    expect(cls).toContain("bg-muted");
    expect(cls).toContain("border");

    const text = await icon.textContent();
    expect(text?.trim()).toBe("A");
  });

  // ─── CA10 — Botão "+ Add position" continua removido ────────────────────

  test("CA10 no-add-button › botão 'Add position' e dialogs não existem na página", async ({
    page,
  }) => {
    await expect(page.locator("button", { hasText: "Add position" })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  // ─── Caption / rótulos em inglês ──────────────────────────────────────────

  test("i18n › caption da tabela é 'Holdings positions' e headers em inglês", async ({
    page,
  }) => {
    const caption = page.locator("table caption");
    expect((await caption.textContent())?.trim()).toBe("Holdings positions");

    // Nenhum header antigo ("Cost Basis") sobrevive à reformulação
    const headText = await page.locator("table thead").textContent();
    expect(headText).not.toContain("Cost Basis");
    expect(headText).toContain("Total Invested");
  });

  // ─── Sem erros JS específicos desta feature ──────────────────────────────

  test("no-js-errors › /holdings carrega sem erros JS desta feature", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.reload();
    await page.waitForLoadState("networkidle");

    const featureErrors = errors.filter(
      (e) =>
        !e.includes("yahoo-finance") &&
        !e.includes("InvalidOptionsError") &&
        !e.includes("historical called with invalid options")
    );
    expect(featureErrors).toHaveLength(0);
  });
});
