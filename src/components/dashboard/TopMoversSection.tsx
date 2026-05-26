"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAnimations } from "@/hooks/useAnimations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MoverItem {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  sparkline?: number[];
}

export interface TopMoversSectionProps {
  movers?: MoverItem[] | null;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_MOVERS: MoverItem[] = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    price: 214.5,
    changePercent: 2.34,
    sparkline: [210, 211, 209, 213, 212, 214, 215, 214.5],
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp.",
    price: 432.1,
    changePercent: 1.87,
    sparkline: [425, 427, 426, 429, 430, 431, 432, 432.1],
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    price: 1102.3,
    changePercent: -1.45,
    sparkline: [1120, 1115, 1110, 1108, 1105, 1103, 1102, 1102.3],
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    price: 178.9,
    changePercent: -2.91,
    sparkline: [185, 183, 181, 180, 179, 178, 179, 178.9],
  },
  {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    price: 198.4,
    changePercent: 0.72,
    sparkline: [196, 197, 196.5, 197.5, 198, 198.2, 198.4, 198.4],
  },
];

// ---------------------------------------------------------------------------
// Sparkline SVG
// ---------------------------------------------------------------------------

function Sparkline({ values, isPositive }: { values: number[]; isPositive: boolean }) {
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 22;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const colour = isPositive ? "var(--gain)" : "var(--loss)";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      className="opacity-85"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TopMoversSection({
  movers = null,
  isLoading = false,
}: TopMoversSectionProps) {
  const { enabled: animationsEnabled } = useAnimations();
  const riseClass = animationsEnabled ? "rise" : "";

  const data = movers ?? MOCK_MOVERS;

  return (
    <section aria-label="Top movers" className={`${riseClass} d3`}>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-[22px] font-medium tracking-tight leading-none">
          Top movers{" "}
          <span className="text-muted-foreground">· today</span>
        </h2>
        <a
          href="#"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
          aria-label="Ver toda a watchlist"
        >
          See all watchlist →
        </a>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-5 bg-card border border-border/40 rounded-lg overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-[100px] animate-pulse bg-muted/40 rounded-none"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-lg p-8 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No positions to display</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 max-[1100px]:grid-cols-3 bg-card border border-border/40 rounded-lg overflow-hidden">
          {data.map((mover, i) => {
            const isPositive = mover.changePercent >= 0;
            const pctClass = isPositive
              ? "text-[var(--gain)] neon-gain"
              : "text-[var(--loss)] neon-loss";
            const sign = isPositive ? "+" : "";

            // Border logic: all except last get right border; at 3-col breakpoint col3 loses it
            const isLastInRow5 = i === data.length - 1;
            const borderRight = isLastInRow5 ? "" : "border-r border-border/40";

            return (
              <div
                key={mover.ticker}
                className={[
                  "p-4 flex flex-col gap-2 min-w-0",
                  borderRight,
                  // At ≤1100px: 4th and 5th items get top border
                  i >= 3 ? "max-[1100px]:border-t max-[1100px]:border-border/40" : "",
                  // At ≤1100px: 3rd item loses right border
                  i === 2 ? "max-[1100px]:border-r-0" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Head */}
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold tracking-wide">
                    {mover.ticker}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    €{mover.price.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Name */}
                <p className="text-xs text-muted-foreground truncate">{mover.name}</p>

                {/* Percentage */}
                <p
                  className={`text-[22px] font-medium leading-none tracking-tight tabular-nums mt-2 ${pctClass}`}
                >
                  {sign}
                  {Math.abs(mover.changePercent).toFixed(2)}
                  <small className="text-[0.55em] opacity-80 ml-0.5">%</small>
                </p>

                {/* Sparkline */}
                {mover.sparkline && (
                  <Sparkline values={mover.sparkline} isPositive={isPositive} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
