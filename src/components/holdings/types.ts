// ---------------------------------------------------------------------------
// Shared types for the Holdings page — mirrors GET /api/portfolio/holdings
// ---------------------------------------------------------------------------

export type AssetType = "stock" | "etf" | "crypto" | "other";

export interface HoldingRow {
  ticker: string;
  name: string;
  assetType: AssetType;
  chartVar: string;
  shares: number;
  currency: string;
  avgCostEur: number;
  costBasisEur: number;
  currentPriceEur: number | null;
  marketValueEur: number;
  unrealizedEur: number;
  unrealizedPct: number;
  realizedEur: number;
  pctOfPortfolio: number;
  status: "active" | "closed";
  priceMissing: boolean;
}

export interface HoldingsKpis {
  totalValueEur: number;
  holdingsValueEur: number;
  unrealizedEur: number;
  realizedEur: number;
  totalPlEur: number;
  activeCount: number;
  soldCount: number;
  hasPriceGaps: boolean;
}

export interface HoldingsApiResponse {
  data: {
    positions: HoldingRow[];
    kpis: HoldingsKpis;
  };
}
