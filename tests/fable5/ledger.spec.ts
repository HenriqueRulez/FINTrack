// Testes unitários do motor de derivação do ledger (src/lib/fable5/ledger.ts)
// — o coração financeiro do sandbox. Funções puras, sem browser nem banco.
// Correr com: npx playwright test -c playwright.fable5.config.ts ledger

import { expect, test } from "@playwright/test";
import {
  buildLedger,
  buildTimeline,
  formatLedgerError,
  validateLedger,
} from "../../src/lib/fable5/ledger";
import type { F5Transaction } from "../../src/lib/fable5/types";

let seq = 0;
function tx(partial: Partial<F5Transaction>): F5Transaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    date: "2026-01-01",
    ticker: "TEST",
    type: "buy",
    qty: 1,
    price: 100,
    currency: "EUR",
    fee: 0,
    fx_to_eur: 1,
    notes: null,
    created_at: `2026-01-01T00:00:${String(seq).padStart(2, "0")}.000Z`,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

const TODAY = new Date("2026-06-11T12:00:00Z");

test.describe("custo médio (decisão do utilizador)", () => {
  test("exemplo canónico: 1@100 + 6@200, vende 2@250", () => {
    const txs = [
      tx({ date: "2026-01-01", qty: 1, price: 100 }),
      tx({ date: "2026-02-01", qty: 6, price: 200 }),
      tx({ date: "2026-03-01", type: "sell", qty: 2, price: 250 }),
    ];
    const { aggregates, errors } = buildLedger(txs, TODAY);
    const agg = aggregates.get("TEST")!;

    expect(errors).toHaveLength(0);
    const avgCost = 1300 / 7; // (1×100 + 6×200) / 7
    expect(agg.avgCostEur).toBeCloseTo(avgCost, 8);
    expect(agg.realizedEur).toBeCloseTo(2 * (250 - avgCost), 8);
    expect(agg.openQty).toBeCloseTo(5, 8);
    expect(agg.investedEur).toBeCloseTo(5 * avgCost, 8);
    expect(agg.status).toBe("active");
  });

  test("fees: compra entra no custo, venda sai dos proceeds", () => {
    const txs = [
      tx({ qty: 10, price: 10, fee: 5 }), // custo total 105, avg 10.5
      tx({ date: "2026-02-01", type: "sell", qty: 10, price: 20, fee: 3 }),
    ];
    const { aggregates } = buildLedger(txs, TODAY);
    const agg = aggregates.get("TEST")!;

    expect(agg.realizedEur).toBeCloseTo(200 - 3 - 105, 8);
    expect(agg.feesEur).toBeCloseTo(8, 8);
    expect(agg.status).toBe("closed");
    expect(agg.investedEur).toBe(0);
  });

  test("fx_to_eur converte custo e proceeds para EUR", () => {
    const txs = [
      tx({ qty: 10, price: 100, currency: "USD", fx_to_eur: 0.9 }),
    ];
    const { aggregates } = buildLedger(txs, TODAY);
    expect(aggregates.get("TEST")!.investedEur).toBeCloseTo(900, 8);
  });
});

