"use client";

// ---------------------------------------------------------------------------
// KPIStrip — 5-cell unified card with micro-visualizations
// ---------------------------------------------------------------------------

// ── Icons (inline SVG 16×16) ──────────────────────────────────────────────

function TargetIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" />
      <circle cx="8" cy="8" r="4" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <rect x="2" y="3.5" width="12" height="9" rx="1" />
      <path d="M2 6h12" />
      <circle cx="11" cy="9" r="0.8" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4v4l3 2" />
    </svg>
  );
}

// ── Micro-viz components ──────────────────────────────────────────────────

function Gauge({ rate }: { rate: number }) {
  return (
    <div className="h-[6px] rounded-full bg-muted overflow-hidden relative">
      <div
        className="absolute inset-y-0 left-0 bg-primary rounded-full"
        style={{
          width: `${rate}%`,
          transition: "width 700ms cubic-bezier(.2,.7,.2,1)",
        }}
      />
    </div>
  );
}

function SplitBar({
  realizedPct,
  unrealizedPct,
}: {
  realizedPct: number;
  unrealizedPct: number;
}) {
  return (
    <div className="flex h-[6px] rounded-full overflow-hidden bg-muted">
      <div
        className="bg-[var(--gain)]"
        style={{ width: `${realizedPct}%` }}
      />
      <div
        className="bg-primary opacity-55"
        style={{ width: `${unrealizedPct}%` }}
      />
    </div>
  );
}

type TickState = "active" | "gain" | "loss" | "off";

function TickRow({ distribution }: { distribution: TickState[] }) {
  function tickClass(state: TickState): string {
    switch (state) {
      case "active":
        return "bg-primary";
      case "gain":
        return "bg-[var(--gain)]";
      case "loss":
        return "bg-[var(--loss)]";
      default:
        return "bg-muted";
    }
  }

  return (
    <div className="flex items-center gap-[6px] h-[6px]">
      {distribution.map((state, i) => (
        <div
          key={i}
          className={`flex-1 h-full rounded-[2px] ${tickClass(state)}`}
        />
      ))}
    </div>
  );
}

// ── KPI cell structure ────────────────────────────────────────────────────

interface KPIStripProps {
  winRate: number;
  realizedPct: number;
  unrealizedPct: number;
  avgHoldAll: number;
  avgHoldWin: number;
  avgHoldLose: number;
  activeTicks: TickState[];
  winTicks: TickState[];
  loseTicks: TickState[];
}


export function KPIStrip({
  winRate,
  realizedPct,
  unrealizedPct,
  avgHoldAll,
  avgHoldWin,
  avgHoldLose,
  activeTicks,
  winTicks,
  loseTicks,
}: KPIStripProps) {
  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {/* KPI 1 — Win Rate */}
        <div className={`p-5 flex flex-col gap-3 min-w-0 border-r border-border/50 md:border-r md:border-border/50 xl:border-r xl:border-border/50`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-foreground font-medium truncate">Win Rate</span>
            <span className="shrink-0 text-muted-foreground" aria-hidden="true">
              <TargetIcon />
            </span>
          </div>
          <div className="text-[28px] font-semibold leading-none tabular-nums tracking-tight truncate text-foreground">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[12px] text-muted-foreground tracking-wide truncate">
            Of positions are profitable
          </div>
          <div className="mt-auto pt-2">
            <Gauge rate={winRate} />
          </div>
        </div>

        {/* KPI 2 — Profit Split */}
        <div className={`p-5 flex flex-col gap-3 min-w-0 md:border-r md:border-border/50 xl:border-r xl:border-border/50`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-foreground font-medium truncate">Profit Split</span>
            <span className="shrink-0 text-muted-foreground" aria-hidden="true">
              <WalletIcon />
            </span>
          </div>
          <div className="text-[28px] font-semibold leading-none tabular-nums tracking-tight text-foreground flex items-baseline">
            <span>{realizedPct.toFixed(0)}%</span>
            <span className="text-[0.62em] text-muted-foreground mx-1 font-normal">/</span>
            <span>{unrealizedPct.toFixed(0)}%</span>
          </div>
          <div className="text-[12px] text-muted-foreground tracking-wide truncate">
            Realized vs Unrealized
          </div>
          <div className="mt-auto pt-2">
            <SplitBar realizedPct={realizedPct} unrealizedPct={unrealizedPct} />
          </div>
        </div>

        {/* KPI 3 — Overall Avg Hold */}
        <div className={`p-5 flex flex-col gap-3 min-w-0 border-t border-r border-border/50 md:border-t-0 md:border-r-0 xl:border-t-0 xl:border-r xl:border-border/50`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-foreground font-medium truncate">Overall Avg Hold</span>
            <span className="shrink-0 text-muted-foreground" aria-hidden="true">
              <ClockIcon />
            </span>
          </div>
          <div className="text-[28px] font-semibold leading-none tabular-nums tracking-tight truncate text-foreground">
            {avgHoldAll}
            <span className="text-[0.62em] text-muted-foreground ml-1 font-normal">
              {avgHoldAll === 1 ? "Day" : "Days"}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground tracking-wide truncate">
            Total portfolio discipline
          </div>
          <div className="mt-auto pt-2">
            <TickRow distribution={activeTicks} />
          </div>
        </div>

        {/* KPI 4 — Avg Winner Hold */}
        <div className={`p-5 flex flex-col gap-3 min-w-0 border-t border-border/50 md:border-t md:border-border/50 md:border-r md:border-border/50 xl:border-t-0 xl:border-r xl:border-border/50`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-foreground font-medium truncate">Avg Winner Hold</span>
            <span className="shrink-0 text-[var(--gain)]" aria-hidden="true">
              <ClockIcon />
            </span>
          </div>
          <div className="text-[28px] font-semibold leading-none tabular-nums tracking-tight truncate text-[var(--gain)]">
            {avgHoldWin}
            <span className="text-[0.62em] text-muted-foreground ml-1 font-normal">
              {avgHoldWin === 1 ? "Day" : "Days"}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground tracking-wide truncate">
            Letting winners run
          </div>
          <div className="mt-auto pt-2">
            <TickRow distribution={winTicks} />
          </div>
        </div>

        {/* KPI 5 — Avg Loser Hold */}
        <div className={`p-5 flex flex-col gap-3 min-w-0 border-t border-border/50 md:border-t md:border-border/50 md:border-r-0 xl:border-t-0`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-foreground font-medium truncate">Avg Loser Hold</span>
            <span className="shrink-0 text-[var(--loss)]" aria-hidden="true">
              <ClockIcon />
            </span>
          </div>
          <div className="text-[28px] font-semibold leading-none tabular-nums tracking-tight truncate text-[var(--loss)]">
            {avgHoldLose}
            <span className="text-[0.62em] text-muted-foreground ml-1 font-normal">
              {avgHoldLose === 1 ? "Day" : "Days"}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground tracking-wide truncate">
            Cutting losers fast
          </div>
          <div className="mt-auto pt-2">
            <TickRow distribution={loseTicks} />
          </div>
        </div>
      </div>
    </div>
  );
}

export type { TickState };
