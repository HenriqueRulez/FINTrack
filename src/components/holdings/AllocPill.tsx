"use client";

import type { CSSProperties } from "react";
import type { HoldingItem } from "./mock-data";

// ---------------------------------------------------------------------------
// AllocPill — Company cell with logo + allocation fill bar
// ---------------------------------------------------------------------------

interface AllocPillProps {
  holding: HoldingItem;
  pct: number; // 0–100
  variant?: "fill" | "stripe" | "hidden";
}

export function AllocPill({ holding, pct, variant = "fill" }: AllocPillProps) {
  const barVar = `var(--${holding.chartVar})`;

  return (
    <div className="flex items-center gap-3 min-w-[260px]">
      {/* Asset logo */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 border border-border/50"
        style={{
          backgroundColor: barVar,
          color: "rgba(11,13,24,0.85)",
        }}
        aria-hidden="true"
      >
        {holding.ticker.slice(0, 2)}
      </div>

      {/* Pill */}
      {variant !== "hidden" && (
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
          <div className="relative flex items-center justify-between w-full h-full px-3 gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold tracking-wide leading-[1.2] truncate">
                {holding.ticker}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                {holding.name}
              </span>
            </div>
            <span className="text-xs text-foreground tabular-nums font-medium shrink-0">
              {holding.sold ? "—" : `${pct.toFixed(1)}%`}
            </span>
          </div>
        </div>
      )}

      {/* Fallback when hidden variant */}
      {variant === "hidden" && (
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold tracking-wide leading-[1.2] truncate">
            {holding.ticker}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[220px]">
            {holding.name}
          </span>
        </div>
      )}
    </div>
  );
}
