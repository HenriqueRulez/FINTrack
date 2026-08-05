// Cobertura financeira adicional (M-01 do AUDIT): casos que os specs base não
// exercitam — fx diferente entre compra e venda, custo médio com compra/venda/
// compra intercaladas, sumário derivado com posição activa + fechada, e edge do
// recompute de total. Funções puras; sem rede, sem banco.
// Correr com: npx playwright test -c playwright.unit.config.ts

import { expect, test } from "@playwright/test";
import {
  buildLedger,
  buildTimeline,
  type LedgerTransaction,
} from "../../src/lib/portfolio/ledger";
import {
  derivePortfolio,
  type LivePrice,
  type PriceProvider,
} from "../../src/lib/portfolio/derive";
import { computeTotal } from "../../src/lib/validations/transactions";

let seq = 0;
function tx(p: Partial<LedgerTransaction>): LedgerTransaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    date: "2026-01-01",
    ticker: "TEST",
    type: "buy",
    qty: 1,
    price: 100,
    fee: 0,
    fx_to_eur: 1,
    created_at: `2026-01-01T00:00:${String(seq).padStart(2, "0")}.000Z`,
    ...p,
  };
}

const TODAY = new Date("2026-06-11T12:00:00Z");

test.describe("P&L realizado com fx diferente entre compra e venda", () => {
  test("comprar em USD a 0.9 e vender a 0.85 realiza em EUR corretamente", () => {
    const txs = [
      tx({ date: "2026-01-01", qty: 10, price: 100, fx_to_eur: 0.9 }), // custo 900€
      tx({
        date: "2026-03-01",
        type: "sell",
        qty: 10,
        price: 120,
        fx_to_eur: 0.85,
      }), // proceeds 1020€
    ];
    const agg = buildLedger(txs, TODAY).aggregates.get("TEST")!;

    expect(agg.realizedEur).toBeCloseTo(1020 - 900, 6); // 120€
    expect(agg.status).toBe("closed");
    expect(agg.investedEur).toBe(0);
  });
});

test.describe("custo médio em compra → venda parcial → compra", () => {
  test("avg recompõe-se com a compra nova sobre a posição remanescente", () => {
    const txs = [
      tx({ date: "2026-01-01", qty: 10, price: 100 }), // avg 100, cost 1000
      tx({ date: "2026-02-01", type: "sell", qty: 4, price: 150 }), // realized 200, resta 6 @100
      tx({ date: "2026-03-01", qty: 6, price: 200 }), // + 1200 → 12 @ 150
    ];
    const agg = buildLedger(txs, TODAY).aggregates.get("TEST")!;

    expect(agg.openQty).toBeCloseTo(12, 8);
    expect(agg.avgCostEur).toBeCloseTo(150, 8); // (600 + 1200) / 12
    expect(agg.investedEur).toBeCloseTo(1800, 8);
    expect(agg.realizedEur).toBeCloseTo(200, 8); // 4 × (150 − 100)
    expect(agg.status).toBe("active");
  });
});

test.describe("buildTimeline preserva fx no invested", () => {
  test("invested do ponto usa custo já convertido a EUR", () => {
    const timeline = buildTimeline([
      tx({ date: "2026-01-01", qty: 10, price: 100, fx_to_eur: 0.9 }),
    ]);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].investedEur).toBeCloseTo(900, 6);
  });
});

test.describe("derivePortfolio — activa + fechada em simultâneo", () => {
  test("realized agrega através de tickers; só a activa pede preço", async () => {
    const rows = [
      // AAA activa
      { id: "a1", date: "2026-01-01", ticker: "AAA", type: "buy", qty: 2, price: 100, fx: 1, fee: 0, created_at: "2026-01-01T00:00:01Z" },
      // BBB comprada e vendida → fechada, realized 20€
      { id: "b1", date: "2026-01-01", ticker: "BBB", type: "buy", qty: 5, price: 10, fx: 1, fee: 0, created_at: "2026-01-01T00:00:02Z" },
      { id: "b2", date: "2026-02-01", ticker: "BBB", type: "sell", qty: 5, price: 14, fx: 1, fee: 0, created_at: "2026-02-01T00:00:03Z" },
    ];

    let asked: string[] = [];
    const prices: Record<string, LivePrice> = {
      AAA: { price: 150, currency: "EUR", name: "Triple A", fxToEur: 1 },
    };
    const provider: PriceProvider = async (tickers) => {
      asked = [...tickers].sort();
      return Object.fromEntries(tickers.map((t) => [t, prices[t] ?? null]));
    };

    const { holdings, summary } = await derivePortfolio(rows, provider, TODAY);

    expect(asked).toEqual(["AAA"]); // BBB fechada não é cotada
    const aaa = holdings.find((h) => h.ticker === "AAA")!;
    const bbb = holdings.find((h) => h.ticker === "BBB")!;

    expect(aaa.status).toBe("active");
    expect(aaa.marketValueEur).toBeCloseTo(300, 6); // 2 × 150
    expect(aaa.unrealizedEur).toBeCloseTo(100, 6); // 300 − 200
    expect(bbb.status).toBe("closed");
    expect(bbb.marketValueEur).toBe(0);
    expect(bbb.realizedEur).toBeCloseTo(20, 6); // 5 × (14 − 10)

    expect(summary.totalValueEur).toBeCloseTo(300, 6);
    expect(summary.totalCostEur).toBeCloseTo(200, 6);
    expect(summary.realizedEur).toBeCloseTo(20, 6); // agrega AAA(0) + BBB(20)
    expect(summary.openPositions).toBe(1);
    expect(summary.hasPriceGaps).toBe(false);
  });
});

test.describe("computeTotal — edge de fee elevada", () => {
  test("venda com fee acima dos proceeds dá total líquido negativo", () => {
    // documenta o comportamento: proceeds 10, fee 15 → −5 (saída líquida de caixa)
    expect(computeTotal("sell", 1, 10, 15)).toBe(-5);
  });
});
