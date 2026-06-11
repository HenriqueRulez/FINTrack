"use client";

// Cópia adaptada de src/components/holdings/HoldingsTable.tsx para os
// F5HoldingRow derivados do ledger. Modo de moeda: Base (tudo convertido)
// ou Native (Current Price e Market Value na moeda da cotação; custo médio,
// invested e gain ficam na base — o custo pode misturar moedas).

import { fmtMoney, fmtQty } from "@/lib/fable5/format";
import type { F5HoldingRow } from "@/lib/fable5/types";
import { CompanyCell } from "./company-cell";
import { AssetTypeBadge } from "./type-badge";
import { GainLossCell } from "./gain-loss-cell";

export type CurrencyMode = "base" | "native";
export type SortCol =
  | "ticker"
  | "pct"
  | "shares"
  | "avg"
  | "cost"
  | "price"
  | "value"
  | "gain";
export interface SortState {
  col: SortCol;
  dir: "asc" | "desc";
}

const COLUMNS: {
  label: string;
  col: SortCol | "type";
  align: "left" | "right";
  sortable: boolean;
}[] = [
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
    return <span className="ml-1 text-muted-foreground/50 text-[10px]">↕</span>;
  }
  return (
    <span className="ml-1 text-primary text-[10px]">
      {sort.dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

export function HoldingsTable({
  rows,
  baseCurrency,
  currencyMode,
  sort,
  onSort,
}: {
  rows: F5HoldingRow[];
  baseCurrency: string;
  currencyMode: CurrencyMode;
  sort: SortState;
  onSort: (col: SortCol) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">Holdings positions</caption>

        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const isSortable = col.sortable;
              const isActive = isSortable && sort.col === col.col;
              const ariaSortVal = isActive
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
                      onClick={() => onSort(col.col as SortCol)}
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
            const closed = row.status === "closed";
            const native = currencyMode === "native" && row.quoteCurrency;

            const currentPriceDisplay =
              row.currentPrice !== null && row.quoteCurrency
                ? native
                  ? fmtMoney(row.currentPrice, row.quoteCurrency)
                  : row.marketValueBase !== null && row.openQty > 0
                    ? fmtMoney(row.marketValueBase / row.openQty, baseCurrency)
                    : fmtMoney(row.currentPrice, row.quoteCurrency)
                : "—";

            const marketValueDisplay = closed
              ? "—"
              : native && row.currentPrice !== null && row.quoteCurrency
                ? fmtMoney(row.openQty * row.currentPrice, row.quoteCurrency)
                : row.marketValueBase !== null
                  ? fmtMoney(row.marketValueBase, baseCurrency)
                  : "—";

            // Gain total = unrealized + realized (na base)
            const totalGain = (row.unrealizedBase ?? 0) + row.realizedBase;
            const totalGainPct =
              row.investedBase !== null && row.investedBase > 0
                ? (totalGain / row.investedBase) * 100
                : null;

            return (
              <tr
                key={row.ticker}
                className={[
                  "transition-colors hover:bg-muted/40",
                  closed ? "opacity-[0.55]" : "",
                ].join(" ")}
              >
                <td className="pl-5 pr-4 py-4 border-b border-border/40 text-left align-middle">
                  <CompanyCell holding={row} />
                </td>

                <td className="pl-5 pr-4 py-4 border-b border-border/40 text-left align-middle">
                  <AssetTypeBadge assetType={row.asset_type} />
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {closed ? "—" : `${row.pctOfPortfolio.toFixed(1)}%`}
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {closed ? "—" : fmtQty(row.openQty)}
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {row.avgCostBase !== null
                    ? fmtMoney(row.avgCostBase, baseCurrency)
                    : "—"}
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {row.investedBase !== null && !closed
                    ? fmtMoney(row.investedBase, baseCurrency)
                    : "—"}
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {currentPriceDisplay}
                  {row.priceIsStale && (
                    <span
                      className="ml-1 text-[10px] text-muted-foreground"
                      title="Preço em cache antigo — Yahoo indisponível"
                    >
                      stale
                    </span>
                  )}
                </td>

                <td className="px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle">
                  {marketValueDisplay}
                </td>

                <td className="pr-5 pl-4 py-4 border-b border-border/40 text-right align-middle">
                  <GainLossCell
                    absoluteValue={totalGain}
                    pctValue={totalGainPct}
                    currency={baseCurrency}
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
