// Cobertura final do M-01 do AUDIT: os casos que a suite ainda não exercitava —
// fx multi-moeda ao longo de várias datas na série do gráfico e na derivação, e
// P&L realizado em CICLOS REABERTOS com fx diferente em cada perna (custo médio
// que reinicia ao reabrir). Mais os edges que faltavam: fees em compra E venda
// com fx≠1, e oversell rejeitado depois de uma reabertura. Funções puras; preços,
// closes e fx injectados — zero rede, zero banco.
// Correr com: npx playwright test -c playwright.unit.config.ts

import { expect, test } from "@playwright/test";
import {
  buildLedger,
  buildTimeline,
  type LedgerTransaction,
} from "../../src/lib/portfolio/ledger";
import { buildChartSeries } from "../../src/lib/portfolio/chart-series";
import {
  derivePortfolio,
  type LivePrice,
  type PriceProvider,
  type TransactionRow,
} from "../../src/lib/portfolio/derive";

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

function row(p: Partial<TransactionRow>): TransactionRow {
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
    ...p,
  };
}

function provider(prices: Record<string, LivePrice | null>): PriceProvider {
  return async (tickers) =>
    Object.fromEntries(tickers.map((t) => [t, prices[t] ?? null]));
}

const TODAY = new Date("2026-06-11T12:00:00Z");

// ── fx no timeline / série do gráfico (multi-moeda, fx a variar por data) ─────

test.describe("buildChartSeries — multi-moeda (USD + GBP) com fx por data", () => {
  test("valor de mercado e invested por data usam closes em EUR (fx embebido) + carry-forward", () => {
    // Ledger em duas moedas, comprado no mesmo dia; invested vem do ledger em EUR.
    const timeline = buildTimeline([
      // 10 AAPL @ 100 USD, fx 0.90 → 900€
      tx({ date: "2026-01-01", ticker: "AAPL", qty: 10, price: 100, fx_to_eur: 0.9 }),
      // 20 VOD.L @ 5 GBP, fx 1.10 → 110€
      tx({ date: "2026-01-01", ticker: "VOD.L", qty: 20, price: 5, fx_to_eur: 1.1 }),
    ]);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].investedEur).toBeCloseTo(1010, 6); // 900 + 110

    // Closes JÁ em EUR = preço nativo × fx DESSE dia (fx varia entre 01 e 02).
    // AAPL: 01 → 100 USD × 0.90 = 90€; 02 → 110 USD × 0.85 = 93.5€
    // VOD.L: 01 → 5 GBP × 1.10 = 5.5€; 02 → 6 GBP × 1.15 = 6.9€
    const series = buildChartSeries({
      timeline,
      closesByTicker: {
        AAPL: { "2026-01-01": 90, "2026-01-02": 93.5 },
        "VOD.L": { "2026-01-01": 5.5, "2026-01-02": 6.9 },
      },
      startDate: "2026-01-01",
      endDate: "2026-01-03",
    });

    expect(series).toHaveLength(3);
    // Dia 01: 10×90 + 20×5.5 = 1010
    expect(series[0]).toMatchObject({ date: "2026-01-01", portfolio: 1010, invested: 1010 });
    // Dia 02: 10×93.5 + 20×6.9 = 935 + 138 = 1073 (fx novo em ambas as moedas)
    expect(series[1]).toMatchObject({ date: "2026-01-02", portfolio: 1073, invested: 1010 });
    // Dia 03: sem candle → carry-forward do EUR de 02 (o fx do dia 02 fica retido)
    expect(series[2]).toMatchObject({ date: "2026-01-03", portfolio: 1073, invested: 1010 });
  });
});

