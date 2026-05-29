"use client";

import { TypeBadge } from "./TypeBadge";
import { CheckBox } from "./CheckBox";
import { fmt, fmtDate } from "./mock-data";
import type { Transaction, SortCol, SortState, Density } from "./mock-data";

// ---------------------------------------------------------------------------
// TxTable — sortable table with optional edit mode and density control
// ---------------------------------------------------------------------------

interface TxTableProps {
  rows: Transaction[];
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

function InfoIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      className="inline text-muted-foreground ml-1 cursor-help hover:text-primary transition-colors align-middle"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5.5" />
      <path d="M7 6v4M7 4.5v.01" />
    </svg>
  );
}

// Density-based classes
function getDensityClasses(density: Density): { td: string; th: string } {
  switch (density) {
    case "compact":
      return { td: "px-3 py-2 text-xs", th: "px-3 py-2" };
    case "spacious":
      return { td: "px-4 py-5 text-sm", th: "px-4 py-4" };
    default: // comfortable
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
}: TxTableProps) {
  const { td: tdBase, th: thBase } = getDensityClasses(density);

  const checkState: "off" | "on" | "mixed" = allOnPageSelected
    ? "on"
    : someSelected
    ? "mixed"
    : "off";

  // Shared th classes
  const thShared = [
    thBase,
    "border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap",
  ].join(" ");

  // Sortable th button maker
  function SortTh({
    col,
    label,
    align = "left",
    className = "",
    children,
  }: {
    col: SortCol;
    label: string;
    align?: "left" | "right";
    className?: string;
    children?: React.ReactNode;
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
          {children}
          <SortArrow col={col} sort={sort} />
        </button>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto" id="tx-table" role="tabpanel">
      <table className="w-full border-collapse">
        <caption className="sr-only">Histórico de transacções</caption>

        <thead>
          <tr>
            {/* Checkbox column — edit mode only */}
            {editMode && (
              <th
                className={[thShared, "text-center pl-5 w-10"].join(" ")}
              >
                <CheckBox
                  state={checkState}
                  onClick={onToggleAll}
                  label="Select all rows"
                />
              </th>
            )}

            {/* Date */}
            <SortTh
              col="date"
              label="Date"
              className={editMode ? "" : "pl-5"}
            />

            {/* Ticker */}
            <SortTh col="ticker" label="Ticker" />

            {/* Type */}
            <SortTh col="type" label="Type" />

            {/* Quantity */}
            <SortTh col="qty" label="Quantity" align="right" />

            {/* Price */}
            <SortTh col="price" label="Price" align="right" />

            {/* Exchange Rate — optional */}
            {showFx && (
              <SortTh col="fx" label="Exchange Rate" align="right" />
            )}

            {/* Fee — optional */}
            {showFees && (
              <th
                aria-sort={
                  sort.col === "fee"
                    ? sort.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className={[thShared, "text-right pr-0"].join(" ")}
              >
                <button
                  onClick={() => onSort("fee")}
                  className="inline-flex items-center flex-row-reverse cursor-pointer hover:text-foreground transition-colors"
                  aria-label="Sort by Fee"
                >
                  Fee
                  <InfoIcon />
                  <SortArrow col="fee" sort={sort} />
                </button>
              </th>
            )}

            {/* Total */}
            <SortTh col="total" label="Total" align="right" className="pr-5" />
          </tr>
        </thead>

        <tbody>
          {rows.map((tx) => {
            const isSelected = selected.has(tx.id);
            const displayTicker =
              tx.type === "cash" || tx.type === "int"
                ? (tx.label ?? tx.ticker)
                : tx.ticker;

            // Total color
            const totalColor =
              tx.total < 0
                ? "text-[var(--loss)]"
                : tx.type === "div" || tx.type === "int"
                ? "text-[var(--gain)]"
                : "text-foreground";

            // Sinal explícito apenas para SELL e CASH (CA-05). DIV/INT são sempre
            // positivos — a cor --gain já transmite o ganho, sem precisar de "+".
            const isSigned =
              tx.type === "cash" ||
              tx.type === "sell";

            const totalFormatted = fmt(tx.total, tx.cur, { signed: isSigned });

            return (
              <tr
                key={tx.id}
                className={[
                  "transition-colors",
                  isSelected
                    ? "bg-primary/[0.08] hover:bg-primary/[0.12]"
                    : "hover:bg-muted/40",
                ].join(" ")}
              >
                {/* Checkbox — edit mode */}
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
                      label={`Select transaction ${tx.id}`}
                    />
                  </td>
                )}

                {/* Date */}
                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 align-middle",
                    editMode ? "" : "pl-5",
                  ].join(" ")}
                >
                  {fmtDate(tx.date)}
                </td>

                {/* Ticker */}
                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 align-middle font-semibold tracking-wide",
                  ].join(" ")}
                >
                  {displayTicker}
                </td>

                {/* Type */}
                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 align-middle",
                  ].join(" ")}
                >
                  <TypeBadge type={tx.type} />
                </td>

                {/* Quantity */}
                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 text-right tabular-nums align-middle",
                  ].join(" ")}
                >
                  {tx.qty !== null ? tx.qty.toLocaleString("en-GB") : "—"}
                </td>

                {/* Price */}
                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 text-right tabular-nums align-middle",
                  ].join(" ")}
                >
                  {fmt(tx.price, tx.cur)}
                </td>

                {/* Exchange Rate — optional */}
                {showFx && (
                  <td
                    className={[
                      tdBase,
                      "border-b border-border/40 text-right tabular-nums align-middle",
                    ].join(" ")}
                  >
                    {tx.fx.toFixed(4)}
                  </td>
                )}

                {/* Fee — optional */}
                {showFees && (
                  <td
                    className={[
                      tdBase,
                      "border-b border-border/40 text-right tabular-nums align-middle",
                    ].join(" ")}
                  >
                    {fmt(tx.fee, tx.cur)}
                  </td>
                )}

                {/* Total */}
                <td
                  className={[
                    tdBase,
                    "border-b border-border/40 text-right tabular-nums align-middle pr-5",
                    totalColor,
                  ].join(" ")}
                >
                  {totalFormatted}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
