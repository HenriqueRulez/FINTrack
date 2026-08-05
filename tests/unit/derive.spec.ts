// Testes unitários da camada de derivação (src/lib/portfolio/derive.ts).
// Preços injectados por um provider mock — zero rede, zero banco.
// Correr com: npx playwright test -c playwright.unit.config.ts

import { expect, test } from "@playwright/test";
import {
  assetTypeFromTicker,
  chartVarFromTicker,
  derivePortfolio,
  mapRowsToLedgerTx,
  type LivePrice,
  type PriceProvider,
  type TransactionRow,
} from "../../src/lib/portfolio/derive";

let seq = 0;
function row(partial: Partial<TransactionRow>): TransactionRow {
  seq += 1;
  return {
    id: `tx-${seq}`,
    date: "2026-01-01",
    ticker: "AAPL",
    type: "buy",
    qty: 1,
    price: 100,
    fx: 1,
    fee: 0,
    created_at: `2026-01-01T00:00:${String(seq).padStart(2, "0")}.000Z`,
    ...partial,
  };
}

function provider(prices: Record<string, LivePrice | null>): PriceProvider {
  return async (tickers) =>
    Object.fromEntries(tickers.map((t) => [t, prices[t] ?? null]));
}

const TODAY = new Date("2026-06-11T12:00:00Z");

test.describe("mapRowsToLedgerTx", () => {
  test("filtra tipos que não movem posição e linhas sem ticker", () => {
    const rows = [
      row({ type: "buy" }),
      row({ type: "sell" }),
      row({ type: "div" }),
      row({ type: "cash", ticker: null }),
    ];
    const txs = mapRowsToLedgerTx(rows);
    expect(txs.map((t) => t.type)).toEqual(["buy", "sell"]);
  });

  test("fx da linha vira fx_to_eur; qty/price null viram 0", () => {
    const txs = mapRowsToLedgerTx([
      row({ fx: 0.9, qty: null, price: null }),
    ]);
    expect(txs[0].fx_to_eur).toBe(0.9);
    expect(txs[0].qty).toBe(0);
    expect(txs[0].price).toBe(0);
  });
});

test.describe("metadata derivada do ticker", () => {
  test("cripto detectada por sufixo de moeda", () => {
    expect(assetTypeFromTicker("BTC-USD")).toBe("crypto");
    expect(assetTypeFromTicker("ETH-EUR")).toBe("crypto");
    expect(assetTypeFromTicker("AAPL")).toBe("stock");
  });

  test("chartVar é determinístico e estável por ticker", () => {
    expect(chartVarFromTicker("AAPL")).toBe(chartVarFromTicker("AAPL"));
    expect(["chart-1", "chart-2", "chart-4", "chart-5"]).toContain(
      chartVarFromTicker("MSFT")
    );
  });
});

test.describe("derivePortfolio — conversão e agregados em EUR", () => {
  test("valor de mercado usa preço live × fx→EUR", async () => {
    // 10 AAPL @ 100 USD, fx compra 0.9 → custo 900 EUR
    const rows = [row({ ticker: "AAPL", qty: 10, price: 100, fx: 0.9 })];
    // preço live 120 USD, fx live 0.8 → 96 EUR/unid → 960 EUR
    const { holdings, summary } = await derivePortfolio(
      rows,
      provider({
        AAPL: { price: 120, currency: "USD", name: "Apple Inc.", fxToEur: 0.8 },
      }),
      TODAY
    );

    const h = holdings[0];
    expect(h.costBasisEur).toBeCloseTo(900, 6);
    expect(h.currentPriceEur).toBeCloseTo(96, 6);
    expect(h.marketValueEur).toBeCloseTo(960, 6);
    expect(h.unrealizedEur).toBeCloseTo(60, 6);
    expect(h.name).toBe("Apple Inc.");
    expect(h.status).toBe("active");
    expect(summary.totalValueEur).toBeCloseTo(960, 6);
    expect(summary.totalCostEur).toBeCloseTo(900, 6);
    expect(summary.hasPriceGaps).toBe(false);
  });

  test("realized P&L do ledger propaga; posição fechada não pede preço", async () => {
    const rows = [
      row({ ticker: "AAPL", date: "2026-01-01", qty: 10, price: 10, fx: 1 }),
      row({
        ticker: "AAPL",
        date: "2026-02-01",
        type: "sell",
        qty: 10,
        price: 20,
        fx: 1,
      }),
    ];
    let asked: string[] = [];
    const spy: PriceProvider = async (tickers) => {
      asked = tickers;
      return {};
    };
    const { holdings, summary } = await derivePortfolio(rows, spy, TODAY);

    expect(asked).toEqual([]); // sem activas → provider não é chamado por ticker
    const h = holdings[0];
    expect(h.status).toBe("closed");
    expect(h.realizedEur).toBeCloseTo(100, 6); // (20−10)×10
    expect(h.marketValueEur).toBe(0);
    expect(summary.realizedEur).toBeCloseTo(100, 6);
    expect(summary.openPositions).toBe(0);
  });

  test("preço em falta marca priceMissing e hasPriceGaps", async () => {
    const rows = [row({ ticker: "XYZ", qty: 5, price: 10, fx: 1 })];
    const { holdings, summary } = await derivePortfolio(
      rows,
      provider({ XYZ: null }),
      TODAY
    );
    expect(holdings[0].priceMissing).toBe(true);
    expect(holdings[0].marketValueEur).toBe(0);
    expect(summary.hasPriceGaps).toBe(true);
  });

  test("pctOfPortfolio reparte pelo valor de mercado das activas", async () => {
    const rows = [
      row({ ticker: "AAA", qty: 1, price: 100, fx: 1 }),
      row({ ticker: "BBB", qty: 1, price: 100, fx: 1 }),
    ];
    const { holdings } = await derivePortfolio(
      rows,
      provider({
        AAA: { price: 300, currency: "EUR", name: "AAA", fxToEur: 1 },
        BBB: { price: 100, currency: "EUR", name: "BBB", fxToEur: 1 },
      }),
      TODAY
    );
    const aaa = holdings.find((h) => h.ticker === "AAA")!;
    const bbb = holdings.find((h) => h.ticker === "BBB")!;
    expect(aaa.pctOfPortfolio).toBeCloseTo(75, 6);
    expect(bbb.pctOfPortfolio).toBeCloseTo(25, 6);
    // holdings ordenadas por valor de mercado desc
    expect(holdings[0].ticker).toBe("AAA");
  });

  test("ledger vazio devolve sumário a zero sem chamar o provider", async () => {
    let called = false;
    const spy: PriceProvider = async (t) => {
      called = true;
      return Object.fromEntries(t.map((x) => [x, null]));
    };
    const { holdings, summary } = await derivePortfolio([], spy, TODAY);
    expect(holdings).toEqual([]);
    expect(called).toBe(false);
    expect(summary.totalValueEur).toBe(0);
    expect(summary.openPositions).toBe(0);
  });
});
