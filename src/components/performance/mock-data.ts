// ---------------------------------------------------------------------------
// Mock data for the Performance page — Phase 1 (no real API)
// ---------------------------------------------------------------------------

export type Currency = "EUR" | "USD" | "Native";
export type NativeCurrency = "EUR" | "USD";
export type ChartVar = "chart-1" | "chart-2" | "chart-5";

export interface TradeItem {
  ticker: string;
  name: string;
  chart: ChartVar;
  status: "active" | "closed";
  holdDays: number;
  invested: number;   // in native currency
  realized: number;   // in native currency
  unrealized: number; // in native currency
  native: NativeCurrency;
}

export const TRADES: TradeItem[] = [
  {
    ticker: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    chart: "chart-2",
    status: "active",
    holdDays: 54,
    invested: 180.00,
    realized: 0.00,
    unrealized: 2243.65,
    native: "EUR",
  },
  {
    ticker: "AMAT",
    name: "Applied Materials, Inc.",
    chart: "chart-1",
    status: "active",
    holdDays: 110,
    invested: 6672.00,
    realized: 0.00,
    unrealized: -2191.84,
    native: "USD",
  },
  {
    ticker: "CSPX",
    name: "iShares Core S&P 500 UCITS ETF",
    chart: "chart-2",
    status: "active",
    holdDays: 72,
    invested: 6722.80,
    realized: 0.00,
    unrealized: 450.40,
    native: "EUR",
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    chart: "chart-1",
    status: "active",
    holdDays: 198,
    invested: 1600.00,
    realized: 0.00,
    unrealized: 461.00,
    native: "USD",
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    chart: "chart-1",
    status: "closed",
    holdDays: 0,
    invested: 980.00,
    realized: -106.80,
    unrealized: 0.00,
    native: "USD",
  },
  {
    ticker: "GLD",
    name: "SPDR Gold Shares",
    chart: "chart-5",
    status: "closed",
    holdDays: 0,
    invested: 1170.00,
    realized: 19.20,
    unrealized: 0.00,
    native: "USD",
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

export function convertTrade(
  amount: number,
  from: NativeCurrency,
  to: "EUR" | "USD"
): number {
  if (from === to) return amount;
  return amount * (FX[from]?.[to] ?? 1);
}

export function formatTradeAmount(
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

export function formatTradeNative(n: number, cur: NativeCurrency): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

export function formatHoldDays(days: number): string {
  if (days <= 0) return "—";
  const months = Math.floor(days / 30);
  const rem = days % 30;
  if (months === 0) return `${rem}d`;
  return `${months}m ${rem}d`;
}

export function generateSparkSeed(ticker: string): number {
  return (ticker.charCodeAt(0) * 31 + ticker.charCodeAt(1)) % 9999;
}
