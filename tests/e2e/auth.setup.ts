import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("autenticar utilizador", async ({ page }) => {
  const passphrase = process.env.E2E_PASSPHRASE;
  if (!passphrase) {
    throw new Error(
      "E2E_PASSPHRASE não definida. Adicione ao .env.local: E2E_PASSPHRASE=a-sua-palavra-passe"
    );
  }

  await page.goto("/");
  await page.fill('input[type="password"]', passphrase);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: authFile });
});
