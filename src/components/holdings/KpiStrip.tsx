"use client";

import type { ReactNode } from "react";
import { useAnimations } from "@/hooks/useAnimations";

// ---------------------------------------------------------------------------
// KpiStrip — 7-cell KPI grid in a single card surface
// ---------------------------------------------------------------------------

export interface KpiStripItem {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  sentiment?: "gain" | "loss" | "neutral";
  neon?: boolean;
}

interface KpiStripProps {
  kpis: KpiStripItem[];
}

export function KpiStrip({ kpis }: KpiStripProps) {
  const { enabled: animationsEnabled } = useAnimations();
  const rise = animationsEnabled ? "rise" : "";

  return (
    <div
      className={`bg-card border border-border/50 rounded-lg overflow-hidden grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 ${rise} d2`}
      role="region"
      aria-label="KPI strip — métricas do portfólio"
    >
      {kpis.map((item, i) => {
        const totalCells = kpis.length;
        const isLastOverall = i === totalCells - 1;

        // Responsive top borders:
        // base (2-col): rows start at index 2, 4, 6
        // sm (4-col): rows start at index 4
        // xl (7-col): no top border (single row)
        const topBorderBase = i >= 2;
        const topBorderSm = i >= 4;

        return (
          <div
            key={item.label}
            className={[
              "p-4 flex flex-col gap-2 min-w-0",
              !isLastOverall ? "border-r border-border/50" : "",
              topBorderBase && !topBorderSm
                ? "border-t border-border/50 sm:border-t-0"
                : "",
              topBorderSm ? "border-t border-border/50 xl:border-t-0" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Label + icon row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {item.label}
              </span>
              <span
                className="text-muted-foreground/60 shrink-0"
                aria-hidden="true"
              >
                {item.icon}
              </span>
            </div>

            {/* Value */}
            <div
              className={[
                "text-[22px] font-medium leading-none mt-1 tabular-nums tracking-tight truncate",
                item.sentiment === "gain"
                  ? "text-[var(--gain)]"
                  : item.sentiment === "loss"
                    ? "text-[var(--loss)]"
                    : "text-foreground",
                item.neon && item.sentiment === "loss"
                  ? "neon-loss"
                  : item.neon && item.sentiment === "gain"
                    ? "neon-gain"
                    : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.value}
            </div>

            {/* Sub label */}
            <div className="text-[10px] text-muted-foreground/60 tracking-wide truncate">
              {item.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
