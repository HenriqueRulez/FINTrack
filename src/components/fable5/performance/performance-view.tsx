"use client";

// Vista da página /performance do sandbox — resultados de trading derivados
// do ledger. Cálculos REAIS (o raiz usa mock): mesmos 5 KPIs e fórmulas do
// PerformancePage.tsx raiz, aplicados aos F5HoldingRow agregados por ticker.

import { useMemo, useState } from "react";
import type { F5HoldingRow, F5Overview } from "@/lib/fable5/types";
import { KPIStrip, type TickState } from "./kpi-strip";
import {
  TradeTable,
  tradeRoi,
  tradeTotal,
  type TradeSortCol,
  type TradeSortState,
} from "./trade-table";

function sortRows(rows: F5HoldingRow[], sort: TradeSortState): F5HoldingRow[] {
  const value = (r: F5HoldingRow): string | number => {
    switch (sort.col) {
      case "ticker": return r.ticker;
      case "status": return r.status;
      case "hold": return r.holdDays;
      case "invested": return r.investedBase ?? -Infinity;
      case "realized": return r.realizedBase;
      case "unrealized": return r.unrealizedBase ?? 0;
      case "total": return tradeTotal(r);
      case "roi": return tradeRoi(r) ?? -Infinity;
    }
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const cmp =
      typeof va === "string"
        ? va.localeCompare(vb as string)
        : (va as number) - (vb as number);
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

// Distribuição de 10 ticks (mesma lógica do raiz)
function buildTickDistribution(
  set: F5HoldingRow[],
  tone: TickState
): TickState[] {
  const ticks: TickState[] = Array(10).fill("off") as TickState[];
  set.forEach((_, i) => {
    if (i < ticks.length) ticks[i] = tone;
  });
  return ticks;
}

function ShowClosedToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <span
        className={[
          "relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-colors",
          checked ? "bg-primary/80 border-primary" : "bg-muted border-border",
        ].join(" ")}
        aria-hidden="true"
      >
        <span
          className={[
            "absolute top-[1px] h-3 w-3 rounded-full bg-background transition-all",
            checked ? "left-[14px]" : "left-[1px]",
          ].join(" ")}
        />
      </span>
      Show closed
    </button>
  );
}

export function PerformanceView({ overview }: { overview: F5Overview }) {
  const { holdings, summary } = overview;
  const base = summary.base_currency;

  const [showClosed, setShowClosed] = useState(true);
  const [sort, setSort] = useState<TradeSortState>({
    col: "total",
    dir: "desc",
  });

  function handleSort(col: TradeSortCol) {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  }

  const computed = useMemo(() => {
    const all = holdings;
    const activeRows = all.filter((h) => h.status === "active");

    // Win rate — winners = total P&L > 0, sobre TODAS as posições (como o raiz)
    const winners = all.filter((h) => tradeTotal(h) > 0);
    const losers = all.filter((h) => tradeTotal(h) < 0);
    const winRate = all.length > 0 ? (winners.length / all.length) * 100 : 0;

    // Profit split — |realized| vs |unrealized| (como o raiz)
    const absRea = Math.abs(summary.realized_total);
    const absUnr = Math.abs(summary.unrealized_total);
    const splitDenom = absRea + absUnr || 1;
    const realizedPct = (absRea / splitDenom) * 100;
    const unrealizedPct = (absUnr / splitDenom) * 100;

    // Avg holds — posições activas (como o raiz); hold = ciclo do ledger (D3)
    const avg = (set: F5HoldingRow[]) =>
      set.length > 0
        ? Math.round(set.reduce((s, h) => s + h.holdDays, 0) / set.length)
        : 0;
    const activeWinners = activeRows.filter((h) => tradeTotal(h) > 0);
    const activeLosers = activeRows.filter((h) => tradeTotal(h) < 0);

    const sortedActive = sortRows(activeRows, sort);
    const sortedClosed = sortRows(
      all.filter((h) => h.status === "closed"),
      sort
    );

    return {
      winRate,
      realizedPct,
      unrealizedPct,
      avgHoldAll: avg(activeRows),
      avgHoldWin: avg(activeWinners),
      avgHoldLose: avg(activeLosers),
      activeTicks: buildTickDistribution(activeRows, "active"),
      winTicks: buildTickDistribution(winners, "gain"),
      loseTicks: buildTickDistribution(losers, "loss"),
      tableRows: showClosed ? [...sortedActive, ...sortedClosed] : sortedActive,
    };
  }, [holdings, summary, sort, showClosed]);

  return (
    <div className="flex flex-col gap-5">
      {/* Page head */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
          Performance
        </h1>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="neon-dot" aria-hidden="true" />
          <span className="text-foreground font-medium">LIVE</span>
          <span>·</span>
          <span>
            Agregado por ticker · derivado de {summary.tx_count} transacções
          </span>
        </div>
      </div>

      <KPIStrip
        winRate={computed.winRate}
        realizedPct={computed.realizedPct}
        unrealizedPct={computed.unrealizedPct}
        avgHoldAll={computed.avgHoldAll}
        avgHoldWin={computed.avgHoldWin}
        avgHoldLose={computed.avgHoldLose}
        activeTicks={computed.activeTicks}
        winTicks={computed.winTicks}
        loseTicks={computed.loseTicks}
      />

      {/* Trade Analysis card */}
      <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 gap-4 flex-wrap">
          <h2 className="text-sm font-medium">Trade Analysis</h2>
          <div className="flex items-center gap-4">
            <ShowClosedToggle checked={showClosed} onChange={setShowClosed} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              valores em {base}
            </span>
          </div>
        </div>

        {computed.tableRows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Sem trades. Adicione transacções em Transactions.
          </div>
        ) : (
          <TradeTable
            rows={computed.tableRows}
            baseCurrency={base}
            sort={sort}
            onSort={handleSort}
          />
        )}
      </div>
    </div>
  );
}
