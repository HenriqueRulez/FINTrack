"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAnimations } from "@/hooks/useAnimations";

export interface KpiItem {
  label: string;
  value: string;
  sub?: string;
  /** "gain" | "loss" | "neutral" controls colour of the value */
  sentiment?: "gain" | "loss" | "neutral";
}

export interface KpiGridProps {
  items?: KpiItem[] | null;
  isLoading?: boolean;
}

const MOCK_KPIS: KpiItem[] = [
  { label: "Invested capital", value: "€ 0.00", sub: "cost basis", sentiment: "neutral" },
  { label: "Cash reserve", value: "€ 0.00", sub: "available", sentiment: "neutral" },
  { label: "Open positions", value: "0", sub: "active holdings", sentiment: "neutral" },
  { label: "Day P&L", value: "€ 0.00", sub: "today vs yesterday", sentiment: "neutral" },
];

const sentimentClass: Record<string, string> = {
  gain: "text-[var(--gain)]",
  loss: "text-[var(--loss)]",
  neutral: "text-foreground",
};

export function KpiGrid({ items = null, isLoading = false }: KpiGridProps) {
  const { enabled: animationsEnabled } = useAnimations();
  const riseClass = animationsEnabled ? "rise" : "";

  const kpis = items ?? MOCK_KPIS;

  return (
    <div className={`grid grid-cols-2 border-l border-t border-border/40 ${riseClass} d1`}>
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border-r border-b border-border/40 p-4 flex flex-col gap-2 bg-card/40 [&:nth-child(2n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0"
            >
              <Skeleton className="h-3 w-24 animate-pulse" />
              <Skeleton className="h-6 w-20 animate-pulse" />
              <Skeleton className="h-3 w-16 animate-pulse" />
            </div>
          ))
        : kpis.map((kpi, i) => (
            <div
              key={i}
              className={[
                "border-r border-b border-border/40 p-4 flex flex-col gap-2 bg-card/40",
                i % 2 === 1 ? "border-r-0" : "",
                i >= kpis.length - 2 ? "border-b-0" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </span>
              <span
                className={`text-2xl font-medium tabular-nums leading-none mt-1 ${
                  sentimentClass[kpi.sentiment ?? "neutral"]
                }`}
              >
                {kpi.value}
              </span>
              {kpi.sub && (
                <span className="text-[10px] text-muted-foreground/70 tracking-wide">
                  {kpi.sub}
                </span>
              )}
            </div>
          ))}
    </div>
  );
}
