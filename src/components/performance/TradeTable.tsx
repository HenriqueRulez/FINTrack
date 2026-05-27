"use client";

import { AssetCell } from "./AssetCell";
import { Sparkline } from "./Sparkline";
import type { Currency, NativeCurrency } from "./mock-data";
import { formatTradeAmount, formatTradeNative, convertTrade, formatHoldDays } from "./mock-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TradeSortCol =
  | "ticker"
  | "status"
  | "hold"
  | "invested"
  | "realized"
  | "unrealized"
  | "totalEUR"
  | "roi";

export type TradeSortDir = "asc" | "desc";

export interface TradeSortState {
  col: TradeSortCol;
  dir: TradeSortDir;
}

export interface EnrichedTrade {
  ticker: string;
  name: string;
  chart: "chart-1" | "chart-2" | "chart-5";
  status: "active" | "closed";
  holdDays: number;
  invested: number;
  realized: number;
  unrealized: number;
  native: NativeCurrency;
  _investedEUR: number;
  _realizedEUR: number;
  _unrealizedEUR: number;
  _totalEUR: number;
  _roi: number;
  _dir30: number;
  _pct30: number;
  _seed: number;
}

// ---------------------------------------------------------------------------
// Density type
// ---------------------------------------------------------------------------

export type Density = "compact" | "comfortable" | "spacious";

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SortArrow({ col, sort }: { col: TradeSortCol; sort: TradeSortState }) {
  if (sort.col !== col) {
    return <span className="ml-1 text-muted-foreground/50 text-[9px]">↕</span>;
  }
  return (
    <span className="ml-1 text-primary text-[9px]">
      {sort.dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

function StatusPill({ status }: { status: "active" | "closed" }) {
  if (status === "active") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--gain)]"
        aria-label="Posição activa"
      >
        <span
          className="w-[6px] h-[6px] rounded-full bg-[var(--gain)] shrink-0"
          style={{ boxShadow: "0 0 6px oklch(0.70 0.18 145 / 60%)" }}
          aria-hidden="true"
        />
        Active
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
      aria-label="Posição fechada"
    >
      <span
        className="w-[6px] h-[6px] rounded-full bg-muted-foreground/50 shrink-0"
        aria-hidden="true"
      />
      Closed
    </span>
  );
}

function ROIBadge({ roi }: { roi: number }) {
  const isGain = roi >= 0;
  const sign = isGain ? "+" : "−";
  const formatted = `${sign}${Math.abs(roi).toFixed(2)}%`;

  if (isGain) {
    return (
      <span className="inline-flex px-[10px] py-1 rounded-full border text-[12px] font-medium tabular-nums text-[var(--gain)] border-[oklch(0.70_0.18_145_/_40%)] bg-[oklch(0.70_0.18_145_/_12%)]">
        {formatted}
      </span>
    );
  }
  return (
    <span className="inline-flex px-[10px] py-1 rounded-full border text-[12px] font-medium tabular-nums text-[var(--loss)] border-[oklch(0.63_0.22_25_/_40%)] bg-[oklch(0.63_0.22_25_/_12%)]">
      {formatted}
    </span>
  );
}

function numToneClass(n: number): string {
  if (n > 0) return "text-[var(--gain)]";
  if (n < 0) return "text-[var(--loss)]";
  return "text-muted-foreground";
}

// ---------------------------------------------------------------------------
// TradeTable
// ---------------------------------------------------------------------------

interface TradeTableProps {
  rows: EnrichedTrade[];
  currency: Currency;
  sort: TradeSortState;
  onSort: (col: TradeSortCol) => void;
  density: Density;
}

const SORTABLE_COLS: { label: string; col: TradeSortCol; minWidth: string }[] = [
  { label: "Asset", col: "ticker", minWidth: "min-w-[240px]" },
  { label: "Status", col: "status", minWidth: "min-w-[80px]" },
  { label: "Holding Period", col: "hold", minWidth: "min-w-[110px]" },
  { label: "Invested", col: "invested", minWidth: "min-w-[100px]" },
  { label: "Realized", col: "realized", minWidth: "min-w-[100px]" },
  { label: "Unrealized", col: "unrealized", minWidth: "min-w-[110px]" },
  { label: "Total Profit", col: "totalEUR", minWidth: "min-w-[110px]" },
];

function getDensityClasses(density: Density): { td: string; th: string } {
  switch (density) {
    case "compact":
      return { td: "py-2 px-3 text-[12px]", th: "py-2 px-3" };
    case "spacious":
      return { td: "py-5 px-4", th: "py-4 px-4" };
    default: // comfortable
      return { td: "py-4 px-4", th: "py-3 px-4" };
  }
}

function formatCellMoney(
  amount: number,
  fromCur: NativeCurrency,
  currency: Currency,
  nativeCur: NativeCurrency,
  signed?: boolean
): string {
  const signDisplay = signed ? "always" : "auto";
  if (currency === "EUR") {
    const val = convertTrade(amount, fromCur, "EUR");
    return formatTradeAmount(val, "EUR", { signDisplay });
  }
  if (currency === "USD") {
    const val = convertTrade(amount, fromCur, "USD");
    return formatTradeAmount(val, "USD", { signDisplay });
  }
  // Native
  if (signed) {
    // Replicate sign display for native
    const formatted = formatTradeNative(Math.abs(amount), nativeCur);
    if (amount > 0) return `+${formatted}`;
    if (amount < 0) return `−${formatted.replace("-", "")}`;
    return formatted;
  }
  return formatTradeNative(amount, nativeCur);
}

