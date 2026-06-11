// Sandbox Fable 5 — tipos das tabelas f5_* e das vistas derivadas.
// src/types/database.ts (gerado) não inclui as tabelas f5_* de propósito:
// regenerá-lo arrastaria migrations de trabalho em curso no projecto raiz.
// O cast necessário fica isolado em f5Table() para não espalhar eslint-disable.

export type F5AssetType = "stock" | "etf" | "crypto";
export type F5Currency = "EUR" | "USD" | "BRL";
export type F5TxType = "buy" | "sell";

// ─── Linhas das tabelas ───────────────────────────────────────────────────────

export interface F5Asset {
  ticker: string;
  asset_type: F5AssetType;
  name: string | null;
  created_at: string;
}

export interface F5Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  ticker: string;
  type: F5TxType;
  qty: number;
  price: number;
  currency: F5Currency;
  fee: number;
  fx_to_eur: number; // taxa moeda→EUR capturada na criação (pivot EUR fixo)
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface F5PriceCacheRow {
  ticker: string;
  price: number;
  currency: string;
  name: string | null;
  fetched_at: string;
}

export interface F5Settings {
  base_currency: F5Currency;
  refresh_interval_minutes: number;
}

// ─── Vistas derivadas (overview) ─────────────────────────────────────────────

export interface F5HoldingRow {
  ticker: string;
  name: string | null;
  asset_type: F5AssetType;
  openQty: number;
  avgCostBase: number | null; // custo médio/unidade na moeda base
  investedBase: number | null; // openQty × avgCost (posições abertas)
  currentPrice: number | null; // na moeda da cotação Yahoo
  quoteCurrency: string | null;
  marketValueBase: number | null;
  unrealizedBase: number | null;
  realizedBase: number;
  feesBase: number;
  pctOfPortfolio: number; // % do valor de mercado das abertas
  status: "active" | "closed";
  holdDays: number;
  cycleStartDate: string | null;
  priceIsStale: boolean;
  priceFetchedAt: string | null;
  spark30d: number[] | null; // closes 30d reais (só com withSparklines)
  pct30: number | null;
}

export interface F5Summary {
  total_value: number; // valor de mercado das posições abertas
  invested_open: number; // custo das posições abertas
  unrealized_total: number;
  realized_total: number;
  fees_total: number;
  gain_total: number; // realized + unrealized
  active_count: number;
  closed_count: number;
  tx_count: number;
  base_currency: F5Currency;
  prices_fetched_at: string | null; // cotação mais antiga do conjunto
  stale_tickers: string[];
}

export interface F5Allocation {
  asset_type: F5AssetType;
  value: number;
  pct: number;
}

export interface F5Overview {
  holdings: F5HoldingRow[];
  summary: F5Summary;
  allocation: F5Allocation[];
  settings: F5Settings;
}

// ─── Acesso às tabelas ───────────────────────────────────────────────────────

type F5TableName =
  | "f5_transactions"
  | "f5_assets"
  | "f5_price_cache"
  | "f5_settings";

export function f5Table(supabase: unknown, table: F5TableName) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table);
}
