// Sandbox Fable 5 — motor de derivação do ledger (funções puras, zero I/O).
// Source of truth = f5_transactions; tudo o resto (holdings, performance,
// dashboard) deriva daqui. Valores monetários internos SEMPRE em EUR
// (qty·price·fx_to_eur) — a conversão EUR→moeda base é feita no overview.
//
// Método de custo: MÉDIO (decisão do utilizador) — o custo de cada venda é o
// preço médio de todas as compras até à data; fees de compra entram no custo,
// fees de venda saem dos proceeds.
//
// Ordem canónica: (date ASC, buy antes de sell, created_at ASC) — permite
// inserir retroactivamente uma compra no mesmo dia de uma venda existente.

import type { F5Transaction } from "./types";

const EPS = 1e-8;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface F5LedgerError {
  ticker: string;
  transactionId: string;
  date: string;
  attempted: number; // qty que se tentou vender
  available: number; // qty detida nessa altura
}

export interface F5TickerAggregate {
  ticker: string;
  openQty: number;
  avgCostEur: number; // custo médio/unidade (0 se posição fechada)
  investedEur: number; // openQty × avgCostEur
  realizedEur: number; // P&L realizado acumulado
  feesEur: number; // total de fees pagos (compras + vendas)
  buyCount: number;
  sellCount: number;
  cycleStartDate: string | null; // 1ª compra do ciclo aberto (ou do último ciclo)
  closedDate: string | null; // venda que zerou a posição (null se activa)
  status: "active" | "closed";
  holdDays: number; // activa: cycleStart→hoje; fechada: cycleStart→closedDate
}

export interface F5TimelinePoint {
  date: string; // YYYY-MM-DD
  qtyByTicker: Record<string, number>;
  investedEur: number; // custo médio acumulado das posições abertas
}

interface TickerState {
  openQty: number;
  totalCostEur: number;
  realizedEur: number;
  feesEur: number;
  buyCount: number;
  sellCount: number;
  cycleStartDate: string | null;
  closedDate: string | null;
}

export function sortLedger(txs: F5Transaction[]): F5Transaction[] {
  return [...txs].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.type !== b.type) return a.type === "buy" ? -1 : 1; // buy antes de sell
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });
}

function newState(): TickerState {
  return {
    openQty: 0,
    totalCostEur: 0,
    realizedEur: 0,
    feesEur: 0,
    buyCount: 0,
    sellCount: 0,
    cycleStartDate: null,
    closedDate: null,
  };
}

// Aplica uma transacção ao estado do ticker; devolve erro de oversell ou null.
// Em oversell a venda é IGNORADA (modo tolerante para leitura — as APIs de
// escrita rejeitam a mutação com validateLedger antes de persistir).
function applyTx(state: TickerState, tx: F5Transaction): F5LedgerError | null {
  const grossEur = tx.qty * tx.price * tx.fx_to_eur;
  const feeEur = tx.fee * tx.fx_to_eur;

  if (tx.type === "buy") {
    if (state.openQty < EPS) {
      // reabre (ou abre) um ciclo
      state.cycleStartDate = tx.date;
      state.closedDate = null;
      state.openQty = 0;
      state.totalCostEur = 0;
    }
    state.openQty += tx.qty;
    state.totalCostEur += grossEur + feeEur;
    state.feesEur += feeEur;
    state.buyCount += 1;
    return null;
  }

  // sell
  if (tx.qty > state.openQty + EPS) {
    return {
      ticker: tx.ticker,
      transactionId: tx.id,
      date: tx.date,
      attempted: tx.qty,
      available: state.openQty,
    };
  }
  const avgCost = state.openQty > EPS ? state.totalCostEur / state.openQty : 0;
  state.realizedEur += grossEur - feeEur - tx.qty * avgCost;
  state.totalCostEur -= tx.qty * avgCost;
  state.openQty -= tx.qty;
  state.feesEur += feeEur;
  state.sellCount += 1;
  if (state.openQty < EPS) {
    state.openQty = 0;
    state.totalCostEur = 0;
    state.closedDate = tx.date;
  }
  return null;
}

function holdDaysOf(state: TickerState, today: Date): number {
  if (!state.cycleStartDate) return 0;
  const start = new Date(state.cycleStartDate + "T00:00:00Z").getTime();
  const end = state.closedDate
    ? new Date(state.closedDate + "T00:00:00Z").getTime()
    : today.getTime();
  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

export function buildLedger(
  txs: F5Transaction[],
  today: Date = new Date()
): { aggregates: Map<string, F5TickerAggregate>; errors: F5LedgerError[] } {
  const states = new Map<string, TickerState>();
  const errors: F5LedgerError[] = [];

  for (const tx of sortLedger(txs)) {
    let state = states.get(tx.ticker);
    if (!state) {
      state = newState();
      states.set(tx.ticker, state);
    }
    const err = applyTx(state, tx);
    if (err) errors.push(err);
  }

  const aggregates = new Map<string, F5TickerAggregate>();
  for (const [ticker, s] of states) {
    const active = s.openQty > EPS;
    aggregates.set(ticker, {
      ticker,
      openQty: s.openQty,
      avgCostEur: active ? s.totalCostEur / s.openQty : 0,
      investedEur: active ? s.totalCostEur : 0,
      realizedEur: s.realizedEur,
      feesEur: s.feesEur,
      buyCount: s.buyCount,
      sellCount: s.sellCount,
      cycleStartDate: s.cycleStartDate,
      closedDate: active ? null : s.closedDate,
      status: active ? "active" : "closed",
      holdDays: holdDaysOf(s, today),
    });
  }
  return { aggregates, errors };
}

// Conveniência para as APIs de escrita: valida o ledger candidato em memória.
export function validateLedger(txs: F5Transaction[]): F5LedgerError[] {
  return buildLedger(txs).errors;
}

export function formatLedgerError(e: F5LedgerError): string {
  const [y, m, d] = e.date.split("-");
  return `Venda de ${e.attempted} ${e.ticker} em ${d}/${m}/${y} excede a quantidade detida (${e.available} disponível)`;
}

// Série cumulativa para o gráfico "Portfolio over time": um ponto por data
// com transacções (após processar todas as txs dessa data).
export function buildTimeline(txs: F5Transaction[]): F5TimelinePoint[] {
  const states = new Map<string, TickerState>();
  const points: F5TimelinePoint[] = [];
  const sorted = sortLedger(txs);

  const snapshot = (date: string): F5TimelinePoint => {
    const qtyByTicker: Record<string, number> = {};
    let investedEur = 0;
    for (const [ticker, s] of states) {
      if (s.openQty > EPS) {
        qtyByTicker[ticker] = s.openQty;
        investedEur += s.totalCostEur;
      }
    }
    return { date, qtyByTicker, investedEur };
  };

  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i];
    let state = states.get(tx.ticker);
    if (!state) {
      state = newState();
      states.set(tx.ticker, state);
    }
    applyTx(state, tx); // oversells ignorados (modo tolerante)

    const isLastOfDate = i === sorted.length - 1 || sorted[i + 1].date !== tx.date;
    if (isLastOfDate) points.push(snapshot(tx.date));
  }
  return points;
}