export function TradeTable({ rows, currency, sort, onSort, density }: TradeTableProps) {
  const dc = getDensityClasses(density);

  function getAriaSortValue(col: TradeSortCol): "ascending" | "descending" | "none" {
    if (sort.col !== col) return "none";
    return sort.dir === "asc" ? "ascending" : "descending";
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">Análise de trades do portfólio</caption>

        <thead>
          <tr>
            {SORTABLE_COLS.map((col, i) => {
              const isFirst = i === 0;
              return (
                <th
                  key={col.col}
                  aria-sort={getAriaSortValue(col.col)}
                  className={[
                    dc.th,
                    "border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    isFirst ? "text-left pl-5" : "text-right",
                    col.minWidth,
                  ].join(" ")}
                >
                  <button
                    onClick={() => onSort(col.col)}
                    className={[
                      "inline-flex items-center cursor-pointer hover:text-foreground transition-colors",
                      !isFirst ? "flex-row-reverse" : "",
                    ].join(" ")}
                  >
                    {col.label}
                    <SortArrow col={col.col} sort={sort} />
                  </button>
                </th>
              );
            })}

            {/* Last 30 days — not sortable */}
            <th
              className={[
                dc.th,
                "border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right min-w-[160px]",
              ].join(" ")}
            >
              Last 30 days
            </th>

            {/* ROI — sortable */}
            <th
              aria-sort={getAriaSortValue("roi")}
              className={[
                dc.th,
                "border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right pr-5 min-w-[80px]",
              ].join(" ")}
            >
              <button
                onClick={() => onSort("roi")}
                className="inline-flex items-center flex-row-reverse cursor-pointer hover:text-foreground transition-colors"
              >
                ROI
                <SortArrow col="roi" sort={sort} />
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            // Calculate display values for selected currency
            const realizedVal =
              currency === "EUR"
                ? row._realizedEUR
                : currency === "USD"
                  ? convertTrade(row.realized, row.native, "USD")
                  : row.realized;

            const unrealizedVal =
              currency === "EUR"
                ? row._unrealizedEUR
                : currency === "USD"
                  ? convertTrade(row.unrealized, row.native, "USD")
                  : row.unrealized;

            const totalVal = realizedVal + unrealizedVal;

            const displayCur: "EUR" | "USD" =
              currency === "Native" ? row.native : currency;

            const fmtInvested = formatCellMoney(row.invested, row.native, currency, row.native);
            const fmtRealized = row.realized === 0
              ? formatCellMoney(0, row.native, currency, row.native)
              : formatCellMoney(row.realized, row.native, currency, row.native, true);
            const fmtUnrealized = row.unrealized === 0
              ? formatCellMoney(0, row.native, currency, row.native)
              : formatCellMoney(row.unrealized, row.native, currency, row.native, true);

            // Total profit in display currency
            let fmtTotal: string;
            if (totalVal === 0) {
              fmtTotal = currency === "Native"
                ? formatTradeNative(0, row.native)
                : formatTradeAmount(0, displayCur);
            } else {
              fmtTotal = currency === "Native"
                ? (totalVal > 0 ? "+" : "−") + formatTradeNative(Math.abs(totalVal), row.native).replace("-", "")
                : formatTradeAmount(totalVal, displayCur, { signDisplay: "always" });
            }

            return (
              <tr
                key={row.ticker}
                className="transition-colors hover:bg-muted/40 duration-[140ms]"
              >
                {/* Asset */}
                <td className={`pl-5 pr-4 border-b border-border/40 text-left align-middle ${dc.td}`}>
                  <AssetCell trade={row} />
                </td>

                {/* Status */}
                <td className={`border-b border-border/40 text-center align-middle ${dc.td}`}>
                  <StatusPill status={row.status} />
                </td>

                {/* Holding Period */}
                <td className={`border-b border-border/40 text-right tabular-nums align-middle text-muted-foreground ${dc.td}`}>
                  {formatHoldDays(row.holdDays)}
                </td>

                {/* Invested */}
                <td className={`border-b border-border/40 text-right tabular-nums align-middle ${dc.td}`}>
                  {fmtInvested}
                </td>

                {/* Realized */}
                <td
                  className={`border-b border-border/40 text-right tabular-nums align-middle ${dc.td} ${numToneClass(realizedVal)}`}
                >
                  {fmtRealized}
                </td>

                {/* Unrealized */}
                <td
                  className={`border-b border-border/40 text-right tabular-nums align-middle ${dc.td} ${numToneClass(unrealizedVal)}`}
                >
                  {fmtUnrealized}
                </td>

                {/* Total Profit */}
                <td
                  className={`border-b border-border/40 text-right tabular-nums align-middle ${dc.td} ${numToneClass(totalVal)}`}
                >
                  {fmtTotal}
                </td>

                {/* Last 30 days — sparkline or dash */}
                <td className={`border-b border-border/40 text-right align-middle ${dc.td}`}>
                  {row.status === "active" ? (
                    <Sparkline
                      seed={row._seed}
                      dir30={row._dir30}
                      pct30={row._pct30}
                    />
                  ) : (
                    <span className="text-muted-foreground text-[13px]">—</span>
                  )}
                </td>

                {/* ROI */}
                <td className={`border-b border-border/40 text-right align-middle pr-5 ${dc.td}`}>
                  <ROIBadge roi={row._roi} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
