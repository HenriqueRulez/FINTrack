"use client";

// Cópia adaptada de src/components/performance/TradeTable.tsx — uma linha
// por ticker (agregação de TODAS as transacções desse ticker, como pedido),
// valores na moeda base, sparkline com dados reais.

import { fmtMoney } from "@/lib/fable5/format";
import type { F5HoldingRow } from "@/lib/fable5/types";
import { AssetTypeBadge } from "@/components/fable5/holdings/type-badge";
import { AssetCell } from "./asset-cell";
import { Sparkline } from "./sparkline";

export type TradeSortCol =
  | "ticker"
  | "status"
  | "hold"
  | "invested"
  | "realized"
  | "unrealized"
  | "total"
  | "roi";
export interface TradeSortState {
  col: TradeSortCol;
  dir: "asc" | "desc";
}

export function tradeTotal(row: F5HoldingRow): number {
  return (row.unrealizedBase ?? 0) + row.realizedBase;
}

export function tradeRoi(row: F5HoldingRow): number | null {
  if (row.investedBase === null || row.investedBase <= 0) return null;
  return (tradeTotal(row) / row.investedBase) * 100;
}

export function formatHoldDays(days: number): string {
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  const rest = days % 30;
  return rest > 0 ? `${months}m ${rest}d` : `${months}m`;
}

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

function ROIBadge({ roi }: { roi: number | null }) {
  if (roi === null) {
    return <span className="text-muted-foreground text-[13px]">—</span>;
  }
  const isGain = roi >= 0;
  const sign = isGain ? "+" : "−";
  const formatted = `${sign}${Math.abs(roi).toFixed(2)}%`;
  return (
    <span
      className={
        isGain
          ? "inline-flex px-[10px] py-1 rounded-full border text-[12px] font-medium tabular-nums text-[var(--gain)] border-[oklch(0.70_0.18_145_/_40%)] bg-[oklch(0.70_0.18_145_/_12%)]"
          : "inline-flex px-[10px] py-1 rounded-full border text-[12px] font-medium tabular-nums text-[var(--loss)] border-[oklch(0.63_0.22_25_/_40%)] bg-[oklch(0.63_0.22_25_/_12%)]"
      }
    >
      {formatted}
    </span>
  );
}

function numToneClass(n: number): string {
  if (n > 0) return "text-[var(--gain)]";
  if (n < 0) return "text-[var(--loss)]";
  return "text-muted-foreground";
}

const COLS: {
  label: string;
  col: TradeSortCol | "type";
  minWidth: string;
  sortable: boolean;
}[] = [
  { label: "Asset", col: "ticker", minWidth: "min-w-[240px]", sortable: true },
  { label: "Type", col: "type", minWidth: "min-w-[80px]", sortable: false },
  { label: "Status", col: "status", minWidth: "min-w-[80px]", sortable: true },
  { label: "Holding Period", col: "hold", minWidth: "min-w-[110px]", sortable: true },
  { label: "Invested", col: "invested", minWidth: "min-w-[100px]", sortable: true },
  { label: "Realized", col: "realized", minWidth: "min-w-[100px]", sortable: true },
  { label: "Unrealized", col: "unrealized", minWidth: "min-w-[110px]", sortable: true },
  { label: "Total Profit", col: "total", minWidth: "min-w-[110px]", sortable: true },
];

export function TradeTable({
  rows,
  baseCurrency,
  sort,
  onSort,
}: {
  rows: F5HoldingRow[];
  baseCurrency: string;
  sort: TradeSortState;
  onSort: (col: TradeSortCol) => void;
}) {
  function ariaSort(col: TradeSortCol): "ascending" | "descending" | "none" {
    if (sort.col !== col) return "none";
    return sort.dir === "asc" ? "ascending" : "descending";
  }

  function fmtSigned(n: number): string {
    if (n === 0) return fmtMoney(0, baseCurrency);
    return `${n > 0 ? "+" : "−"}${fmtMoney(Math.abs(n), baseCurrency)}`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">Análise de trades do portfólio</caption>

        <thead>
          <tr>
            {COLS.map((col, i) => {
              const isFirst = i === 0;
              const alignLeft = isFirst || col.col === "type";
              return (
                <th
                  key={col.col}
                  aria-sort={col.sortable ? ariaSort(col.col as TradeSortCol) : undefined}
                  className={[
                    "py-3 px-4 border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    alignLeft ? "text-left" : "text-right",
                    isFirst ? "pl-5" : "",
                    col.minWidth,
                  ].join(" ")}
                >
                  {col.sortable ? (
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
                  ) : (
                    <span>{col.label}</span>
                  )}
                </th>
              );
            })}

            <th className="py-3 px-4 border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right min-w-[160px]">
              Last 30 days
            </th>

            <th
              aria-sort={ariaSort("roi")}
              className="py-3 px-4 border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right pr-5 min-w-[80px]"
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
            const total = tradeTotal(row);
            const unrealized = row.unrealizedBase ?? 0;
            return (
              <tr
                key={row.ticker}
                className="transition-colors hover:bg-muted/40 duration-[140ms]"
              >
                <td className="pl-5 pr-4 py-4 border-b border-border/40 text-left align-middle">
                  <AssetCell holding={row} />
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-left align-middle">
                  <AssetTypeBadge assetType={row.asset_type} />
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-center align-middle">
                  <StatusPill status={row.status} />
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums align-middle text-muted-foreground">
                  {formatHoldDays(row.holdDays)}
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums align-middle">
                  {row.status === "active" && row.investedBase !== null
                    ? fmtMoney(row.investedBase, baseCurrency)
                    : "—"}
                </td>

                <td
                  className={`px-4 py-4 border-b border-border/40 text-right tabular-nums align-middle ${numToneClass(row.realizedBase)}`}
                >
                  {fmtSigned(row.realizedBase)}
                </td>

                <td
                  className={`px-4 py-4 border-b border-border/40 text-right tabular-nums align-middle ${numToneClass(unrealized)}`}
                >
                  {fmtSigned(unrealized)}
                </td>

                <td
                  className={`px-4 py-4 border-b border-border/40 text-right tabular-nums align-middle ${numToneClass(total)}`}
                >
                  {fmtSigned(total)}
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right align-middle">
                  {row.spark30d ? (
                    <Sparkline points={row.spark30d} pct30={row.pct30} />
                  ) : (
                    <span className="text-muted-foreground text-[13px]">—</span>
                  )}
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right align-middle pr-5">
                  <ROIBadge roi={tradeRoi(row)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