test.describe("validação de oversell", () => {
  test("vender mais do que detido regista erro e ignora a venda", () => {
    const txs = [
      tx({ qty: 3, price: 100 }),
      tx({ date: "2026-02-01", type: "sell", qty: 5, price: 120 }),
    ];
    const { aggregates, errors } = buildLedger(txs, TODAY);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      ticker: "TEST",
      attempted: 5,
      available: 3,
    });
    // modo tolerante: a venda inválida não altera o estado
    expect(aggregates.get("TEST")!.openQty).toBeCloseTo(3, 8);
    expect(aggregates.get("TEST")!.realizedEur).toBe(0);
  });

  test("venda cronologicamente anterior à compra é inválida", () => {
    const txs = [
      tx({ date: "2026-03-01", qty: 5, price: 100 }),
      tx({ date: "2026-02-01", type: "sell", qty: 5, price: 120 }),
    ];
    expect(validateLedger(txs)).toHaveLength(1);
  });

  test("compra retroactiva no MESMO dia de uma venda aplica-se primeiro (D4)", () => {
    const txs = [
      // venda criada primeiro (created_at mais antigo)…
      tx({ date: "2026-02-01", type: "sell", qty: 5, price: 120 }),
      // …compra inserida depois, com a mesma data — deve contar primeiro
      tx({ date: "2026-02-01", qty: 5, price: 100 }),
    ];
    expect(validateLedger(txs)).toHaveLength(0);
  });

  test("formatLedgerError produz mensagem clara em PT", () => {
    const msg = formatLedgerError({
      ticker: "AAPL",
      transactionId: "x",
      date: "2026-06-10",
      attempted: 50,
      available: 5,
    });
    expect(msg).toBe(
      "Venda de 50 AAPL em 10/06/2026 excede a quantidade detida (5 disponível)"
    );
  });
});

test.describe("ciclos e hold days (D3)", () => {
  test("fechar a posição zera o custo e marca closed com holdDays do ciclo", () => {
    const txs = [
      tx({ date: "2026-01-01", qty: 5, price: 100 }),
      tx({ date: "2026-02-01", type: "sell", qty: 5, price: 110 }),
    ];
    const agg = buildLedger(txs, TODAY).aggregates.get("TEST")!;

    expect(agg.status).toBe("closed");
    expect(agg.closedDate).toBe("2026-02-01");
    expect(agg.holdDays).toBe(31); // 01/01 → 01/02
  });

  test("recomprar reabre o ciclo: cycleStart e holdDays recomeçam", () => {
    const txs = [
      tx({ date: "2026-01-01", qty: 5, price: 100 }),
      tx({ date: "2026-02-01", type: "sell", qty: 5, price: 110 }),
      tx({ date: "2026-06-01", qty: 2, price: 90 }),
    ];
    const agg = buildLedger(txs, TODAY).aggregates.get("TEST")!;

    expect(agg.status).toBe("active");
    expect(agg.cycleStartDate).toBe("2026-06-01");
    expect(agg.holdDays).toBe(10); // 01/06 → 11/06 (TODAY)
    // custo médio do ciclo novo não herda o antigo
    expect(agg.avgCostEur).toBeCloseTo(90, 8);
    // realized do ciclo anterior preserva-se
    expect(agg.realizedEur).toBeCloseTo(5 * 10, 8);
  });
});

test.describe("buildTimeline (série do gráfico)", () => {
  test("um ponto por data, com qty e invested cumulativos", () => {
    const txs = [
      tx({ date: "2026-01-01", ticker: "AAA", qty: 2, price: 100 }),
      tx({ date: "2026-02-01", ticker: "BBB", qty: 1, price: 50 }),
      tx({ date: "2026-03-01", ticker: "AAA", type: "sell", qty: 2, price: 120 }),
    ];
    const timeline = buildTimeline(txs);

    expect(timeline).toHaveLength(3);
    expect(timeline[0]).toMatchObject({
      date: "2026-01-01",
      qtyByTicker: { AAA: 2 },
    });
    expect(timeline[0].investedEur).toBeCloseTo(200, 8);
    expect(timeline[1].qtyByTicker).toMatchObject({ AAA: 2, BBB: 1 });
    expect(timeline[1].investedEur).toBeCloseTo(250, 8);
    // após vender AAA por completo, só BBB resta
    expect(timeline[2].qtyByTicker).toEqual({ BBB: 1 });
    expect(timeline[2].investedEur).toBeCloseTo(50, 8);
  });

  test("múltiplas transacções no mesmo dia geram um único ponto", () => {
    const txs = [
      tx({ date: "2026-01-01", qty: 1, price: 100 }),
      tx({ date: "2026-01-01", qty: 2, price: 110 }),
    ];
    const timeline = buildTimeline(txs);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].qtyByTicker.TEST).toBeCloseTo(3, 8);
  });
});
