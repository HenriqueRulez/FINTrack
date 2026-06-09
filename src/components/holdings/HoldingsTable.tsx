"use client";

import { CompanyCell } from "./CompanyCell";
import { TypeBadge } from "./TypeBadge";
import { GainLossCell } from "./GainLossCell";
import type { HoldingItem, Currency } from "./mock-data";
import { formatMoney, formatMoneyNative, convertAmount } from "./mock-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortCol =
  | "ticker"
  | "pct"
  | "shares"
  | "avg"
  | "cost"
  | "price"
  | "value"
  | "gain";
export type SortDir = "asc" | "desc";
export interface SortState {
  col: SortCol;
  dir: SortDir;
}

export interface EnrichedHolding extends HoldingItem {
  /** Market value in EUR */
  marketValueEUR: number;
  /** Portfolio % (0–100) — only for active positions */
  pct: number;
  /** Unrealized gain/loss in EUR */
  gainLossEUR: number;
  /** Gain/loss as a percentage of cost basis */
  gainLossPct: number;
}

// ---------------------------------------------------------------------------
// HoldingsTable
// ---------------------------------------------------------------------------

interface HoldingsTableProps {
  rows: EnrichedHolding[];
  currency: Currency;
  sort: SortState;
  onSort: (col: SortCol) => void;
}

const COLUMNS: { label: string; col: SortCol | "type"; align: "left" | "right"; sortable?: boolean }[] = [
  { label: "Company", col: "ticker", align: "left", sortable: true },
  { label: "Type", col: "type", align: "left", sortable: false },
  { label: "Portfolio%", col: "pct", align: "right", sortable: true },
  { label: "Shares", col: "shares", align: "right", sortable: true },
  { label: "Avg Cost", col: "avg", align: "right", sortable: true },
  { label: "Total Invested", col: "cost", align: "right", sortable: true },
  { label: "Current Price", col: "price", align: "right", sortable: true },
  { label: "Market Value", col: "value", align: "right", sortable: true },
  { label: "Total Gain/Loss", col: "gain", align: "right", sortable: true },
];

function SortArrow({ col, sort }: { col: SortCol; sort: SortState }) {
  if (sort.col !== col) {
    return (
      <span className="ml-1 text-muted-foreground/50 text-[10px]">↕</span>
    );
  }
  return (
    <span className="ml-1 text-primary text-[10px]">
      {sort.dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

function getDisplayCurrency(row: EnrichedHolding, currency: Currency): "EUR" | "USD" {
  if (currency === "EUR") return "EUR";
  if (currency === "USD") return "USD";
  return row.native;
}

function formatCellMoney(
  amount: number,
  fromCur: "EUR" | "USD",
  currency: Currency,
  nativeCur: "EUR" | "USD"
): string {
  if (currency === "EUR") {
    const val = convertAmount(amount, fromCur, "EUR");
    return formatMoney(val, "EUR");
  }
  if (currency === "USD") {
    const val = convertAmount(amount, fromCur, "USD");
    return formatMoney(val, "USD");
  }
  // Native
  return formatMoneyNative(amount, nativeCur);
}

export function HoldingsTable({
  rows,
  currency,
  sort,
  onSort,
}: HoldingsTableProps) {
  function handleSort(col: SortCol) {
    onSort(col);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">Holdings positions</caption>

        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const isSortable = col.sortable !== false && col.col !== "type";
              const isActive = isSortable && sort.col === (col.col as SortCol);
              const ariaSortVal =
                isActive
                  ? sort.dir === "asc"
                    ? ("ascending" as const)
                    : ("descending" as const)
                  : ("none" as const);

              return (
                <th
                  key={col.col}
                  aria-sort={isSortable ? ariaSortVal : undefined}
                  className={[
                    "px-4 py-3 border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    col.align === "left" ? "text-left pl-5" : "text-right",
                    col.col === "gain" ? "pr-5" : "",
                  ].join(" ")}
                >
                  {isSortable ? (
                    <button
                      onClick={() => handleSort(col.col as SortCol)}
                      className={[
                        "inline-flex items-center cursor-pointer hover:text-foreground transition-colors",
                        col.align === "right" ? "flex-row-reverse" : "",
                      ].join(" ")}
                    >
                      {col.label}
                      <SortArrow col={col.col as SortCol} sort={sort} />
                    </button>
                  ) : (
                    <span>{col.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const displayCur = getDisplayCurrency(row, currency);

            // Convert values for display
            const avgCostDisplay = formatCellMoney(
              row.avgCost,
              row.native,
              currency,
              row.native
            );
            const costBasisDisplay = formatCellMoney(
              row.costBasis,
              row.native,
              currency,
              row.native
            );
            const currentPriceDisplay = formatCellMoney(
              row.currentPrice,
              row.native,
              currency,
              row.native
            );
            const marketValueDisplay = formatCellMoney(
              row.shares * row.currentPrice,
              row.native,
              currency,
              row.native
            );

            // Gain/loss in display currency
            const gainLossDisplay =
              currency === "EUR"
                ? row.gainLossEUR
                : currency === "USD"
                  ? convertAmount(row.gainLossEUR, "EUR", "USD")
                  : (row.currentPrice - row.avgCost) * row.shares;

            return (
              <tr
                key={row.ticker}
                className={[
                  "transition-colors hover:bg-muted/40",
                  row.sold ? "opacity-[0.55]" : "",
                ].join(" ")}
              >
                {/* Company */}
                <td className="pl-5 pr-4 py-4 border-b border-border/40 text-left align-middle">
                  <CompanyCell holding={row} pct={row.pct} />
                </td>

                {/* Type */}
                <td className="pl-5 pr-4 py-4 border-b border-border/40 text-left align-middle">
                  <TypeBadge assetClass={row.assetClass} />
                </td>

                {/* Portfolio% */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {row.sold ? "—" : `${row.pct.toFixed(1)}%`}
                </td>

                {/* Shares */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {row.shares % 1 === 0
                    ? row.shares.toLocaleString("pt-PT")
                    : row.shares.toFixed(4)}
                </td>

                {/* Avg Cost */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {avgCostDisplay}
                  {currency === "Native" && row.native !== "EUR" && (
                    <span className="block text-[0.85em] text-muted-foreground">
                      ({formatMoney(convertAmount(row.avgCost, row.native, "EUR"), "EUR")})
                    </span>
                  )}
                </td>

                {/* Cost Basis */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {costBasisDisplay}
                </td>

                {/* Current Price */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {currentPriceDisplay}
                </td>

                {/* Market Value */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {marketValueDisplay}
                </td>

                {/* Total Gain/Loss */}
                <td className="pr-5 pl-4 py-4 border-b border-border/40 text-right align-middle">
                  <GainLossCell
                    absoluteValue={gainLossDisplay}
                    pctValue={row.gainLossPct}
                    currency={displayCur}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
