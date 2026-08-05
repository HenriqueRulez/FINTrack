import { defineConfig } from "@playwright/test";

// Testes unitários puros (tests/unit) — sem browser, sem webServer, sem banco.
// Correr com: npx playwright test -c playwright.unit.config.ts
export default defineConfig({
  testDir: "./tests/unit",
  fullyParallel: true,
  reporter: "list",
});
