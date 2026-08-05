"use client";

import { CompanyCell } from "./CompanyCell";
import { TypeBadge } from "./TypeBadge";
import { GainLossCell } from "./GainLossCell";
import type { HoldingRow } from "./types";
import { formatMoneyEur } from "./format";

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

// ---------------------------------------------------------------------------
// Display gain/loss helper — active positions show unrealized P/L,
// closed positions show realized P/L (unrealized is 0 once a position closes)
// ---------------------------------------------------------------------------

export function displayGain(row: HoldingRow): { amountEur: number; pct: number } {
  if (row.status === "closed") {
    const pct = row.costBasisEur !== 0 ? (row.realizedEur / row.costBasisEur) * 100 : 0;
    return { amountEur: row.realizedEur, pct };
  }
  return { amountEur: row.unrealizedEur, pct: row.unrealizedPct };
}

// ---------------------------------------------------------------------------
// WarningIcon — inline stale-price indicator
// ---------------------------------------------------------------------------

function WarningIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className="text-[var(--loss)] shrink-0"
    >
      <path d="M8 1.5 14.5 13a1 1 0 0 1-.87 1.5H2.37a1 1 0 0 1-.87-1.5L8 1.5Z" />
      <path d="M8 6v3.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// HoldingsTable
// ---------------------------------------------------------------------------

interface HoldingsTableProps {
  rows: HoldingRow[];
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

export function HoldingsTable({ rows, sort, onSort }: HoldingsTableProps) {
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
            const gain = displayGain(row);

            return (
              <tr
                key={row.ticker}
                className={[
                  "transition-colors hover:bg-muted/40",
                  row.status === "closed" ? "opacity-[0.55]" : "",
                ].join(" ")}
              >
                {/* Company */}
                <td className="pl-5 pr-4 py-4 border-b border-border/40 text-left align-middle">
                  <CompanyCell holding={row} pct={row.pctOfPortfolio} />
                </td>

                {/* Type */}
                <td className="pl-5 pr-4 py-4 border-b border-border/40 text-left align-middle">
                  <TypeBadge assetType={row.assetType} />
                </td>

                {/* Portfolio% */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {row.status === "closed" ? "—" : `${row.pctOfPortfolio.toFixed(1)}%`}
                </td>

                {/* Shares */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {row.shares % 1 === 0
                    ? row.shares.toLocaleString("pt-PT")
                    : row.shares.toFixed(4)}
                </td>

                {/* Avg Cost */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {formatMoneyEur(row.avgCostEur)}
                </td>

                {/* Cost Basis */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {formatMoneyEur(row.costBasisEur)}
                </td>

                {/* Current Price */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {row.priceMissing && (
                      <span title="Preço indisponível — valor desatualizado" aria-label="Preço indisponível — valor desatualizado">
                        <WarningIcon />
                      </span>
                    )}
                    {row.currentPriceEur !== null ? formatMoneyEur(row.currentPriceEur) : "—"}
                  </span>
                </td>

                {/* Market Value */}
                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {row.priceMissing && (
                      <span title="Valor desatualizado — preço indisponível" aria-label="Valor desatualizado — preço indisponível">
                        <WarningIcon />
                      </span>
                    )}
                    {formatMoneyEur(row.marketValueEur)}
                  </span>
                </td>

                {/* Total Gain/Loss */}
                <td className="pr-5 pl-4 py-4 border-b border-border/40 text-right align-middle">
                  <GainLossCell absoluteValueEur={gain.amountEur} pctValue={gain.pct} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
