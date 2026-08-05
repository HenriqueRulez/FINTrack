// Camada de derivação do portfólio (achado F-03): transforma o ledger de
// transações — a ÚNICA fonte de verdade — em holdings e sumário prontos para a
// UI, todos em EUR (moeda base fixa, decisão do dono). Enriquece com preço live
// convertido a EUR (F-01) via um PriceProvider injectável — mantém este módulo
// puro (zero I/O directo) e testável com preços mockados.
//
// O motor de custo médio / realized P&L vive em ./ledger.ts; aqui só se compõe
// o resultado com preços de mercado. As rotas e páginas (Etapa 3) consomem
// derivePortfolio; o write path (Etapa 2) usa validateLedger de ./ledger.ts.

import { buildLedger, type LedgerTransaction, type TickerAggregate } from "./ledger";
import type { Tables } from "@/types/database";

// Linha crua da tabela transactions (subconjunto usado na derivação).
export type TransactionRow = Pick<
  Tables<"transactions">,
  "id" | "date" | "ticker" | "type" | "qty" | "price" | "fx" | "fee" | "created_at"
>;

// Preço live de um ticker, já com o câmbio moeda→EUR resolvido.
export interface LivePrice {
  price: number; // preço na moeda nativa do activo
  currency: string; // moeda nativa (ex.: "USD")
  name: string; // nome vindo do Yahoo (metadata derivada — decisão do dono)
  fxToEur: number; // 1 unidade da moeda nativa em EUR
}

// Injecção: dado um conjunto de tickers, devolve o preço live de cada um (ou
// null se indisponível). A implementação real (Yahoo) vive em ./prices.ts.
export type PriceProvider = (
  tickers: string[]
) => Promise<Record<string, LivePrice | null>>;

export interface DerivedHolding {
  ticker: string;
  name: string;
  assetType: "stock" | "etf" | "crypto" | "other";
  chartVar: string; // variável CSS estável por ticker (coloração da UI)
  shares: number; // qty aberta (0 se fechada)
  currency: string; // moeda nativa do activo (para exibição)
  avgCostEur: number; // custo médio/unidade em EUR
  costBasisEur: number; // shares × avgCostEur
  currentPriceEur: number | null; // preço live em EUR (null se sem preço/fechada)
  marketValueEur: number; // shares × currentPriceEur (0 se fechada/sem preço)
  unrealizedEur: number; // marketValueEur − costBasisEur (0 se sem preço)
  unrealizedPct: number; // unrealizedEur / costBasisEur × 100
  realizedEur: number; // P&L realizado acumulado (do ledger)
  feesEur: number;
  status: "active" | "closed";
  holdDays: number;
  pctOfPortfolio: number; // % do valor de mercado das posições activas
  priceMissing: boolean; // true se activa mas sem preço live (valor não fiável)
}

export interface DerivedSummary {
  totalValueEur: number; // soma do valor de mercado das activas
  totalCostEur: number; // soma do custo das activas
  unrealizedEur: number;
  unrealizedPct: number;
  realizedEur: number; // realized acumulado de TODAS (activas + fechadas)
  openPositions: number;
  hasPriceGaps: boolean; // alguma posição activa ficou sem preço live
}

export interface DerivedPortfolio {
  holdings: DerivedHolding[];
  summary: DerivedSummary;
}

// ── Metadata derivada do ticker (decisão do dono: sem tabela de instruments) ──

// Cripto no Yahoo usa sufixo de moeda (ex.: BTC-USD, ETH-EUR); tudo o resto
// assume-se "stock". A distinção fina stock/etf não é inferível do ticker — a UI
// pode refiná-la depois; aqui o objectivo é coloração e agrupamento estáveis.
export function assetTypeFromTicker(ticker: string): DerivedHolding["assetType"] {
  return /-(USD|EUR|USDT|BTC)$/i.test(ticker) ? "crypto" : "stock";
}

const CHART_VARS = ["chart-1", "chart-2", "chart-4", "chart-5"] as const;

// Atribuição determinística e estável: o mesmo ticker mapeia sempre à mesma cor.
export function chartVarFromTicker(ticker: string): string {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = (hash * 31 + ticker.charCodeAt(i)) | 0;
  }
  return CHART_VARS[Math.abs(hash) % CHART_VARS.length];
}

