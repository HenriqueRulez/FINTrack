"use client";

// Cópia adaptada de src/components/transactions/FilterRow.tsx — tipos só
// buy/sell, Delete liga ao bulk delete REAL, e ganha o botão "Add transaction"
// (o raiz não tem criação de transacções).

import { CheckBox } from "./checkbox";

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-muted-foreground shrink-0" aria-hidden="true">
      <rect x="1.5" y="2.5" width="11" height="10" rx="0.5" />
      <path d="M1.5 5h11M4 1.5v2M10 1.5v2" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-muted-foreground shrink-0" aria-hidden="true">
      <path d="M1.5 2.5h11l-4 5v4l-3 1.5v-5.5z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M1.5 12.5l1-3 7-7 2 2-7 7z" />
      <path d="M8.5 3.5l2 2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M2.5 3.5h9M5 3.5v-1.5h4v1.5M3.5 3.5l.5 9h6l.5-9" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M7 2.5v9M2.5 7h9" />
    </svg>
  );
}

interface FilterRowProps {
  fromDate: string;
  toDate: string;
  tickerQuery: string;
  typeFilter: string;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onTickerQueryChange: (v: string) => void;
  onTypeFilterChange: (v: string) => void;
  editMode: boolean;
  onEditModeToggle: () => void;
  selected: Set<string>;
  pagedLength: number;
  allOnPageSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onDelete: () => void;
  onAdd: () => void;
}

export function FilterRow({
  fromDate,
  toDate,
  tickerQuery,
  typeFilter,
  onFromDateChange,
  onToDateChange,
  onTickerQueryChange,
  onTypeFilterChange,
  editMode,
  onEditModeToggle,
  selected,
  pagedLength,
  allOnPageSelected,
  someSelected,
  onToggleAll,
  onDelete,
  onAdd,
}: FilterRowProps) {
  const chipBase =
    "bg-muted border border-border hover:border-border/70 rounded-md px-3 py-[7px] inline-flex items-center gap-2 min-h-[32px] text-sm cursor-pointer transition-colors";
  const inputBase =
    "bg-transparent border-none outline-none text-foreground font-mono text-sm placeholder:text-muted-foreground";

  const checkState: "off" | "on" | "mixed" = allOnPageSelected
    ? "on"
    : someSelected
      ? "mixed"
      : "off";

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 gap-4 flex-wrap">
      {/* Left — filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className={chipBase}>
          <CalendarIcon />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className={inputBase + " w-[110px]"}
            aria-label="From date"
          />
        </label>

        <label className={chipBase}>
          <CalendarIcon />
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className={inputBase + " w-[110px]"}
            aria-label="To date"
          />
        </label>

        <label className={chipBase}>
          <FilterIcon />
          <input
            type="text"
            value={tickerQuery}
            onChange={(e) => onTickerQueryChange(e.target.value)}
            placeholder="Filter by ticker"
            className={inputBase + " w-[130px]"}
            aria-label="Filter by ticker"
          />
        </label>

        <label className={chipBase}>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className={inputBase + " cursor-pointer appearance-none pr-5"}
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path d='M2 4l3 3 3-3' stroke='%23717799' stroke-width='1.4' fill='none' stroke-linecap='round'/></svg>")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right center",
            }}
            aria-label="Filter by type"
          >
            <option value="all">All Types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </label>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {editMode && (
          <>
            <button
              type="button"
              onClick={onToggleAll}
              role="checkbox"
              aria-checked={checkState === "mixed" ? "mixed" : checkState === "on"}
              aria-label="Select all"
              className="inline-flex items-center gap-2 px-3 py-[6px] rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <CheckBox state={checkState} interactive={false} />
              Select All ({pagedLength})
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={selected.size === 0}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-[6px] rounded-md text-sm font-mono border transition-colors",
                "bg-[var(--loss)]/10 border-[var(--loss)]/40 text-[var(--loss)]",
                selected.size === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90",
              ].join(" ")}
              aria-label={`Delete ${selected.size} selected transactions`}
            >
              <TrashIcon />
              Delete ({selected.size})
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onEditModeToggle}
          className={[
            "inline-flex items-center gap-1.5 px-3 py-[6px] rounded-md text-sm font-mono border transition-colors",
            editMode
              ? "bg-primary/10 border-primary/40 text-primary"
              : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60",
          ].join(" ")}
          aria-pressed={editMode}
          aria-label="Toggle edit mode"
        >
          <PencilIcon />
          Edit
        </button>

        {/* Add transaction — único ponto de escrita do sandbox */}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-md text-sm font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-colors neon-primary"
          aria-label="Add transaction"
        >
          <PlusIcon />
          Add transaction
        </button>
      </div>
    </div>
  );
}
