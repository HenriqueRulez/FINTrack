"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHead } from "./PageHead";
import { KpiStrip } from "./KpiStrip";
import type { KpiStripItem } from "./KpiStrip";
import { HoldingsCard } from "./HoldingsCard";
import { displayGain } from "./HoldingsTable";
import type { SortState, SortCol } from "./HoldingsTable";
import { formatMoneyEur } from "./format";
import type { HoldingRow, HoldingsKpis, HoldingsApiResponse } from "./types";

// ---------------------------------------------------------------------------
// KPI icons (inline SVG 13×13)
// ---------------------------------------------------------------------------

function IconHoldings() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2v6l4 2" />
    </svg>
  );
}
function IconPL() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12l4-4 3 2 5-6" />
    </svg>
  );
}
function IconCount() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sorting helper
// ---------------------------------------------------------------------------

function sortRows(rows: HoldingRow[], sort: SortState): HoldingRow[] {
  return [...rows].sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    switch (sort.col) {
      case "ticker":
        valA = a.ticker;
        valB = b.ticker;
        break;
      case "pct":
        valA = a.pctOfPortfolio;
        valB = b.pctOfPortfolio;
        break;
      case "shares":
        valA = a.shares;
        valB = b.shares;
        break;
      case "avg":
        valA = a.avgCostEur;
        valB = b.avgCostEur;
        break;
      case "cost":
        valA = a.costBasisEur;
        valB = b.costBasisEur;
        break;
      case "price":
        valA = a.currentPriceEur ?? 0;
        valB = b.currentPriceEur ?? 0;
        break;
      case "value":
        valA = a.marketValueEur;
        valB = b.marketValueEur;
        break;
      case "gain":
        valA = displayGain(a).amountEur;
        valB = displayGain(b).amountEur;
        break;
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

function buildKpis(kpis: HoldingsKpis): KpiStripItem[] {
  const plSentiment = (n: number): KpiStripItem["sentiment"] =>
    n > 0 ? "gain" : n < 0 ? "loss" : "neutral";

  return [
    {
      label: "Holdings Value",
      value: formatMoneyEur(kpis.holdingsValueEur),
      sub: "Open positions",
      icon: <IconHoldings />,
      sentiment: "neutral",
      neon: false,
    },
    {
      label: "Unrealized P/L",
      value: formatMoneyEur(kpis.unrealizedEur),
      sub: "Open positions",
      icon: <IconPL />,
      sentiment: plSentiment(kpis.unrealizedEur),
      neon: false,
    },
    {
      label: "Realized P/L",
      value: formatMoneyEur(kpis.realizedEur),
      sub: "Closed trades",
      icon: <IconPL />,
      sentiment: plSentiment(kpis.realizedEur),
      neon: false,
    },
    {
      label: "Total P/L",
      value: formatMoneyEur(kpis.totalPlEur),
      sub: "Since inception",
      icon: <IconPL />,
      sentiment: plSentiment(kpis.totalPlEur),
      neon: kpis.totalPlEur < 0,
    },
    {
      label: "Holdings",
      value: String(kpis.activeCount),
      sub: "Active positions",
      icon: <IconCount />,
      sentiment: "neutral",
      neon: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// HoldingsPage — root client component
// ---------------------------------------------------------------------------

export function HoldingsPage() {
  const [showSold, setShowSold] = useState(false);
  const [sort, setSort] = useState<SortState>({ col: "value", dir: "desc" });

  const [rows, setRows] = useState<HoldingRow[] | null>(null);
  const [kpis, setKpis] = useState<HoldingsKpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/holdings?showSold=${showSold}`);
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const json = (await res.json()) as HoldingsApiResponse;
      setRows(json.data.positions);
      setKpis(json.data.kpis);
    } catch {
      setError("Não foi possível carregar as posições.");
    } finally {
      setLoading(false);
    }
  }, [showSold]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSort(col: SortCol) {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  }

  const sortedRows = useMemo(
    () => (rows ? sortRows(rows, sort) : []),
    [rows, sort]
  );

  const kpiItems = useMemo(() => (kpis ? buildKpis(kpis) : []), [kpis]);

  // -- First load, still fetching: full-page skeleton
  if (rows === null && loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
            Holdings
          </h1>
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="bg-card border border-border/50 rounded-lg overflow-hidden grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-16" />
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
  if (rows === null && error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
          Holdings
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

  const activeCount = kpis?.activeCount ?? 0;
  const soldCount = kpis?.soldCount ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <PageHead activeCount={activeCount} soldCount={soldCount} />

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
      <KpiStrip kpis={kpiItems} />

      {/* Holdings card + table */}
      <HoldingsCard
        rows={sortedRows}
        showSold={showSold}
        sort={sort}
        hasPriceGaps={kpis?.hasPriceGaps ?? false}
        refreshing={loading}
        onSort={handleSort}
        onShowSoldChange={setShowSold}
        onRefresh={load}
      />
    </div>
  );
}