test.describe("derivePortfolio — multi-moeda (USD + GBP) activas em simultâneo", () => {
  test("cada posição converte pelo seu fx→EUR; sumário agrega em EUR sem misturar moedas", async () => {
    const rows = [
      // 10 AAPL @ 100 USD, fx compra 0.90 → custo 900€
      row({ ticker: "AAPL", qty: 10, price: 100, fx: 0.9 }),
      // 20 VOD.L @ 5 GBP, fx compra 1.10 → custo 110€
      row({ ticker: "VOD.L", qty: 20, price: 5, fx: 1.1 }),
    ];
    const { holdings, summary } = await derivePortfolio(
      rows,
      provider({
        AAPL: { price: 120, currency: "USD", name: "Apple Inc.", fxToEur: 0.85 },
        "VOD.L": { price: 6, currency: "GBP", name: "Vodafone", fxToEur: 1.15 },
      }),
      TODAY
    );

    const aapl = holdings.find((h) => h.ticker === "AAPL")!;
    const vod = holdings.find((h) => h.ticker === "VOD.L")!;

    // AAPL: 120 USD × 0.85 = 102€/unid → 1020€; custo 900€ → +120€
    expect(aapl.currentPriceEur).toBeCloseTo(102, 6);
    expect(aapl.marketValueEur).toBeCloseTo(1020, 6);
    expect(aapl.unrealizedEur).toBeCloseTo(120, 6);
    // VOD.L: 6 GBP × 1.15 = 6.9€/unid → 138€; custo 110€ → +28€
    expect(vod.currentPriceEur).toBeCloseTo(6.9, 6);
    expect(vod.marketValueEur).toBeCloseTo(138, 6);
    expect(vod.unrealizedEur).toBeCloseTo(28, 6);

    // Sumário: soma correcta em EUR (1158 valor, 1010 custo, 148 ganho).
    expect(summary.totalValueEur).toBeCloseTo(1158, 6);
    expect(summary.totalCostEur).toBeCloseTo(1010, 6);
    expect(summary.unrealizedEur).toBeCloseTo(148, 6);
    expect(summary.openPositions).toBe(2);
    // % reparte pelo valor de mercado das activas
    expect(aapl.pctOfPortfolio).toBeCloseTo((1020 / 1158) * 100, 6);
    expect(vod.pctOfPortfolio).toBeCloseTo((138 / 1158) * 100, 6);
    // ordenadas por valor de mercado desc
    expect(holdings.map((h) => h.ticker)).toEqual(["AAPL", "VOD.L"]);
  });
});

// ── P&L realizado em ciclos reabertos, com fx diferente em cada perna ─────────

test.describe("ciclos reabertos com fx — custo médio reinicia ao reabrir", () => {
  test("venda parcial → venda total (fecha) → recompra (reabre): avg do ciclo novo ignora o antigo", () => {
    const txs = [
      // Ciclo 1: 10 @ 100 USD, fx 0.90 → 900€, avg 90€
      tx({ date: "2026-01-01", qty: 10, price: 100, fx_to_eur: 0.9 }),
      // venda parcial 4 @ 120 USD, fx 0.85 → proceeds 408€; custo saído 4×90=360 → realized +48
      tx({ date: "2026-02-01", type: "sell", qty: 4, price: 120, fx_to_eur: 0.85 }),
      // venda dos restantes 6 @ 125 USD, fx 0.88 → proceeds 660€; custo saído 6×90=540 → realized +120 → fecha
      tx({ date: "2026-03-01", type: "sell", qty: 6, price: 125, fx_to_eur: 0.88 }),
      // reabre: 5 @ 110 USD, fx 0.80 → 440€, avg 88€
      tx({ date: "2026-05-01", qty: 5, price: 110, fx_to_eur: 0.8 }),
    ];
    const agg = buildLedger(txs, TODAY).aggregates.get("TEST")!;

    expect(agg.status).toBe("active");
    expect(agg.openQty).toBeCloseTo(5, 8);
    // avg do ciclo novo = 88€ (só a recompra), NÃO mistura com os 90€ do ciclo 1
    expect(agg.avgCostEur).toBeCloseTo(88, 8);
    expect(agg.investedEur).toBeCloseTo(440, 6);
    // realized preserva o do ciclo 1 (48 + 120 = 168€), com o fx de cada venda
    expect(agg.realizedEur).toBeCloseTo(168, 6);
    // ciclo aberto recomeça na recompra
    expect(agg.cycleStartDate).toBe("2026-05-01");
  });

  test("compra → venda total → recompra → venda total: realized soma os dois ciclos, cada um com o seu fx", () => {
    const cycle1 = [
      tx({ date: "2026-01-01", qty: 10, price: 100, fx_to_eur: 0.9 }), // 900€
      tx({ date: "2026-03-01", type: "sell", qty: 10, price: 120, fx_to_eur: 0.85 }), // 1020€ → +120
    ];
    // Ciclo 1 isolado prova o realized da 1ª perna com o seu fx.
    expect(buildLedger(cycle1, TODAY).aggregates.get("TEST")!.realizedEur).toBeCloseTo(120, 6);

    const full = [
      ...cycle1,
      tx({ date: "2026-05-01", qty: 5, price: 110, fx_to_eur: 0.8 }), // 440€, avg 88
      tx({ date: "2026-08-01", type: "sell", qty: 5, price: 130, fx_to_eur: 0.95 }), // 617.5€ → +177.5
    ];
    const agg = buildLedger(full, TODAY).aggregates.get("TEST")!;

    expect(agg.status).toBe("closed");
    expect(agg.openQty).toBe(0);
    expect(agg.investedEur).toBe(0);
    expect(agg.closedDate).toBe("2026-08-01");
    // 120 (ciclo 1, fx 0.90/0.85) + 177.5 (ciclo 2, fx 0.80/0.95) = 297.5€
    expect(agg.realizedEur).toBeCloseTo(297.5, 6);
  });
});

