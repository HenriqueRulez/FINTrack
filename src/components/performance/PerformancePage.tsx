"use client";

import { useMemo, useState } from "react";
import { useAnimations } from "@/hooks/useAnimations";
import { PerformancePageHead } from "./PerformancePageHead";
import type { Period } from "./PerformancePageHead";
import { KPIStrip } from "./KPIStrip";
import type { TickState } from "./KPIStrip";
import { TradeAnalysisCard } from "./TradeAnalysisCard";
import type { EnrichedTrade, TradeSortState, TradeSortCol, Density } from "./TradeTable";
import {
  TRADES,
  convertTrade,
  generateSparkSeed,
} from "./mock-data";
import type { Currency } from "./mock-data";

// ---------------------------------------------------------------------------
// PerformancePage — root client component
// ---------------------------------------------------------------------------

function sortEnrichedTrades(
  rows: EnrichedTrade[],
  sort: TradeSortState
): EnrichedTrade[] {
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
        valA = a._investedEUR;
        valB = b._investedEUR;
        break;
      case "realized":
        valA = a._realizedEUR;
        valB = b._realizedEUR;
        break;
      case "unrealized":
        valA = a._unrealizedEUR;
        valB = b._unrealizedEUR;
        break;
      case "totalEUR":
        valA = a._totalEUR;
        valB = b._totalEUR;
        break;
      case "roi":
        valA = a._roi;
        valB = b._roi;
        break;
      default:
        valA = a._totalEUR;
        valB = b._totalEUR;
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

function buildTickDistribution(
  set: EnrichedTrade[],
  tone: TickState
): TickState[] {
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

  const [currency, setCurrency] = useState<Currency>("EUR");
  const [showClosed, setShowClosed] = useState(false);
  const [density] = useState<Density>("comfortable");
  const [period, setPeriod] = useState<Period>("YTD");
  const [sort, setSort] = useState<TradeSortState>({
    col: "totalEUR",
    dir: "desc",
  });

  function handleSort(col: TradeSortCol) {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  }

  // ---------------------------------------------------------------------------
  // Computed data
  // ---------------------------------------------------------------------------

  const {
    activeRows,
    closedRows,
    winRate,
    realizedPct,
    unrealizedPct,
    avgHoldAll,
    avgHoldWin,
    avgHoldLose,
    activeTicks,
    winTicks,
    loseTicks,
    activeCount,
    closedCount,
    tableRows,
  } = useMemo(() => {
    // Enrich all trades
    const all: EnrichedTrade[] = TRADES.map((tr) => {
      const invE = convertTrade(tr.invested, tr.native, "EUR");
      const reaE = convertTrade(tr.realized, tr.native, "EUR");
      const unrE = convertTrade(tr.unrealized, tr.native, "EUR");
      const totE = reaE + unrE;
      const roi = invE > 0 ? (totE / invE) * 100 : 0;
      const dir30 = totE === 0 ? 0 : totE > 0 ? 1 : -1;
      const pct30 = Math.max(-12, Math.min(12, roi * 0.18 + dir30 * 0.6));
      const seed = generateSparkSeed(tr.ticker);

      return {
        ...tr,
        _investedEUR: invE,
        _realizedEUR: reaE,
        _unrealizedEUR: unrE,
        _totalEUR: totE,
        _roi: roi,
        _dir30: dir30,
        _pct30: pct30,
        _seed: seed,
      };
    });

    const activeRows = all.filter((x) => x.status === "active");
    const closedRows = all.filter((x) => x.status === "closed");

    // KPI: Winners = totalEUR > 0 across ALL trades
    const winners = all.filter((x) => x._totalEUR > 0);
    const losers = all.filter((x) => x._totalEUR < 0);

    const winRate =
      all.length > 0 ? (winners.length / all.length) * 100 : 0;

    const totalRealized = all.reduce((s, x) => s + x._realizedEUR, 0);
    const totalUnrealized = all.reduce((s, x) => s + x._unrealizedEUR, 0);
    const absRea = Math.abs(totalRealized);
    const absUnr = Math.abs(totalUnrealized);
    const splitDenom = absRea + absUnr || 1;
    const realizedPct = (absRea / splitDenom) * 100;
    const unrealizedPct = (absUnr / splitDenom) * 100;

    // Avg hold — active positions only
    const avgHoldAll =
      activeRows.length > 0
        ? Math.round(
            activeRows.reduce((s, x) => s + x.holdDays, 0) / activeRows.length
          )
        : 0;

    // Winners/losers for hold averages: only active positions
    const activeWinners = activeRows.filter((x) => x._totalEUR > 0);
    const activeLosers = activeRows.filter((x) => x._totalEUR < 0);

    const avgHoldWin =
      activeWinners.length > 0
        ? Math.round(
            activeWinners.reduce((s, x) => s + x.holdDays, 0) /
              activeWinners.length
          )
        : 0;

    const avgHoldLose =
      activeLosers.length > 0
        ? Math.round(
            activeLosers.reduce((s, x) => s + x.holdDays, 0) /
              activeLosers.length
          )
        : 0;

    // Tick distributions
    const activeTicks = buildTickDistribution(activeRows, "active");
    const winTicks = buildTickDistribution(winners, "gain");
    const loseTicks = buildTickDistribution(losers, "loss");

    // Table rows: active sorted + closed at bottom (if showClosed)
    const sortedActive = sortEnrichedTrades(activeRows, sort);
    const sortedClosed = sortEnrichedTrades(closedRows, sort);
    const tableRows = showClosed
      ? [...sortedActive, ...sortedClosed]
      : sortedActive;

    return {
      activeRows,
      closedRows,
      winRate,
      realizedPct,
      unrealizedPct,
      avgHoldAll,
      avgHoldWin,
      avgHoldLose,
      activeTicks,
      winTicks,
      loseTicks,
      activeCount: activeRows.length,
      closedCount: closedRows.length,
      tableRows,
    };
  }, [sort, showClosed]);

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

      {/* KPI strip */}
      <div className={`${rise} d2`}>
        <KPIStrip
          winRate={winRate}
          realizedPct={realizedPct}
          unrealizedPct={unrealizedPct}
          avgHoldAll={avgHoldAll}
          avgHoldWin={avgHoldWin}
          avgHoldLose={avgHoldLose}
          activeTicks={activeTicks}
          winTicks={winTicks}
          loseTicks={loseTicks}
        />
      </div>

      {/* Trade Analysis card */}
      <TradeAnalysisCard
        rows={tableRows}
        currency={currency}
        showClosed={showClosed}
        sort={sort}
        density={density}
        onSort={handleSort}
        onCurrencyChange={setCurrency}
        onShowClosedChange={setShowClosed}
        animClass={rise}
      />

      {/* Suppress unused variable warnings for closed rows reference */}
      {activeRows.length === 0 && closedRows.length === 0 && null}
    </div>
  );
}
