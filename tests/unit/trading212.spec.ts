// Testes unitários do mapper Trading212 (src/lib/import/trading212.ts) contra a
// fixture real positions_export/trading212.csv. Funções puras, sem banco.
// Correr com: npx playwright test -c playwright.unit.config.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { parseCsv } from "../../src/lib/import/csv";
import {
  mapTrading212,
  actionToType,
  type ImportCandidate,
  type MapResult,
} from "../../src/lib/import/trading212";

const FIXTURE = resolve(__dirname, "../../positions_export/trading212.csv");

function loadResults(): MapResult[] {
  const text = readFileSync(FIXTURE, "utf8");
  return mapTrading212(parseCsv(text));
}

function candidates(results: MapResult[]): ImportCandidate[] {
  return results
    .filter((r): r is Extract<MapResult, { status: "ok" }> => r.status === "ok")
    .map((r) => r.candidate);
}

test("actionToType cobre as correspondências fechadas", () => {
  expect(actionToType("Market buy")).toBe("buy");
  expect(actionToType("Limit buy")).toBe("buy");
  expect(actionToType("Market sell")).toBe("sell");
  expect(actionToType("Limit sell")).toBe("sell");
  expect(actionToType("Deposit")).toBe("cash");
  expect(actionToType("Dividend (Dividend)")).toBe("div");
  expect(actionToType("Withdrawal")).toBeNull();
  expect(actionToType("Interest on cash")).toBeNull();
});

test("fixture real: contagens exactas 38 buy / 5 sell / 5 cash / 8 div / 0 ign / 0 err", () => {
  const results = loadResults();

  expect(results.length).toBe(56); // 56 linhas de dados

  const byStatus = { ok: 0, ignored: 0, error: 0 };
  for (const r of results) byStatus[r.status]++;
  expect(byStatus.ignored).toBe(0);
  expect(byStatus.error).toBe(0);
  expect(byStatus.ok).toBe(56);

  const cs = candidates(results);
  const count = (t: string) => cs.filter((c) => c.type === t).length;
  expect(count("buy")).toBe(38);
  expect(count("sell")).toBe(5);
  expect(count("cash")).toBe(5);
  expect(count("div")).toBe(8);
});

test("CA9: NVDA buy 2026-05-28 grava total 37.50 EUR", () => {
  const cs = candidates(loadResults());
  const nvdaBuy = cs.find(
    (c) => c.type === "buy" && c.ticker === "NVDA" && c.date === "2026-05-28"
  );
  expect(nvdaBuy).toBeDefined();
  expect(nvdaBuy?.total).toBe(37.5);
  expect(nvdaBuy?.currency).toBe("USD");
});

test("CA9: NVDA div 2026-06-26 grava total positivo 0.04 EUR", () => {
  const cs = candidates(loadResults());
  const nvdaDiv = cs.find(
    (c) => c.type === "div" && c.ticker === "NVDA" && c.date === "2026-06-26"
  );
  expect(nvdaDiv).toBeDefined();
  expect(nvdaDiv?.total).toBe(0.04);
  expect(nvdaDiv?.total).toBeGreaterThan(0);
});

test("fx normalizado: buy USD invertido (~0.86 EUR/USD)", () => {
  const cs = candidates(loadResults());
  // SMSN buy 2026-05-28, exchange rate no ficheiro = 1.16087974 (USD por EUR)
  const smsn = cs.find((c) => c.type === "buy" && c.ticker === "SMSN");
  expect(smsn).toBeDefined();
  expect(smsn?.currency).toBe("USD");
  expect(smsn?.fx).toBeGreaterThan(0.85);
  expect(smsn?.fx).toBeLessThan(0.87);
  // grossEur ≈ Total - fee(EUR); reproduz o Total do ficheiro (30.00) a menos da fee.
  const grossEur = (smsn!.qty ?? 0) * (smsn!.price ?? 0) * smsn!.fx;
  expect(Math.abs(grossEur - 30)).toBeLessThan(0.1);
});

test("fx normalizado: dividend USD directo (~0.86 EUR/USD)", () => {
  const cs = candidates(loadResults());
  // GOOGL div 2026-06-15, exchange rate no ficheiro = 0.86077800 (EUR por USD)
  const googl = cs.find((c) => c.type === "div" && c.ticker === "GOOGL");
  expect(googl).toBeDefined();
  expect(googl?.currency).toBe("USD");
  expect(googl?.fx).toBeGreaterThan(0.85);
  expect(googl?.fx).toBeLessThan(0.87);
});

test("cash: sem ticker, label descritivo, fx=1, total positivo", () => {
  const cs = candidates(loadResults());
  const deposits = cs.filter((c) => c.type === "cash");
  expect(deposits.length).toBe(5);
  for (const d of deposits) {
    expect(d.ticker).toBeNull();
    expect(d.label).toBe("Deposit");
    expect(d.currency).toBe("EUR");
    expect(d.fx).toBe(1);
    expect(d.total).toBeGreaterThan(0);
  }
  // Depósito com fee (linha 1626.00 / deposit fee -0.89) → fee absoluta 0.89.
  const withFee = deposits.find((d) => d.total === 1626);
  expect(withFee?.fee).toBeCloseTo(0.89, 4);
});

test("dividendos: total positivo, líquido, external_id sintético e estável", () => {
  const first = candidates(loadResults()).filter((c) => c.type === "div");
  const second = candidates(loadResults()).filter((c) => c.type === "div");

  expect(first.length).toBe(8);
  for (const d of first) {
    expect(d.total).toBeGreaterThan(0);
    expect(d.withholding_tax).toBeGreaterThanOrEqual(0);
    expect(d.external_id.startsWith("t212:div:")).toBe(true);
  }

  // Determinismo: reimportar o mesmo ficheiro gera os mesmos external_id.
  const idsA = first.map((d) => d.external_id).sort();
  const idsB = second.map((d) => d.external_id).sort();
  expect(idsA).toEqual(idsB);

  // Unicidade dos external_id dos dividendos (nada colide).
  expect(new Set(idsA).size).toBe(idsA.length);
});

test("EUR buy: fx=1 e currency EUR", () => {
  const cs = candidates(loadResults());
  const webn = cs.find((c) => c.type === "buy" && c.ticker === "WEBN");
  expect(webn).toBeDefined();
  expect(webn?.currency).toBe("EUR");
  expect(webn?.fx).toBe(1);
});

test("todos os external_id do ficheiro são únicos (dedup por reimport)", () => {
  const ids = candidates(loadResults()).map((c) => c.external_id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("moeda não suportada vira erro com motivo", () => {
  const header =
    "Action,Time (UTC),ISIN,Ticker,Name,Notes,ID,No. of shares,Price / share,Currency (Price / share),Exchange rate,Result,Currency (Result),Total,Currency (Total),Withholding tax,Currency (Withholding tax),Charge amount,Currency (Charge amount),Deposit fee,Currency (Deposit fee),Currency conversion fee,Currency (Currency conversion fee)";
  const line =
    'Market buy,2026-05-15 08:07:55+00:00,IE0003XJA0J9,ABC,"X",,EOF1,1.0,10.0,JPY,1.0,,,10.00,"EUR",,,,,,,,';
  const results = mapTrading212(parseCsv(`${header}\n${line}`));
  expect(results.length).toBe(1);
  expect(results[0].status).toBe("error");
  if (results[0].status === "error") {
    expect(results[0].reason).toContain("Moeda não suportada");
  }
});
