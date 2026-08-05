// Testes da lógica pura do write path (F-05 / A-01): recompute de total no
// servidor e guard de oversell. Sem rede, sem banco, sem auth.
// Correr com: npx playwright test -c playwright.unit.config.ts

import { expect, test } from "@playwright/test";
import { computeTotal } from "../../src/lib/validations/transactions";
import { ledgerErrorFor } from "../../src/lib/portfolio/write-guard";
import type { TransactionRow } from "../../src/lib/portfolio/derive";

let seq = 0;
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

test.describe("computeTotal (recompute no servidor)", () => {
  test("buy soma a fee ao bruto; sell subtrai-a", () => {
    expect(computeTotal("buy", 10, 100, 5)).toBe(1005);
    expect(computeTotal("sell", 10, 100, 5)).toBe(995);
  });

  test("arredonda a 4 casas (NUMERIC(15,4))", () => {
    expect(computeTotal("buy", 3, 0.33333, 0)).toBe(
      Math.round(3 * 0.33333 * 10000) / 10000
    );
  });
});

test.describe("ledgerErrorFor (guard de oversell)", () => {
  test("ledger válido devolve null", () => {
    const rows = [
      row({ date: "2026-01-01", qty: 10, price: 10 }),
      row({ date: "2026-02-01", type: "sell", qty: 4, price: 12 }),
    ];
    expect(ledgerErrorFor(rows)).toBeNull();
  });

  test("venda que excede a posição devolve mensagem PT", () => {
    const rows = [
      row({ date: "2026-01-01", qty: 3, price: 10 }),
      row({ date: "2026-02-01", type: "sell", qty: 5, price: 12 }),
    ];
    const err = ledgerErrorFor(rows);
    expect(err).toContain("excede a quantidade detida");
  });

  test("apagar a compra que suporta a venda é detectado (conjunto restante)", () => {
    // simula DELETE da compra: só resta a venda
    const remaining = [
      row({ date: "2026-02-01", type: "sell", qty: 5, price: 12 }),
    ];
    expect(ledgerErrorFor(remaining)).toContain("excede a quantidade detida");
  });
});
