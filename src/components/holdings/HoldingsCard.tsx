"use client";

import { useAnimations } from "@/hooks/useAnimations";
import { Button } from "@/components/ui/button";
import { ShowSoldToggle } from "./ShowSoldToggle";
import { HoldingsTable } from "./HoldingsTable";
import type { SortState, SortCol } from "./HoldingsTable";
import type { HoldingRow } from "./types";

// ---------------------------------------------------------------------------
// HoldingsCard — card with header controls + table
// ---------------------------------------------------------------------------

interface HoldingsCardProps {
  rows: HoldingRow[];
  showSold: boolean;
  sort: SortState;
  hasPriceGaps: boolean;
  refreshing: boolean;
  onSort: (col: SortCol) => void;
  onShowSoldChange: (v: boolean) => void;
  onRefresh: () => void;
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
    >
      <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
      <path d="M13.5 2.5v3h-3" />
    </svg>
  );
}

export function HoldingsCard({
  rows,
  showSold,
  sort,
  hasPriceGaps,
  refreshing,
  onSort,
  onShowSoldChange,
  onRefresh,
}: HoldingsCardProps) {
  const { enabled: animationsEnabled } = useAnimations();
  const rise = animationsEnabled ? "rise" : "";

  return (
    <div
      className={`bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col ${rise} d3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium tracking-tight leading-none">
            Holdings
          </h2>
          {hasPriceGaps && (
            <span
              className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm bg-[var(--loss)]/15 text-[var(--loss)]"
              title="Alguns preços estão indisponíveis — valores podem estar desatualizados"
            >
              Preços desatualizados
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Actualizar posições"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-7 w-7"
          >
            <RefreshIcon spinning={refreshing} />
          </Button>

          {/* Show sold toggle */}
          <ShowSoldToggle value={showSold} onChange={onShowSoldChange} />
        </div>
      </div>

      {/* Table body / empty state */}
      {rows.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-muted-foreground/40"
            aria-hidden="true"
          >
            <rect x="4" y="6" width="24" height="20" rx="2" />
            <path d="M10 12h12M10 17h8M10 22h5" />
          </svg>
          <p className="text-base font-medium text-foreground">
            Ainda não há posições
          </p>
          <p className="text-sm text-muted-foreground">
            Regista a primeira compra em /transactions
          </p>
        </div>
      ) : (
        <HoldingsTable rows={rows} sort={sort} onSort={onSort} />
      )}
    </div>
  );
}
