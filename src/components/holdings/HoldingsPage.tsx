"use client";

import { useMemo, useState } from "react";
import { PageHead } from "./PageHead";
import { KpiStrip } from "./KpiStrip";
import type { KpiStripItem } from "./KpiStrip";
import { HoldingsCard } from "./HoldingsCard";
import type { EnrichedHolding, SortState, SortCol } from "./HoldingsTable";
import {
  HOLDINGS,
  convertAmount,
  formatMoney,
} from "./mock-data";
import type { Currency } from "./mock-data";

// ---------------------------------------------------------------------------
// KPI icons (inline SVG 13×13)
// ---------------------------------------------------------------------------

function IconTotalValue() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <path d="M5 8h6M8 6v4" />
    </svg>
  );
}
function IconHoldings() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2v6l4 2" />
    </svg>
  );
}
function IconCash() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="1" y="4" width="14" height="9" rx="1" />
      <circle cx="8" cy="8.5" r="2" />
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

function sortRows(rows: EnrichedHolding[], sort: SortState): EnrichedHolding[] {
  return [...rows].sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    switch (sort.col) {
      case "ticker":
        valA = a.ticker;
        valB = b.ticker;
        break;
      case "pct":
        valA = a.pct;
        valB = b.pct;
        break;
      case "shares":
        valA = a.shares;
        valB = b.shares;
        break;
      case "avg":
        valA = convertAmount(a.avgCost, a.native, "EUR");
        valB = convertAmount(b.avgCost, b.native, "EUR");
        break;
      case "cost":
        valA = convertAmount(a.costBasis, a.native, "EUR");
        valB = convertAmount(b.costBasis, b.native, "EUR");
        break;
      case "price":
        valA = convertAmount(a.currentPrice, a.native, "EUR");
        valB = convertAmount(b.currentPrice, b.native, "EUR");
        break;
      case "value":
        valA = a.marketValueEUR;
        valB = b.marketValueEUR;
        break;
      case "gain":
        valA = a.gainLossEUR;
        valB = b.gainLossEUR;
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

// ---------------------------------------------------------------------------
// HoldingsPage — root client component
// ---------------------------------------------------------------------------

export function HoldingsPage() {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [showSold, setShowSold] = useState(false);
  const [sort, setSort] = useState<SortState>({ col: "value", dir: "desc" });

  function handleSort(col: SortCol) {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  }

  // ---------------------------------------------------------------------------
  // Enriched holdings + KPI calculations
  // ---------------------------------------------------------------------------

  const { enrichedRows, kpis, activeCount, soldCount } = useMemo(() => {
    const activeHoldings = HOLDINGS.filter((h) => !h.sold);
    const soldHoldings = HOLDINGS.filter((h) => h.sold);

    // Total active market value in EUR
    const totalActiveEUR = activeHoldings.reduce((sum, h) => {
      const marketVal = h.shares * h.currentPrice;
      return sum + convertAmount(marketVal, h.native, "EUR");
    }, 0);

    // Unrealized P/L (active positions) in EUR
    const unrealizedEUR = activeHoldings.reduce((sum, h) => {
      const gain = (h.currentPrice - h.avgCost) * h.shares;
      return sum + convertAmount(gain, h.native, "EUR");
    }, 0);

    // Realized P/L (sold positions) in EUR
    const realizedEUR = soldHoldings.reduce((sum, h) => {
      const gain = (h.currentPrice - h.avgCost) * h.shares;
      return sum + convertAmount(gain, h.native, "EUR");
    }, 0);

    const cashEUR = 0; // D2: placeholder €0,00 in this phase
    const totalEUR = totalActiveEUR + cashEUR;
    const totalPLEUR = unrealizedEUR + realizedEUR;

    // Enrich rows
    const allEnriched: EnrichedHolding[] = HOLDINGS.map((h) => {
      const marketVal = h.shares * h.currentPrice;
      const marketValueEUR = convertAmount(marketVal, h.native, "EUR");
      const gainLoss = (h.currentPrice - h.avgCost) * h.shares;
      const gainLossEUR = convertAmount(gainLoss, h.native, "EUR");
      const costBasisEUR = convertAmount(h.costBasis, h.native, "EUR");
      const gainLossPct =
        costBasisEUR !== 0 ? (gainLossEUR / costBasisEUR) * 100 : 0;
      const pct = !h.sold && totalActiveEUR > 0
        ? (marketValueEUR / totalActiveEUR) * 100
        : 0;

      return {
        ...h,
        marketValueEUR,
        pct,
        gainLossEUR,
        gainLossPct,
      };
    });

    // Separate active from sold for sorting — sold always at bottom
    const activeEnriched = allEnriched.filter((r) => !r.sold);
    const soldEnriched = allEnriched.filter((r) => r.sold);

    const sortedActive = sortRows(activeEnriched, sort);
    const sortedSold = sortRows(soldEnriched, sort);
    const enrichedRows = [...sortedActive, ...sortedSold];

    // Build KPIs
    const fmtEUR = (n: number) => formatMoney(n, "EUR");
    const totalSentiment: KpiStripItem["sentiment"] =
      totalEUR < 0 ? "loss" : "neutral";
    const plSentiment = (n: number): KpiStripItem["sentiment"] =>
      n > 0 ? "gain" : n < 0 ? "loss" : "neutral";

    const kpis: KpiStripItem[] = [
      {
        label: "Total Value",
        value: fmtEUR(totalEUR),
        sub: "Investments + cash",
        icon: <IconTotalValue />,
        sentiment: totalSentiment,
        neon: totalEUR < 0,
      },
      {
        label: "Holdings Value",
        value: fmtEUR(totalActiveEUR),
        sub: "Open positions",
        icon: <IconHoldings />,
        sentiment: "neutral",
        neon: false,
      },
      {
        label: "Cash",
        value: fmtEUR(cashEUR),
        sub: "Uninvested cash balance",
        icon: <IconCash />,
        sentiment: cashEUR < 0 ? "loss" : "neutral",
        neon: false,
      },
      {
        label: "Total P/L",
        value: fmtEUR(totalPLEUR),
        sub: "Since inception",
        icon: <IconPL />,
        sentiment: plSentiment(totalPLEUR),
        neon: false,
      },
      {
        label: "Unrealized P/L",
        value: fmtEUR(unrealizedEUR),
        sub: "Open positions",
        icon: <IconPL />,
        sentiment: plSentiment(unrealizedEUR),
        neon: false,
      },
      {
        label: "Realized P/L",
        value: fmtEUR(realizedEUR),
        sub: "Closed trades",
        icon: <IconPL />,
        sentiment: plSentiment(realizedEUR),
        neon: false,
      },
      {
        label: "Holdings",
        value: String(activeHoldings.length),
        sub: "Active positions",
        icon: <IconCount />,
        sentiment: "neutral",
        neon: false,
      },
    ];

    return {
      enrichedRows,
      kpis,
      activeCount: activeHoldings.length,
      soldCount: soldHoldings.length,
    };
  }, [sort]);

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <PageHead activeCount={activeCount} soldCount={soldCount} />

      {/* KPI strip */}
      <KpiStrip kpis={kpis} />

      {/* Holdings card + table */}
      <HoldingsCard
        rows={enrichedRows}
        currency={currency}
        showSold={showSold}
        sort={sort}
        onSort={handleSort}
        onCurrencyChange={setCurrency}
        onShowSoldChange={setShowSold}
      />
    </div>
  );
}
