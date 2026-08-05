"use client";

import { AssetCell } from "./AssetCell";
import { TypeBadge } from "./TypeBadge";
import type { TradeRow } from "./types";
import { formatMoneyEur, formatHoldDays } from "./format";

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
  | "totalEur"
  | "roi";

export type TradeSortDir = "asc" | "desc";

export interface TradeSortState {
  col: TradeSortCol;
  dir: TradeSortDir;
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
  rows: TradeRow[];
  sort: TradeSortState;
  onSort: (col: TradeSortCol) => void;
  density: Density;
}

const SORTABLE_COLS: { label: string; col: TradeSortCol | "type"; minWidth: string; sortable?: boolean }[] = [
  { label: "Asset", col: "ticker", minWidth: "min-w-[240px]" },
  { label: "Type", col: "type", minWidth: "min-w-[80px]", sortable: false },
  { label: "Status", col: "status", minWidth: "min-w-[80px]" },
  { label: "Holding Period", col: "hold", minWidth: "min-w-[110px]" },
  { label: "Invested", col: "invested", minWidth: "min-w-[100px]" },
  { label: "Realized", col: "realized", minWidth: "min-w-[100px]" },
  { label: "Unrealized", col: "unrealized", minWidth: "min-w-[110px]" },
  { label: "Total Profit", col: "totalEur", minWidth: "min-w-[110px]" },
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

function formatSigned(n: number): string {
  return n === 0 ? formatMoneyEur(0) : formatMoneyEur(n, { signDisplay: "always" });
}

export function TradeTable({ rows, sort, onSort, density }: TradeTableProps) {
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
              const isType = col.col === "type";
              const alignLeft = isFirst || isType;
              return (
                <th
                  key={col.col}
                  aria-sort={isType ? undefined : getAriaSortValue(col.col as TradeSortCol)}
                  className={[
                    dc.th,
                    "border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    alignLeft ? "text-left" : "text-right",
                    isFirst ? "pl-5" : "",
                    col.minWidth,
                  ].join(" ")}
                >
                  {isType ? (
                    <span>{col.label}</span>
                  ) : (
                    <button
                      onClick={() => onSort(col.col as TradeSortCol)}
                      className={[
                        "inline-flex items-center cursor-pointer hover:text-foreground transition-colors",
                        !isFirst ? "flex-row-reverse" : "",
                      ].join(" ")}
                    >
                      {col.label}
                      <SortArrow col={col.col as TradeSortCol} sort={sort} />
                    </button>
                  )}
                </th>
              );
            })}

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
          {rows.map((row) => (
            <tr
              key={row.ticker}
              className="transition-colors hover:bg-muted/40 duration-[140ms]"
            >
              {/* Asset */}
              <td className={`pl-5 pr-4 border-b border-border/40 text-left align-middle ${dc.td}`}>
                <AssetCell trade={row} />
              </td>

              {/* Type */}
              <td className={`border-b border-border/40 text-left align-middle ${dc.td}`}>
                <TypeBadge assetType={row.assetType} />
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
                {formatMoneyEur(row.investedEur)}
              </td>

              {/* Realized */}
              <td
                className={`border-b border-border/40 text-right tabular-nums align-middle ${dc.td} ${numToneClass(row.realizedEur)}`}
              >
                {formatSigned(row.realizedEur)}
              </td>

              {/* Unrealized */}
              <td
                className={`border-b border-border/40 text-right tabular-nums align-middle ${dc.td} ${numToneClass(row.unrealizedEur)}`}
              >
                {formatSigned(row.unrealizedEur)}
              </td>

              {/* Total Profit */}
              <td
                className={`border-b border-border/40 text-right tabular-nums align-middle ${dc.td} ${numToneClass(row.totalEur)}`}
              >
                {formatSigned(row.totalEur)}
              </td>

              {/* ROI */}
              <td className={`border-b border-border/40 text-right align-middle pr-5 ${dc.td}`}>
                <ROIBadge roi={row.roi} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
