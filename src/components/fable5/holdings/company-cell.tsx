"use client";

// Cópia adaptada de src/components/holdings/CompanyCell.tsx — ícone neutro +
// pill com fill bar de alocação. O raiz mostra "| exchange"; o sandbox não
// guarda exchange, mostra a moeda da cotação.

import type { CSSProperties } from "react";
import type { F5HoldingRow } from "@/lib/fable5/types";
import { ASSET_CHART_VAR } from "./type-badge";

export function CompanyCell({ holding }: { holding: F5HoldingRow }) {
  const barVar = `var(--${ASSET_CHART_VAR[holding.asset_type]})`;

  return (
    <div className="flex items-center gap-3 min-w-[280px]">
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 bg-muted border border-border/50 text-muted-foreground"
        aria-hidden="true"
      >
        {holding.ticker.slice(0, 1)}
      </div>

      <div
        className="flex-1 h-[38px] rounded-md relative overflow-hidden border border-border/50 bg-muted"
        style={{ "--bar-color": barVar } as CSSProperties}
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-[600ms]"
          style={{
            width: `${Math.min(holding.pctOfPortfolio, 100)}%`,
            background: "var(--bar-color)",
            opacity: 0.18,
            transitionTimingFunction: "cubic-bezier(.2,.7,.2,1)",
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center w-full h-full px-3">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-baseline leading-none mb-[3px]">
              <span className="text-sm font-semibold tracking-wide leading-none">
                {holding.ticker}
              </span>
              {holding.quoteCurrency && (
                <span className="text-[10px] text-muted-foreground/60 ml-1.5">
                  | {holding.quoteCurrency}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {holding.name ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
