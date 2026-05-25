import { test, expect } from "@playwright/test";

test("portfolio page carrega", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page.locator("h1")).toContainText("Portfólio");
  await expect(page.getByRole("button", { name: /Adicionar Posição/i })).toBeVisible();
});

test("tabela de posições ou estado vazio visível", async ({ page }) => {
  await page.goto("/portfolio");
  await page.waitForLoadState("networkidle");

  const table = page.locator("table");
  const emptyState = page.getByText(/Nenhuma posição cadastrada/i);

  const tableVisible = await table.isVisible().catch(() => false);
  const emptyVisible = await emptyState.isVisible().catch(() => false);

  expect(tableVisible || emptyVisible).toBe(true);
});

test("dropdown Ações abre sem erro JS", async ({ page }) => {
  const jsErrors: string[] = [];
  page.on("pageerror", (err) => jsErrors.push(err.message));

  await page.goto("/portfolio");
  await page.waitForLoadState("networkidle");

  const acoesButtons = page.getByRole("button", { name: /Ações/i });
  const count = await acoesButtons.count();

  if (count === 0) {
    // Sem posições — verifica estado vazio sem erros JS
    expect(jsErrors).toHaveLength(0);
    return;
  }

  await acoesButtons.first().click();

  // Menu deve abrir
  const menu = page.locator('[role="menu"]');
  await expect(menu).toBeVisible({ timeout: 3_000 });

  // Sem erros JS
  expect(jsErrors).toHaveLength(0);
});

test("dialog Adicionar Posição abre", async ({ page }) => {
  await page.goto("/portfolio");
  await page.getByRole("button", { name: /Adicionar Posição/i }).click();

  // Dialog deve aparecer
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 3_000 });
});
