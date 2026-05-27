"use client";

import { TradeTable } from "./TradeTable";
import type { EnrichedTrade, TradeSortState, TradeSortCol, Density } from "./TradeTable";
import type { Currency } from "./mock-data";

// ---------------------------------------------------------------------------
// ShowClosedToggle — trades version (mirrors ShowSoldToggle)
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
// CurrencySelector (inline copy — avoids cross-component type dependency)
// ---------------------------------------------------------------------------

const CURRENCY_OPTIONS: Currency[] = ["EUR", "USD", "Native"];

interface CurrencySelectorProps {
  value: Currency;
  onChange: (v: Currency) => void;
}

function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <div
      role="group"
      aria-label="Seleccionar moeda de exibição"
      className="inline-flex items-center border border-border/50 rounded-md overflow-hidden"
    >
      {CURRENCY_OPTIONS.map((opt, i) => {
        const isActive = value === opt;
        const isLast = i === CURRENCY_OPTIONS.length - 1;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            aria-pressed={isActive}
            className={[
              "px-3 py-1 text-xs transition-colors",
              !isLast ? "border-r border-border/50" : "",
              isActive
                ? "text-primary bg-primary/10 font-medium"
                : "text-muted-foreground bg-transparent hover:bg-muted/60",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TradeAnalysisCard
// ---------------------------------------------------------------------------

interface TradeAnalysisCardProps {
  rows: EnrichedTrade[];
  currency: Currency;
  showClosed: boolean;
  sort: TradeSortState;
  density: Density;
  onSort: (col: TradeSortCol) => void;
  onCurrencyChange: (v: Currency) => void;
  onShowClosedChange: (v: boolean) => void;
  animClass: string;
}

export function TradeAnalysisCard({
  rows,
  currency,
  showClosed,
  sort,
  density,
  onSort,
  onCurrencyChange,
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
          <CurrencySelector value={currency} onChange={onCurrencyChange} />
        </div>
      </div>

      {/* Table */}
      <TradeTable
        rows={rows}
        currency={currency}
        sort={sort}
        onSort={onSort}
        density={density}
      />
    </div>
  );
}
