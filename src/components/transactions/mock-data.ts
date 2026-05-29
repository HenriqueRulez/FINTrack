// ---------------------------------------------------------------------------
// Transactions — mock data + helpers
// ---------------------------------------------------------------------------

export type TransactionType = "buy" | "sell" | "cash" | "conv" | "div" | "int";
export type TabKey = "all" | "bs" | "cash" | "conv" | "div" | "int";
export type SortCol =
  | "date"
  | "ticker"
  | "type"
  | "qty"
  | "price"
  | "fx"
  | "fee"
  | "total";
export type SortDir = "asc" | "desc";
export type Density = "compact" | "comfortable" | "spacious";

export interface Transaction {
  id: string;
  date: string; // ISO 'YYYY-MM-DD'
  ticker: string;
  type: TransactionType;
  qty: number | null;
  price: number | null;
  cur: string; // 'EUR' | 'USD' | 'GBP'
  fx: number;
  fee: number;
  total: number;
  label?: string; // for CASH / INT without a real ticker
}

export interface TabDefinition {
  key: TabKey;
  label: string;
  match: (tx: Transaction) => boolean;
}

export interface SortState {
  col: SortCol;
  dir: SortDir;
}

// ---------------------------------------------------------------------------
// Mock data — 13 transactions
// ---------------------------------------------------------------------------

export const TRANSACTIONS: Transaction[] = [
  // Buy / Sell
  { id: "t1",  date: "2026-04-02", ticker: "VWCE",    type: "buy",  qty: 15,   price: 12.00,   cur: "EUR", fx: 1.0000, fee: 0.00, total: 180.00 },
  { id: "t2",  date: "2026-02-05", ticker: "AMAT",    type: "buy",  qty: 12,   price: 556.00,  cur: "GBP", fx: 1.0000, fee: 0.00, total: 6672.00 },
  { id: "t3",  date: "2025-12-10", ticker: "PPLT",    type: "buy",  qty: 123,  price: 1233.00, cur: "USD", fx: 1.1628, fee: 0.00, total: 151659.00 },
  { id: "t4",  date: "2026-04-22", ticker: "CSPX",    type: "buy",  qty: 14,   price: 480.20,  cur: "EUR", fx: 1.0000, fee: 1.20, total: 6723.80 },
  { id: "t5",  date: "2026-03-18", ticker: "MSFT",    type: "buy",  qty: 5,    price: 320.00,  cur: "USD", fx: 1.0871, fee: 0.50, total: 1740.86 },
  { id: "t6",  date: "2026-03-30", ticker: "TSLA",    type: "sell", qty: 4,    price: 245.00,  cur: "USD", fx: 1.0871, fee: 0.50, total: 1065.86 },
  { id: "t7",  date: "2026-03-12", ticker: "GLD",     type: "sell", qty: 6,    price: 198.20,  cur: "USD", fx: 1.0871, fee: 0.50, total: 1293.41 },
  // Cash Movement
  { id: "t8",  date: "2026-01-15", ticker: "—",       type: "cash", qty: null, price: null,    cur: "EUR", fx: 1.0000, fee: 0.00, total: 5000.00,    label: "Deposit · IBKR" },
  { id: "t9",  date: "2026-02-28", ticker: "—",       type: "cash", qty: null, price: null,    cur: "EUR", fx: 1.0000, fee: 0.00, total: -1200.00,   label: "Withdrawal" },
  // Conversion
  { id: "t10", date: "2026-02-04", ticker: "EUR→USD", type: "conv", qty: 1000, price: 1.087,   cur: "USD", fx: 1.0871, fee: 1.50, total: 1087.00,    label: "EUR → USD" },
  // Dividend
  { id: "t11", date: "2026-03-01", ticker: "CSPX",   type: "div",  qty: null, price: null,    cur: "EUR", fx: 1.0000, fee: 0.00, total: 24.40 },
  { id: "t12", date: "2026-04-01", ticker: "VWCE",   type: "div",  qty: null, price: null,    cur: "EUR", fx: 1.0000, fee: 0.00, total: 12.80 },
  // Interest
  { id: "t13", date: "2026-03-31", ticker: "—",       type: "int",  qty: null, price: null,    cur: "EUR", fx: 1.0000, fee: 0.00, total: 8.16,       label: "Cash interest" },
];

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

export const TYPE_TABS: TabDefinition[] = [
  { key: "all",  label: "All",           match: () => true },
  { key: "bs",   label: "Buy / Sell",    match: (tx) => tx.type === "buy" || tx.type === "sell" },
  { key: "cash", label: "Cash Movement", match: (tx) => tx.type === "cash" },
  { key: "conv", label: "Conversion",    match: (tx) => tx.type === "conv" },
  { key: "div",  label: "Dividend",      match: (tx) => tx.type === "div" },
  { key: "int",  label: "Interest",      match: (tx) => tx.type === "int" },
];

// ---------------------------------------------------------------------------
// Type labels
// ---------------------------------------------------------------------------

export const TYPE_LABEL: Record<TransactionType, string> = {
  buy:  "BUY",
  sell: "SELL",
  cash: "CASH",
  conv: "CONV",
  div:  "DIV",
  int:  "INT",
};

// ---------------------------------------------------------------------------
// Currency symbols
// ---------------------------------------------------------------------------

const SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

// ---------------------------------------------------------------------------
// fmt — format number as currency string
// ---------------------------------------------------------------------------

export function fmt(
  n: number | null,
  cur: string,
  opts?: { signed?: boolean; dec?: number }
): string {
  if (n === null) return "—";
  const dec = opts?.dec ?? 2;
  const abs = Math.abs(n);
  const sym = SYMBOL[cur] ?? cur + " ";

  const formatted = abs.toLocaleString("en-GB", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

  if (opts?.signed) {
    const sign = n < 0 ? "−" : "+";
    return `${sign}${sym}${formatted}`;
  }
  return `${sym}${formatted}`;
}

// ---------------------------------------------------------------------------
// fmtDate — ISO date → DD/MM/YYYY
// ---------------------------------------------------------------------------

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