// ── Edges restantes: fees em ambos os lados com fx≠1, e oversell pós-reabertura ─

test.describe("fees em compra E venda com fx≠1", () => {
  test("fee de compra entra no custo e fee de venda sai dos proceeds, ambas convertidas a EUR", () => {
    const txs = [
      // 10 @ 100 USD, fx 0.90, fee 20 USD → custo 900 + 18 = 918€, avg 91.8€
      tx({ date: "2026-01-01", qty: 10, price: 100, fx_to_eur: 0.9, fee: 20 }),
      // vende 10 @ 120 USD, fx 0.85, fee 30 USD → proceeds 1020 − 25.5 = 994.5€
      tx({ date: "2026-04-01", type: "sell", qty: 10, price: 120, fx_to_eur: 0.85, fee: 30 }),
    ];
    const agg = buildLedger(txs, TODAY).aggregates.get("TEST")!;

    // realized = 994.5 − 918 = 76.5€
    expect(agg.realizedEur).toBeCloseTo(76.5, 6);
    // fees totais em EUR = 18 (compra) + 25.5 (venda) = 43.5€
    expect(agg.feesEur).toBeCloseTo(43.5, 6);
    expect(agg.status).toBe("closed");
    expect(agg.investedEur).toBe(0);
  });
});

test.describe("oversell depois de uma reabertura parcial", () => {
  test("vender mais do que o detido no ciclo reaberto regista erro e ignora a venda", () => {
    const txs = [
      tx({ date: "2026-01-01", qty: 10, price: 100 }), // abre 10
      tx({ date: "2026-02-01", type: "sell", qty: 10, price: 110 }), // fecha (realized 100)
      tx({ date: "2026-04-01", qty: 3, price: 90 }), // reabre com 3
      tx({ date: "2026-05-01", type: "sell", qty: 5, price: 120 }), // oversell: 5 > 3
    ];
    const { aggregates, errors } = buildLedger(txs, TODAY);
    const agg = aggregates.get("TEST")!;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ ticker: "TEST", attempted: 5, available: 3 });
    // modo tolerante: a venda inválida não altera o ciclo reaberto
    expect(agg.status).toBe("active");
    expect(agg.openQty).toBeCloseTo(3, 8);
    // realized só do ciclo 1 (a venda oversell foi ignorada)
    expect(agg.realizedEur).toBeCloseTo(100, 8);
    expect(agg.cycleStartDate).toBe("2026-04-01");
  });
});
