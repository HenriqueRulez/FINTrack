"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAnimations } from "@/hooks/useAnimations";

export interface HeroSectionProps {
  /** Total net worth in EUR cents or decimal. Pass null while loading. */
  totalValue?: number | null;
  /** Delta percentage since inception. Pass null while loading. */
  deltaPercent?: number | null;
  /** Absolute delta value in EUR. Pass null while loading. */
  deltaAbsolute?: number | null;
  /** Whether data is still loading */
  isLoading?: boolean;
}

function formatInteger(n: number): string {
  return Math.floor(Math.abs(n))
    .toLocaleString("pt-PT", { useGrouping: true })
    .replace(/ /g, ",");
}

function formatDecimals(n: number): string {
  const cents = Math.round((Math.abs(n) % 1) * 100);
  return cents.toString().padStart(2, "0");
}

function formatCurrencyCompact(n: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Math.abs(n));
}

export interface HeroSectionExtendedProps extends HeroSectionProps {
  /** Right column slot — pass <KpiGrid /> here */
  kpiSlot?: React.ReactNode;
}

export function HeroSection({
  totalValue = null,
  deltaPercent = null,
  deltaAbsolute = null,
  isLoading = false,
  kpiSlot,
}: HeroSectionExtendedProps) {
  const { enabled: animationsEnabled } = useAnimations();
  const riseClass = animationsEnabled ? "rise" : "";

  const isPositive = deltaPercent !== null && deltaPercent >= 0;
  const gainLossClass = isPositive
    ? "bg-[var(--gain)]/15 text-[var(--gain)] neon-gain"
    : "bg-[var(--loss)]/15 text-[var(--loss)] neon-loss";

  const sign = isPositive ? "+" : "−";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-12 items-end pb-8 border-b border-border/40">
      {/* Left — patrimônio */}
      <div className={`${riseClass} d0`}>
        {/* LIVE label */}
        <div className="flex items-center gap-3 mb-3">
          <span className="neon-dot" aria-hidden="true" />
          <span className="text-[10px] uppercase tracking-wider text-foreground font-medium">
            LIVE
          </span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground tracking-wide">
            Total net worth — EUR
          </span>
        </div>

        {/* Big number */}
        {isLoading || totalValue === null ? (
          <Skeleton className="h-20 w-64 animate-pulse rounded-md bg-muted" />
        ) : (
          <p
            className="font-medium leading-[0.95] tracking-tight tabular-nums neon-primary-text text-foreground"
            style={{ fontSize: "clamp(56px, 8vw, 96px)" }}
            aria-label={`${formatCurrencyCompact(totalValue)} euros`}
          >
            <span className="text-[0.42em] text-muted-foreground font-normal mr-3">
              €
            </span>
            <span>{formatInteger(totalValue)}</span>
            <span className="text-muted-foreground font-normal">
              .{formatDecimals(totalValue)}
            </span>
          </p>
        )}

        {/* Delta badge */}
        {isLoading || deltaPercent === null ? (
          <div className="flex items-center gap-3 mt-4">
            <Skeleton className="h-4 w-32 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center gap-3 mt-4 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${gainLossClass}`}
            >
              {sign}
              {Math.abs(deltaPercent).toFixed(2)}%
            </span>
            {deltaAbsolute !== null && (
              <span className="tabular-nums font-mono text-muted-foreground">
                {sign}€{Math.abs(deltaAbsolute).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
              </span>
            )}
            <span className="text-muted-foreground">since inception</span>
          </div>
        )}
      </div>

      {/* Right — KPI slot */}
      {kpiSlot && <div>{kpiSlot}</div>}
    </div>
  );
}
