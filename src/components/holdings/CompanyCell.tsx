"use client";

import type { CSSProperties } from "react";
import type { HoldingRow } from "./types";

// ---------------------------------------------------------------------------
// CompanyCell — Company column: logo + ticker | currency + full name
// with colored allocation fill bar
// ---------------------------------------------------------------------------

interface CompanyCellProps {
  holding: HoldingRow;
  pct: number; // 0–100
}

export function CompanyCell({ holding, pct }: CompanyCellProps) {
  const barVar = `var(--${holding.chartVar})`;

  return (
    <div className="flex items-center gap-3 min-w-[280px]">
      {/* Neutral placeholder icon — initial letter of ticker */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 bg-muted border border-border/50 text-muted-foreground"
        aria-hidden="true"
      >
        {holding.ticker.slice(0, 1)}
      </div>

      {/* Pill with allocation fill bar */}
      <div
        className="flex-1 h-[38px] rounded-md relative overflow-hidden border border-border/50 bg-muted"
        style={{ "--bar-color": barVar } as CSSProperties}
      >
        {/* Fill layer */}
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-[600ms]"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: "var(--bar-color)",
            opacity: 0.18,
            transitionTimingFunction: "cubic-bezier(.2,.7,.2,1)",
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative flex items-center w-full h-full px-3">
          <div className="flex flex-col min-w-0 flex-1">
            {/* Ticker | Currency line */}
            <div className="flex items-baseline leading-none mb-[3px]">
              <span className="text-sm font-semibold tracking-wide leading-none">
                {holding.ticker}
              </span>
              <span className="text-[10px] text-muted-foreground/60 ml-1.5">
                | {holding.currency}
              </span>
            </div>
            {/* Full name */}
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {holding.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
