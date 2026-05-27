"use client";

// ---------------------------------------------------------------------------
// PerformancePageHead — h1 + LIVE meta + period segmented control
// ---------------------------------------------------------------------------

export type Period = "1M" | "3M" | "YTD" | "1Y" | "ALL";

const PERIODS: Period[] = ["1M", "3M", "YTD", "1Y", "ALL"];

interface PerformancePageHeadProps {
  activeCount: number;
  closedCount: number;
  period: Period;
  onPeriodChange: (p: Period) => void;
  animClass: string;
}

export function PerformancePageHead({
  activeCount,
  closedCount,
  period,
  onPeriodChange,
  animClass,
}: PerformancePageHeadProps) {
  return (
    <div
      className={`flex items-end justify-between gap-5 flex-wrap ${animClass} d1`}
    >
      {/* Title + meta */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
          Performance
        </h1>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="neon-dot" aria-hidden="true" />
          <span className="text-foreground font-medium">LIVE</span>
          <span>·</span>
          <span>
            <span className="text-primary">{activeCount} active</span>
            {" · "}
            {closedCount} closed
          </span>
        </div>
      </div>

      {/* Period segmented control */}
      <div
        role="group"
        aria-label="Selector de período"
        className="inline-flex items-center bg-muted border border-border/50 rounded-md p-[2px] gap-[2px]"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            aria-pressed={period === p}
            className={[
              "px-3 py-[5px] text-xs rounded-sm transition-colors font-medium tracking-wide uppercase",
              period === p
                ? "bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
