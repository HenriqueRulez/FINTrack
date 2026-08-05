// ---------------------------------------------------------------------------
// Shared types for the Performance page — mirrors GET /api/portfolio/performance
// ---------------------------------------------------------------------------

export type AssetType = "stock" | "etf" | "crypto" | "other";

export interface TradeRow {
  ticker: string;
  name: string;
  chartVar: string;
  assetType: AssetType;
  status: "active" | "closed";
  holdDays: number;
  investedEur: number;
  realizedEur: number;
  unrealizedEur: number;
  totalEur: number;
  roi: number;
}

export interface PerformanceStats {
  winRate: number;
  realizedPct: number;
  unrealizedPct: number;
  avgHoldAll: number;
  avgHoldWin: number;
  avgHoldLose: number;
  activeCount: number;
  closedCount: number;
}

export interface PerformanceApiResponse {
  data: {
    trades: TradeRow[];
    stats: PerformanceStats;
  };
}
