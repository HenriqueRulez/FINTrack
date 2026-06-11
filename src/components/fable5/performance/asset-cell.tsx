"use client";

// Cópia adaptada de src/components/performance/AssetCell.tsx — logo colorido
// pela classe do activo + ticker + moeda da cotação + nome.

import type { F5HoldingRow } from "@/lib/fable5/types";
import { ASSET_CHART_VAR } from "@/components/fable5/holdings/type-badge";

export function AssetCell({ holding }: { holding: F5HoldingRow }) {
  const chartVar = `var(--${ASSET_CHART_VAR[holding.asset_type]})`;

  return (
    <div className="flex items-center gap-3 min-w-[220px]">
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center text-[12px] font-bold shrink-0"
        style={{
          backgroundColor: chartVar,
          color: "var(--primary-foreground)",
        }}
        aria-hidden="true"
      >
        {holding.ticker.slice(0, 1)}
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-baseline leading-none mb-[3px]">
          <span className="text-[13px] font-semibold tracking-wide leading-none">
            {holding.ticker}
          </span>
          {holding.quoteCurrency && (
            <span className="text-[10px] text-muted-foreground/60 ml-1.5">
              {holding.quoteCurrency}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate max-w-[170px]">
          {holding.name ?? "—"}
        </span>
      </div>
    </div>
  );
}
