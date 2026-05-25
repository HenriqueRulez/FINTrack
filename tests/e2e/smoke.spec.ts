import { test, expect } from "@playwright/test";

test("redireciona para passphrase se não autenticado", async ({ browser }) => {
  const ctx = await browser.newContext(); // sem auth state
  const page = await ctx.newPage();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/passphrase/);
  await ctx.close();
});

test("passphrase page renderiza correctamente", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("FINTrack");
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await ctx.close();
});

test("dashboard carrega após autenticação", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator("h1, h2").first()).toBeVisible();
});
