// ---------------------------------------------------------------------------
// Tax Calculator — mock data + tax math (Phase 1: visual only, no API)
//
// In a real app SAMPLE_EVENTS_2026 would come from realised sales / dividend
// transactions and TAX_SETTINGS from persisted user settings. They are
// hardcoded here so the UI renders deterministically.
//
// TODO (Engineer, phase 2): replace SAMPLE_EVENTS_2026 with real realised
// sales + dividends from the API, and TAX_SETTINGS with persisted settings.tax.
// ---------------------------------------------------------------------------

export interface SaleEvent {
  date: string; // ISO YYYY-MM-DD
  ticker: string;
  proceeds: number;
  cost: number;
  holdYears: number;
}

export interface DividendEvent {
  date: string; // ISO YYYY-MM-DD
  ticker: string;
  amount: number;
}

export interface TaxTier {
  from: number;
  to: number | null; // null = open-ended (>= from)
  rate: number; // percent
}

export interface TaxSettings {
  dividendRate: number; // percent
  method: "fixed" | "tiered";
  fixedRate: number; // percent (used only when method === 'fixed')
  tiers: TaxTier[];
}

export interface TaxEvents {
  sales: SaleEvent[];
  dividends: DividendEvent[];
}

// Derived row types
export interface CgRow extends SaleEvent {
  gain: number;
  rate: number;
  tax: number;
}

export interface DivRow extends DividendEvent {
  tax: number;
}

// ---------------------------------------------------------------------------
// Sample tax events (2026 only — fiel ao protótipo tax-app.jsx)
// ---------------------------------------------------------------------------

export const SAMPLE_EVENTS_2026: TaxEvents = {
  sales: [
    { date: "2026-03-12", ticker: "TSLA", proceeds: 1065.86, cost: 980.0, holdYears: 1.2 },
    { date: "2026-02-08", ticker: "GLD", proceeds: 1293.41, cost: 1170.0, holdYears: 3.4 },
    { date: "2026-04-01", ticker: "MSFT", proceeds: 2280.5, cost: 1600.0, holdYears: 5.6 },
    { date: "2026-04-20", ticker: "AAPL", proceeds: 920.0, cost: 1440.0, holdYears: 0.8 },
  ],
  dividends: [
    { date: "2026-03-01", ticker: "CSPX", amount: 24.4 },
    { date: "2026-04-01", ticker: "VWCE", amount: 12.8 },
    { date: "2026-05-15", ticker: "MSFT", amount: 4.2 },
  ],
};

// Empty set — used when sample data is OFF or for years without data.
export const EMPTY_EVENTS: TaxEvents = { sales: [], dividends: [] };

// ---------------------------------------------------------------------------
// Tax settings (mock defaults from settings.tax — fiel ao protótipo)
// ---------------------------------------------------------------------------

export const TAX_SETTINGS: TaxSettings = {
  dividendRate: 28,
  method: "tiered",
  fixedRate: 28,
  tiers: [
    { from: 0, to: 2, rate: 28.0 },
    { from: 2, to: 5, rate: 25.2 },
    { from: 5, to: 8, rate: 22.4 },
    { from: 8, to: null, rate: 19.6 },
  ],
};

// ---------------------------------------------------------------------------
// Tax math (fiel ao tax-app.jsx)
// ---------------------------------------------------------------------------

export function rateForHoldYears(years: number, tax: TaxSettings): number {
  if (tax.method === "fixed") return tax.fixedRate;
  const tier = tax.tiers.find((t) => {
    const fromOk = years >= (t.from ?? 0);
    const toOk = t.to == null ? true : years < t.to;
    return fromOk && toOk;
  });
  return tier ? tier.rate : (tax.tiers[tax.tiers.length - 1]?.rate ?? 0);
}

interface FmtEurOpts {
  signed?: boolean;
  dec?: number;
}

export function fmtEUR(n: number | null | undefined, opts: FmtEurOpts = {}): string {
  const { signed = false, dec = 2 } = opts;
  if (n == null || isNaN(n)) return "€0.00";
  const abs = Math.abs(n);
  const fixed = abs.toLocaleString("en-GB", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
  // U+2212 (−) for negative, never the hyphen-minus.
  const sign = n < 0 ? "−" : signed && n > 0 ? "+" : "";
  return `${sign}€${fixed}`;
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Derivations — pure, deterministic
// ---------------------------------------------------------------------------

export interface CapitalGains {
  rows: CgRow[];
  totalProceeds: number;
  totalCost: number;
  totalGain: number;
  totalTax: number;
}

export function deriveCapitalGains(sales: SaleEvent[], tax: TaxSettings): CapitalGains {
  const rows: CgRow[] = sales.map((s) => {
    const gain = s.proceeds - s.cost;
    const rate = gain > 0 ? rateForHoldYears(s.holdYears, tax) : 0;
    const taxDue = Math.max(0, gain) * (rate / 100);
    return { ...s, gain, rate, tax: taxDue };
  });
  return {
    rows,
    totalProceeds: rows.reduce((s, r) => s + r.proceeds, 0),
    totalCost: rows.reduce((s, r) => s + r.cost, 0),
    totalGain: rows.reduce((s, r) => s + r.gain, 0),
    totalTax: rows.reduce((s, r) => s + r.tax, 0),
  };
}

export interface DividendTax {
  rows: DivRow[];
  total: number;
  totalTax: number;
}

export function deriveDividendTax(dividends: DividendEvent[], tax: TaxSettings): DividendTax {
  const rate = tax.dividendRate / 100;
  const rows: DivRow[] = dividends.map((d) => ({ ...d, tax: d.amount * rate }));
  return {
    rows,
    total: rows.reduce((s, r) => s + r.amount, 0),
    totalTax: rows.reduce((s, r) => s + r.tax, 0),
  };
}

export type CgView = "aggregate" | "detailed";
export type TaxYear = 2026 | 2025 | 2024;