// Converte linhas da tabela em transacções do ledger. Só buy/sell alimentam o
// motor de posições (cash/div/int/conv não movem quantidade de activo). fx da
// linha = fx_to_eur (câmbio moeda→EUR capturado na criação).
export function mapRowsToLedgerTx(rows: TransactionRow[]): LedgerTransaction[] {
  return rows
    .filter((r) => (r.type === "buy" || r.type === "sell") && r.ticker !== null)
    .map((r) => ({
      id: r.id,
      date: r.date,
      ticker: r.ticker as string,
      type: r.type as "buy" | "sell",
      qty: r.qty ?? 0,
      price: r.price ?? 0,
      fee: r.fee ?? 0,
      fx_to_eur: r.fx ?? 1,
      created_at: r.created_at,
    }));
}

function buildHolding(
  agg: TickerAggregate,
  live: LivePrice | null,
  totalActiveValueEur: number
): DerivedHolding {
  const active = agg.status === "active";
  const currentPriceEur = live ? live.price * live.fxToEur : null;
  const priceMissing = active && currentPriceEur === null;

  const marketValueEur =
    active && currentPriceEur !== null ? agg.openQty * currentPriceEur : 0;
  const unrealizedEur =
    active && currentPriceEur !== null ? marketValueEur - agg.investedEur : 0;
  const unrealizedPct =
    agg.investedEur > 0 ? (unrealizedEur / agg.investedEur) * 100 : 0;
  const pctOfPortfolio =
    active && totalActiveValueEur > 0
      ? (marketValueEur / totalActiveValueEur) * 100
      : 0;

  return {
    ticker: agg.ticker,
    name: live?.name ?? agg.ticker,
    assetType: assetTypeFromTicker(agg.ticker),
    chartVar: chartVarFromTicker(agg.ticker),
    shares: agg.openQty,
    currency: live?.currency ?? "EUR",
    avgCostEur: agg.avgCostEur,
    costBasisEur: agg.investedEur,
    currentPriceEur,
    marketValueEur,
    unrealizedEur,
    unrealizedPct,
    realizedEur: agg.realizedEur,
    feesEur: agg.feesEur,
    status: agg.status,
    holdDays: agg.holdDays,
    pctOfPortfolio,
    priceMissing,
  };
}

// Deriva holdings + sumário a partir das linhas de transações do utilizador.
// getPrices só é chamado para os tickers com posição ACTIVA (fechadas valem 0).
export async function derivePortfolio(
  rows: TransactionRow[],
  getPrices: PriceProvider,
  today: Date = new Date()
): Promise<DerivedPortfolio> {
  const txs = mapRowsToLedgerTx(rows);
  const { aggregates } = buildLedger(txs, today);

  const aggList = [...aggregates.values()];
  const activeTickers = aggList
    .filter((a) => a.status === "active")
    .map((a) => a.ticker);

  const prices = activeTickers.length > 0 ? await getPrices(activeTickers) : {};

  // Valor total das activas primeiro — necessário para o % de cada posição.
  let totalActiveValueEur = 0;
  for (const agg of aggList) {
    if (agg.status !== "active") continue;
    const live = prices[agg.ticker] ?? null;
    if (live) totalActiveValueEur += agg.openQty * live.price * live.fxToEur;
  }

  const holdings = aggList
    .map((agg) =>
      buildHolding(agg, prices[agg.ticker] ?? null, totalActiveValueEur)
    )
    .sort((a, b) => b.marketValueEur - a.marketValueEur);

  const active = holdings.filter((h) => h.status === "active");
  const totalCostEur = active.reduce((s, h) => s + h.costBasisEur, 0);
  const totalValueEur = active.reduce((s, h) => s + h.marketValueEur, 0);
  const unrealizedEur = totalValueEur - totalCostEur;

  const summary: DerivedSummary = {
    totalValueEur,
    totalCostEur,
    unrealizedEur,
    unrealizedPct: totalCostEur > 0 ? (unrealizedEur / totalCostEur) * 100 : 0,
    realizedEur: holdings.reduce((s, h) => s + h.realizedEur, 0),
    openPositions: active.length,
    hasPriceGaps: active.some((h) => h.priceMissing),
  };

  return { holdings, summary };
}
