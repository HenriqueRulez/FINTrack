// ---------------------------------------------------------------------------
// Mock data for the Holdings page — Phase 1 (no real API)
// ---------------------------------------------------------------------------

export type AssetClass = "Stocks" | "ETFs" | "Crypto" | "Other";
export type ChartVar = "chart-1" | "chart-2" | "chart-4" | "chart-5";
export type Currency = "EUR" | "USD" | "Native";
export type NativeCurrency = "EUR" | "USD";

export interface HoldingItem {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  chartVar: ChartVar;
  shares: number;
  native: NativeCurrency;
  avgCost: number; // in native currency
  costBasis: number; // in native currency
  currentPrice: number; // in native currency
  sold: boolean;
}

export const HOLDINGS: HoldingItem[] = [
  {
    ticker: "AMAT",
    name: "Applied Materials, Inc.",
    assetClass: "Stocks",
    chartVar: "chart-1",
    shares: 12,
    native: "USD",
    avgCost: 556,
    costBasis: 6672,
    currentPrice: 433.62,
    sold: false,
  },
  {
    ticker: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    assetClass: "ETFs",
    chartVar: "chart-2",
    shares: 60,
    native: "EUR",
    avgCost: 108.6,
    costBasis: 6516,
    currentPrice: 122.4,
    sold: false,
  },
  {
    ticker: "CSPX",
    name: "iShares Core S&P 500 UCITS ETF",
    assetClass: "ETFs",
    chartVar: "chart-2",
    shares: 14,
    native: "EUR",
    avgCost: 480.2,
    costBasis: 6722.8,
    currentPrice: 512.4,
    sold: false,
  },
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    assetClass: "Stocks",
    chartVar: "chart-1",
    shares: 8,
    native: "USD",
    avgCost: 180,
    costBasis: 1440,
    currentPrice: 178.4,
    sold: false,
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    assetClass: "Stocks",
    chartVar: "chart-1",
    shares: 5,
    native: "USD",
    avgCost: 320,
    costBasis: 1600,
    currentPrice: 412.2,
    sold: false,
  },
  {
    ticker: "BTC",
    name: "Bitcoin",
    assetClass: "Crypto",
    chartVar: "chart-4",
    shares: 0.045,
    native: "USD",
    avgCost: 42000,
    costBasis: 1890,
    currentPrice: 67400,
    sold: false,
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    assetClass: "Stocks",
    chartVar: "chart-1",
    shares: 4,
    native: "USD",
    avgCost: 245,
    costBasis: 980,
    currentPrice: 218.3,
    sold: true,
  },
  {
    ticker: "GLD",
    name: "SPDR Gold Shares",
    assetClass: "Other",
    chartVar: "chart-5",
    shares: 6,
    native: "USD",
    avgCost: 195,
    costBasis: 1170,
    currentPrice: 198.2,
    sold: true,
  },
];

// ---------------------------------------------------------------------------
// FX mock table
// ---------------------------------------------------------------------------

export const FX: Record<string, Record<string, number>> = {
  EUR: { EUR: 1, USD: 1.09 },
  USD: { EUR: 0.92, USD: 1 },
};

export const SYMBOL: Record<string, string> = {
  EUR: "€",
  USD: "$",
  Native: "",
};

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export function convertAmount(
  amount: number,
  from: NativeCurrency,
  to: "EUR" | "USD"
): number {
  if (from === to) return amount;
  return amount * (FX[from]?.[to] ?? 1);
}

export function formatMoney(
  n: number,
  cur: "EUR" | "USD",
  opts?: { signDisplay?: "always" | "never" | "auto" }
): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: opts?.signDisplay ?? "auto",
  }).format(n);
}

export function formatMoneyNative(n: number, cur: NativeCurrency): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
