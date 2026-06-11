// Hero do dashboard Fable 5 — cópia adaptada de dashboard/HeroSection.tsx
// (mesmo visual: clamp 56-96px, neon-primary-text, delta badge gain/loss).
// Presentational, renderizado no servidor; símbolo da moeda segue a base.

import { cn } from "@/lib/utils";
import type { F5Currency } from "@/lib/fable5/types";

const CURRENCY_SYMBOL: Record<F5Currency, string> = {
  EUR: "€",
  USD: "$",
  BRL: "R$",
};

function formatInteger(n: number): string {
  return Math.floor(Math.abs(n))
    .toLocaleString("pt-PT", { useGrouping: true })
    .replace(/ /g, ",");
}

function formatDecimals(n: number): string {
  const cents = Math.round((Math.abs(n) % 1) * 100);
  return cents.toString().padStart(2, "0");
}

export interface F5HeroProps {
  totalValue: number;
  deltaPercent: number | null;
  deltaAbsolute: number;
  deltaLabel: string; // ex.: "unrealized P/L"
  currency: F5Currency;
  kpiSlot?: React.ReactNode;
}

export function F5Hero({
  totalValue,
  deltaPercent,
  deltaAbsolute,
  deltaLabel,
  currency,
  kpiSlot,
}: F5HeroProps) {
  const symbol = CURRENCY_SYMBOL[currency];
  const isPositive = deltaAbsolute >= 0;
  const gainLossClass = isPositive
    ? "bg-[var(--gain)]/15 text-[var(--gain)] neon-gain"
    : "bg-[var(--loss)]/15 text-[var(--loss)] neon-loss";
  const sign = isPositive ? "+" : "−";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-12 items-end pb-8 border-b border-border/40">
      {/* Left — património */}
      <div>
        {/* LIVE label */}
        <div className="flex items-center gap-3 mb-3">
          <span className="neon-dot" aria-hidden="true" />
          <span className="text-[10px] uppercase tracking-wider text-foreground font-medium">
            LIVE
          </span>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground tracking-wide">
            Total net worth — {currency}
          </span>
        </div>

        {/* Big number */}
        <p
          className="font-medium leading-[0.95] tracking-tight tabular-nums neon-primary-text text-foreground"
          style={{ fontSize: "clamp(56px, 8vw, 96px)" }}
          aria-label={`${totalValue.toFixed(2)} ${currency}`}
        >
          <span className="text-[0.42em] text-muted-foreground font-normal mr-3">
            {symbol}
          </span>
          <span>{formatInteger(totalValue)}</span>
          <span className="text-muted-foreground font-normal">
            .{formatDecimals(totalValue)}
          </span>
        </p>

        {/* Delta badge */}
        <div className="flex items-center gap-3 mt-4 text-xs">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              gainLossClass
            )}
          >
            {sign}
            {deltaPercent !== null ? Math.abs(deltaPercent).toFixed(2) : "0.00"}%
          </span>
          <span className="tabular-nums font-mono text-muted-foreground">
            {sign}
            {symbol}
            {Math.abs(deltaAbsolute).toLocaleString("pt-PT", {
              minimumFractionDigits: 2,
            })}
          </span>
          <span className="text-muted-foreground">{deltaLabel}</span>
        </div>
      </div>

      {/* Right — KPI slot */}
      {kpiSlot && <div>{kpiSlot}</div>}
    </div>
  );
}
