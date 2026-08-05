"use client";

import { TradeTable } from "./TradeTable";
import type { TradeSortState, TradeSortCol, Density } from "./TradeTable";
import type { TradeRow } from "./types";

// ---------------------------------------------------------------------------
// ShowClosedToggle
// ---------------------------------------------------------------------------

interface ShowClosedToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

function ShowClosedToggle({ value, onChange }: ShowClosedToggleProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm text-muted-foreground select-none whitespace-nowrap">
        Show closed
      </span>
      <button
        role="switch"
        aria-checked={value}
        aria-label="Mostrar trades fechados"
        onClick={() => onChange(!value)}
        className={[
          "relative inline-flex w-8 h-[18px] shrink-0 cursor-pointer rounded-full border transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          value ? "bg-primary/20 border-primary" : "bg-muted border-border",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute top-[2px] left-[2px] w-3 h-3 rounded-full transition-transform duration-150",
            value ? "translate-x-[14px] bg-primary" : "translate-x-0 bg-muted-foreground",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TradeAnalysisCard
// ---------------------------------------------------------------------------

interface TradeAnalysisCardProps {
  rows: TradeRow[];
  showClosed: boolean;
  sort: TradeSortState;
  density: Density;
  onSort: (col: TradeSortCol) => void;
  onShowClosedChange: (v: boolean) => void;
  animClass: string;
}

export function TradeAnalysisCard({
  rows,
  showClosed,
  sort,
  density,
  onSort,
  onShowClosedChange,
  animClass,
}: TradeAnalysisCardProps) {
  return (
    <div
      className={`bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col ${animClass} d3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-wrap gap-3">
        <h2 className="text-[22px] font-medium tracking-tight leading-none">
          Trade Analysis
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <ShowClosedToggle value={showClosed} onChange={onShowClosedChange} />
        </div>
      </div>

      {/* Table / empty state */}
      {rows.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground/40"
            aria-hidden="true"
          >
            <rect x="4" y="6" width="24" height="20" rx="2" />
            <path d="M10 12h12M10 17h8M10 22h5" />
          </svg>
          <p className="text-base font-medium text-foreground">
            Ainda não há trades
          </p>
          <p className="text-sm text-muted-foreground">
            Regista a primeira compra em /transactions
          </p>
        </div>
      ) : (
        <TradeTable rows={rows} sort={sort} onSort={onSort} density={density} />
      )}
    </div>
  );
}
