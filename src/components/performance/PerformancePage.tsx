"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAnimations } from "@/hooks/useAnimations";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformancePageHead } from "./PerformancePageHead";
import type { Period } from "./PerformancePageHead";
import { KPIStrip } from "./KPIStrip";
import type { TickState } from "./KPIStrip";
import { TradeAnalysisCard } from "./TradeAnalysisCard";
import type { TradeSortState, TradeSortCol, Density } from "./TradeTable";
import type { TradeRow, PerformanceStats, PerformanceApiResponse } from "./types";

// ---------------------------------------------------------------------------
// PerformancePage — root client component
// ---------------------------------------------------------------------------

function sortTrades(rows: TradeRow[], sort: TradeSortState): TradeRow[] {
  return [...rows].sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    switch (sort.col) {
      case "ticker":
        valA = a.ticker;
        valB = b.ticker;
        break;
      case "status":
        valA = a.status;
        valB = b.status;
        break;
      case "hold":
        valA = a.holdDays;
        valB = b.holdDays;
        break;
      case "invested":
        valA = a.investedEur;
        valB = b.investedEur;
        break;
      case "realized":
        valA = a.realizedEur;
        valB = b.realizedEur;
        break;
      case "unrealized":
        valA = a.unrealizedEur;
        valB = b.unrealizedEur;
        break;
      case "totalEur":
        valA = a.totalEur;
        valB = b.totalEur;
        break;
      case "roi":
        valA = a.roi;
        valB = b.roi;
        break;
      default:
        valA = a.totalEur;
        valB = b.totalEur;
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return sort.dir === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    const nA = valA as number;
    const nB = valB as number;
    return sort.dir === "asc" ? nA - nB : nB - nA;
  });
}

function buildTickDistribution(set: TradeRow[], tone: TickState): TickState[] {
  const ticks: TickState[] = Array(10).fill("off") as TickState[];
  const sortedByHold = [...set].sort((a, b) => a.holdDays - b.holdDays);
  sortedByHold.forEach((_, i) => {
    if (i < ticks.length) ticks[i] = tone;
  });
  return ticks;
}

export function PerformancePage() {
  const { enabled: animationsEnabled } = useAnimations();
  const rise = animationsEnabled ? "rise" : "";

  const [showClosed, setShowClosed] = useState(false);
  const [density] = useState<Density>("comfortable");
  const [period, setPeriod] = useState<Period>("YTD");
  const [sort, setSort] = useState<TradeSortState>({
    col: "totalEur",
    dir: "desc",
  });

  const [trades, setTrades] = useState<TradeRow[] | null>(null);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portfolio/performance");
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const json = (await res.json()) as PerformanceApiResponse;
      setTrades(json.data.trades);
      setStats(json.data.stats);
    } catch {
      setError("Não foi possível carregar o desempenho.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSort(col: TradeSortCol) {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  }

  // ---------------------------------------------------------------------------
  // Computed data — tick distributions are purely visual, derived from real
  // trades; all aggregate stats (win rate, avg hold, etc.) come from the API
  // ---------------------------------------------------------------------------

  const { activeTicks, winTicks, loseTicks, tableRows } = useMemo(() => {
    const all = trades ?? [];
    const activeRows = all.filter((x) => x.status === "active");
    const closedRows = all.filter((x) => x.status === "closed");
    const winners = all.filter((x) => x.totalEur > 0);
    const losers = all.filter((x) => x.totalEur < 0);

    const activeTicks = buildTickDistribution(activeRows, "active");
    const winTicks = buildTickDistribution(winners, "gain");
    const loseTicks = buildTickDistribution(losers, "loss");

    const sortedActive = sortTrades(activeRows, sort);
    const sortedClosed = sortTrades(closedRows, sort);
    const tableRows = showClosed ? [...sortedActive, ...sortedClosed] : sortedActive;

    return { activeTicks, winTicks, loseTicks, tableRows };
  }, [trades, sort, showClosed]);

  // -- First load, still fetching: full-page skeleton
  if (trades === null && loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
            Performance
          </h1>
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="bg-card border border-border/50 rounded-lg overflow-hidden grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5 flex flex-col gap-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-5 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // -- First load failed, no data to show at all
  if (trades === null && error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
          Performance
        </h1>
        <div
          role="alert"
          className="rounded-lg border border-[var(--loss)]/40 bg-[var(--loss)]/10 px-4 py-6 text-sm text-[var(--loss)]"
        >
          {error}
        </div>
      </div>
    );
  }

  const activeCount = stats?.activeCount ?? 0;
  const closedCount = stats?.closedCount ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <PerformancePageHead
        activeCount={activeCount}
        closedCount={closedCount}
        period={period}
        onPeriodChange={setPeriod}
        animClass={rise}
      />

      {/* Stale refresh error — keep last good data visible */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--loss)]/40 bg-[var(--loss)]/10 px-4 py-3 text-sm text-[var(--loss)]"
        >
          {error} A mostrar os últimos dados carregados.
        </div>
      )}

      {/* KPI strip */}
      <div className={`${rise} d2`}>
        <KPIStrip
          winRate={stats?.winRate ?? 0}
          realizedPct={stats?.realizedPct ?? 0}
          unrealizedPct={stats?.unrealizedPct ?? 0}
          avgHoldAll={stats?.avgHoldAll ?? 0}
          avgHoldWin={stats?.avgHoldWin ?? 0}
          avgHoldLose={stats?.avgHoldLose ?? 0}
          activeTicks={activeTicks}
          winTicks={winTicks}
          loseTicks={loseTicks}
        />
      </div>

      {/* Trade Analysis card */}
      <TradeAnalysisCard
        rows={tableRows}
        showClosed={showClosed}
        sort={sort}
        density={density}
        onSort={handleSort}
        onShowClosedChange={setShowClosed}
        animClass={rise}
      />
    </div>
  );
}
