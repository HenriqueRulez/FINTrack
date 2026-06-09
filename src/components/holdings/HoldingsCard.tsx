"use client";

import { useState } from "react";
import { useAnimations } from "@/hooks/useAnimations";
import { Button } from "@/components/ui/button";
import { ShowSoldToggle } from "./ShowSoldToggle";
import { CurrencySelector } from "./CurrencySelector";
import { HoldingsTable } from "./HoldingsTable";
import type { EnrichedHolding, SortState, SortCol } from "./HoldingsTable";
import type { Currency } from "./mock-data";

// ---------------------------------------------------------------------------
// HoldingsCard — card with header controls + table
// ---------------------------------------------------------------------------

interface HoldingsCardProps {
  rows: EnrichedHolding[];
  currency: Currency;
  showSold: boolean;
  sort: SortState;
  onSort: (col: SortCol) => void;
  onCurrencyChange: (v: Currency) => void;
  onShowSoldChange: (v: boolean) => void;
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={spinning ? "animate-spin" : ""}
      style={spinning ? { animationDuration: "400ms", animationIterationCount: 1 } : {}}
    >
      <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
      <path d="M13.5 2.5v3h-3" />
    </svg>
  );
}

export function HoldingsCard({
  rows,
  currency,
  showSold,
  sort,
  onSort,
  onCurrencyChange,
  onShowSoldChange,
}: HoldingsCardProps) {
  const { enabled: animationsEnabled } = useAnimations();
  const rise = animationsEnabled ? "rise" : "";
  const [spinning, setSpinning] = useState(false);

  async function handleRefresh() {
    setSpinning(true);
    try {
      // Trigger price refresh via existing GET /api/portfolio endpoint.
      // The endpoint updates stale prices (> 15 min) via yahoo-finance2 with cache.
      // Data is not used here yet — UI still renders mock data in Phase 1.
      await fetch("/api/portfolio");
    } catch {
      // Silent error — just stop the spin animation
    } finally {
      setSpinning(false);
    }
  }

  // Filter rows based on showSold
  const visibleRows = showSold
    ? rows
    : rows.filter((r) => !r.sold);

  return (
    <div
      className={`bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col ${rise} d3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-wrap gap-3">
        <h2 className="text-lg font-medium tracking-tight leading-none">
          Holdings
        </h2>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Actualizar preços"
            onClick={handleRefresh}
            className="h-7 w-7"
          >
            <RefreshIcon spinning={spinning} />
          </Button>

          {/* Show sold toggle */}
          <ShowSoldToggle value={showSold} onChange={onShowSoldChange} />

          {/* Currency selector */}
          <CurrencySelector value={currency} onChange={onCurrencyChange} />
        </div>
      </div>

      {/* Table body */}
      <HoldingsTable
        rows={visibleRows}
        currency={currency}
        sort={sort}
        onSort={onSort}
      />
    </div>
  );
}
