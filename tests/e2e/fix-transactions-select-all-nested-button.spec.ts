/**
 * E2E Regression Tests — Fix: nested <button> in /transactions "Select All"
 * Bug Report: .claude/bug-reports/transactions-select-all-nested-button.md
 * Engineer Report: .claude/reports/fix-transactions-select-all-nested-button.md
 *
 * CAs verified:
 *  CA1 — Sem erros de hidratação (<button> descendente de <button>) em edit mode.
 *  CA2 — "Select All" é um único elemento clicável e acessível (sem nesting),
 *        focável por teclado e activável por Enter/Space.
 *  CA3 — "Select All" mantém select/deselect-all e os estados off/on/mixed.
 *  CA4 — Delete continua funcional (enabled/disabled conforme selecção) sem erros.
 */

import { test, expect } from "@playwright/test";
import { resetLedger } from "../support/ledger";
import { LEDGER_SEED_13 } from "../support/ledger-seed";

test.describe("Fix › Select All sem botão aninhado (authenticated)", () => {
  // Precisa de linhas na tabela (rowCount > 1, checkboxes de linha). Semeia o
  // baseline de 13 via service role e limpa no fim — imune à ordem dos specs.
  test.beforeAll(async () => {
    await resetLedger(LEDGER_SEED_13);
  });

  test.afterAll(async () => {
    await resetLedger([]);
  });

  // CA1 — sem erros de hidratação / JS ao entrar em edit mode
  test("CA1 › edit mode não emite erros de hidratação <button> in <button>", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    // Entrar em edit mode (condição em que o bug ocorria)
    const editBtn = page.locator('button[aria-label="Toggle edit mode"]');
    await editBtn.click();
    await expect(editBtn).toHaveAttribute("aria-pressed", "true");

    // Forçar re-render: sair e re-entrar
    await editBtn.click();
    await editBtn.click();

    // Nenhuma mensagem sobre <button> descendant de <button>
    const nestingMsgs = [...consoleErrors, ...pageErrors].filter((m) =>
      /button.*cannot be a descendant of.*button|descendant of <button>|validateDOMNesting/i.test(
        m
      )
    );
    expect(nestingMsgs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // CA2 — Select All é um único <button> nativo, sem botão interno
  test("CA2 › Select All é um único elemento sem <button> aninhado", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await page.locator('button[aria-label="Toggle edit mode"]').click();

    const selectAll = page.locator('button[aria-label="Select all"]');
    await expect(selectAll).toBeVisible();
    await expect(selectAll).toHaveRole("checkbox");

    // Nenhum <button> aninhado dentro do controlo Select All
    await expect(selectAll.locator("button")).toHaveCount(0);

    // Nenhum <button> aninhado em <button> em toda a página
    const nestedCount = await page.locator("button button").count();
    expect(nestedCount).toBe(0);
  });

  // CA2 — acessibilidade de teclado: focável (Tab) e activável (Enter/Space)
  test("CA2 › Select All é focável e activável por teclado (Enter)", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await page.locator('button[aria-label="Toggle edit mode"]').click();

    const selectAll = page.locator('button[aria-label="Select all"]');
    await expect(selectAll).toHaveAttribute("aria-checked", "false");

    // Focar via .focus() e confirmar foco
    await selectAll.focus();
    await expect(selectAll).toBeFocused();

    // Activar com Enter → selecciona tudo (on)
    await page.keyboard.press("Enter");
    await expect(selectAll).toHaveAttribute("aria-checked", "true");

    // Activar com Space → desselecciona tudo (off)
    await selectAll.focus();
    await page.keyboard.press(" ");
    await expect(selectAll).toHaveAttribute("aria-checked", "false");
  });

  // CA3 — estados off / on / mixed
  test("CA3 › Select All percorre estados off → on → off e mixed", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await page.locator('button[aria-label="Toggle edit mode"]').click();

    const selectAll = page.locator('button[aria-label="Select all"]');
    const rowChecks = page.locator(
      'table tbody td [role="checkbox"]'
    );
    const rowCount = await rowChecks.count();
    expect(rowCount).toBeGreaterThan(1);

    // off inicial
    await expect(selectAll).toHaveAttribute("aria-checked", "false");

    // on: clicar selecciona todas
    await selectAll.click();
    await expect(selectAll).toHaveAttribute("aria-checked", "true");
    for (let i = 0; i < rowCount; i++) {
      await expect(rowChecks.nth(i)).toHaveAttribute("aria-checked", "true");
    }

    // off: clicar de novo desselecciona todas
    await selectAll.click();
    await expect(selectAll).toHaveAttribute("aria-checked", "false");
    for (let i = 0; i < rowCount; i++) {
      await expect(rowChecks.nth(i)).toHaveAttribute("aria-checked", "false");
    }

    // mixed: seleccionar exactamente uma linha
    await rowChecks.first().click();
    await expect(selectAll).toHaveAttribute("aria-checked", "mixed");

    // limpar
    await rowChecks.first().click();
    await expect(selectAll).toHaveAttribute("aria-checked", "false");
  });

  // CA4 — Delete continua funcional (disabled sem selecção, reflecte contagem)
  test("CA4 › Delete reflecte selecção (disabled em 0, enabled com selecção)", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await page.locator('button[aria-label="Toggle edit mode"]').click();

    const deleteBtn = page.locator('button[aria-label*="Delete"]');
    await expect(deleteBtn).toBeVisible();
    // Sem selecção → disabled
    await expect(deleteBtn).toBeDisabled();

    // Seleccionar uma linha → enabled e contagem 1
    const rowChecks = page.locator('table tbody td [role="checkbox"]');
    await rowChecks.first().click();
    await expect(deleteBtn).toBeEnabled();
    await expect(deleteBtn).toContainText("Delete (1)");

    // Limpar
    await rowChecks.first().click();
    await expect(deleteBtn).toBeDisabled();
  });
});
