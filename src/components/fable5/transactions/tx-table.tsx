"use client";

// Cópia adaptada de src/components/transactions/TxTable.tsx — colunas
// Date/Ticker/Type/Quantity/Price/FX/Fee/Total para o ledger buy/sell.
// Clique na linha abre a edição (fora do edit mode).

import { formatDate } from "@/lib/utils";
import { fmtMoney, fmtQty } from "@/lib/fable5/format";
import type { F5Transaction } from "@/lib/fable5/types";
import { TypeBadge } from "./type-badge";
import { CheckBox } from "./checkbox";

export type SortCol =
  | "date"
  | "ticker"
  | "type"
  | "qty"
  | "price"
  | "fx"
  | "fee"
  | "total";
export interface SortState {
  col: SortCol;
  dir: "asc" | "desc";
}
export type Density = "compact" | "comfortable" | "spacious";

// Total na moeda da transacção: buy = custo (qty·price+fee); sell = proceeds
// (qty·price−fee), com sinal "+" e cor gain (dinheiro a entrar).
export function txTotal(tx: F5Transaction): number {
  return tx.type === "buy"
    ? tx.qty * tx.price + tx.fee
    : tx.qty * tx.price - tx.fee;
}

interface TxTableProps {
  rows: F5Transaction[];
  editMode: boolean;
  selected: Set<string>;
  sort: SortState;
  onSort: (col: SortCol) => void;
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
  allOnPageSelected: boolean;
  someSelected: boolean;
  density: Density;
  showFx: boolean;
  showFees: boolean;
  onRowClick: (tx: F5Transaction) => void;
}

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

function getDensityClasses(density: Density): { td: string; th: string } {
  switch (density) {
    case "compact":
      return { td: "px-3 py-2 text-xs", th: "px-3 py-2" };
    case "spacious":
      return { td: "px-4 py-5 text-sm", th: "px-4 py-4" };
    default:
      return { td: "px-4 py-4 text-sm", th: "px-4 py-3" };
  }
}

export function TxTable({
  rows,
  editMode,
  selected,
  sort,
  onSort,
  onToggleOne,
  onToggleAll,
  allOnPageSelected,
  someSelected,
  density,
  showFx,
  showFees,
  onRowClick,
}: TxTableProps) {
  const { td: tdBase, th: thBase } = getDensityClasses(density);

  const checkState: "off" | "on" | "mixed" = allOnPageSelected
    ? "on"
    : someSelected
      ? "mixed"
      : "off";

  const thShared = [
    thBase,
    "border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap",
  ].join(" ");

  function SortTh({
    col,
    label,
    align = "left",
    className = "",
  }: {
    col: SortCol;
    label: string;
    align?: "left" | "right";
    className?: string;
  }) {
    const isActive = sort.col === col;
    const ariaSortVal: "ascending" | "descending" | "none" = isActive
      ? sort.dir === "asc"
        ? "ascending"
        : "descending"
      : "none";

    return (
      <th
        aria-sort={ariaSortVal}
        className={[
          thShared,
          align === "right" ? "text-right" : "text-left",
          className,
        ].join(" ")}
      >
        <button
          onClick={() => onSort(col)}
          className={[
            "inline-flex items-center cursor-pointer hover:text-foreground transition-colors",
            align === "right" ? "flex-row-reverse" : "",
          ].join(" ")}
          aria-label={`Sort by ${label}`}
        >
          {label}
          <SortArrow col={col} sort={sort} />
        </button>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto" id="f5-tx-table" role="tabpanel">
      <table className="w-full border-collapse">
        <caption className="sr-only">Histórico de transacções</caption>

        <thead>
          <tr>
            {editMode && (
              <th className={[thShared, "text-center pl-5 w-10"].join(" ")}>
                <CheckBox
                  state={checkState}
                  onClick={onToggleAll}
                  label="Select all rows"
                />
              </th>
            )}
            <SortTh col="date" label="Date" className={editMode ? "" : "pl-5"} />
            <SortTh col="ticker" label="Ticker" />
            <SortTh col="type" label="Type" />
            <SortTh col="qty" label="Quantity" align="right" />
            <SortTh col="price" label="Price" align="right" />
            {showFx && <SortTh col="fx" label="FX → EUR" align="right" />}
            {showFees && <SortTh col="fee" label="Fee" align="right" />}
            <SortTh col="total" label="Total" align="right" className="pr-5" />
          </tr>
        </thead>

        <tbody>
          {rows.map((tx) => {
            const isSelected = selected.has(tx.id);
            const total = txTotal(tx);
            const isSell = tx.type === "sell";

            return (
              <tr
                key={tx.id}
                onClick={() => {
                  if (!editMode) onRowClick(tx);
                }}
                className={[
                  "transition-colors",
                  editMode ? "" : "cursor-pointer",
                  isSelected
                    ? "bg-primary/[0.08] hover:bg-primary/[0.12]"
                    : "hover:bg-muted/40",
                ].join(" ")}
              >
                {editMode && (
                  <td
                    className={[
                      tdBase,
                      "border-b border-border/40 text-center align-middle pl-5",
                    ].join(" ")}
                  >
                    <CheckBox
                      state={isSelected ? "on" : "off"}
                      onClick={() => onToggleOne(tx.id)}
                      label={`Select transaction ${tx.ticker} ${tx.date}`}
                    />
                  </td>
                )}

                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 align-middle",
                    editMode ? "" : "pl-5",
                  ].join(" ")}
                >
                  {formatDate(tx.date)}
                </td>

                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 align-middle font-semibold tracking-wide",
                  ].join(" ")}
                >
                  {tx.ticker}
                </td>

                <td className={[tdBase, "border-b border-border/40 align-middle"].join(" ")}>
                  <TypeBadge type={tx.type} />
                </td>

                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 text-right tabular-nums align-middle",
                  ].join(" ")}
                >
                  {fmtQty(tx.qty)}
                </td>

                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 text-right tabular-nums align-middle",
                  ].join(" ")}
                >
                  {fmtMoney(tx.price, tx.currency)}
                </td>

                {showFx && (
                  <td
                    className={[
                      tdBase,
                      "border-b border-border/40 text-right tabular-nums align-middle",
                    ].join(" ")}
                  >
                    {tx.fx_to_eur.toFixed(4)}
                  </td>
                )}

                {showFees && (
                  <td
                    className={[
                      tdBase,
                      "border-b border-border/40 text-right tabular-nums align-middle",
                    ].join(" ")}
                  >
                    {fmtMoney(tx.fee, tx.currency)}
                  </td>
                )}

                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 text-right tabular-nums align-middle pr-5",
                    isSell ? "text-[var(--gain)]" : "text-foreground",
                  ].join(" ")}
                >
                  {isSell ? "+" : ""}
                  {fmtMoney(total, tx.currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
