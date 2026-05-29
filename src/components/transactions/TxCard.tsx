"use client";

import { useAnimations } from "@/hooks/useAnimations";
import { FilterRow } from "./FilterRow";
import { TypeTabs } from "./TypeTabs";
import { TxTable } from "./TxTable";
import { TxFooter } from "./TxFooter";
import { EmptyState } from "./EmptyState";
import type {
  Transaction,
  TabKey,
  TabDefinition,
  SortCol,
  SortState,
  Density,
} from "./mock-data";

// ---------------------------------------------------------------------------
// TxCard — main card wrapper containing all transaction UI
// ---------------------------------------------------------------------------

interface TxCardProps {
  // Data
  filtered: Transaction[];
  paged: Transaction[];
  counts: Record<TabKey, number>;
  tabs: TabDefinition[];

  // Tab
  activeTab: TabKey;
  onTabChange: (key: TabKey) => void;

  // Filters
  fromDate: string;
  toDate: string;
  tickerQuery: string;
  typeFilter: string;
  onFromDateChange: (v: string) => void;
  onToDateChange: (v: string) => void;
  onTickerQueryChange: (v: string) => void;
  onTypeFilterChange: (v: string) => void;

  // Edit mode
  editMode: boolean;
  onEditModeToggle: () => void;
  selected: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
  onDelete: () => void;

  // Sort
  sort: SortState;
  onSort: (col: SortCol) => void;

  // Footer
  pageSize: number;
  onPageSizeChange: (n: number) => void;

  // Display
  density: Density;
  showFx: boolean;
  showFees: boolean;
}

export function TxCard({
  filtered,
  paged,
  counts,
  tabs,
  activeTab,
  onTabChange,
  fromDate,
  toDate,
  tickerQuery,
  typeFilter,
  onFromDateChange,
  onToDateChange,
  onTickerQueryChange,
  onTypeFilterChange,
  editMode,
  onEditModeToggle,
  selected,
  onToggleOne,
  onToggleAll,
  onDelete,
  sort,
  onSort,
  pageSize,
  onPageSizeChange,
  density,
  showFx,
  showFees,
}: TxCardProps) {
  const { enabled: animationsEnabled } = useAnimations();
  const rise = animationsEnabled ? "rise" : "";

  const allOnPageSelected =
    paged.length > 0 && paged.every((tx) => selected.has(tx.id));
  const someSelected = paged.some((tx) => selected.has(tx.id));

  return (
    <div
      className={`bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col ${rise} d2`}
    >
      {/* Filter row */}
      <FilterRow
        fromDate={fromDate}
        toDate={toDate}
        tickerQuery={tickerQuery}
        typeFilter={typeFilter}
        onFromDateChange={onFromDateChange}
        onToDateChange={onToDateChange}
        onTickerQueryChange={onTickerQueryChange}
        onTypeFilterChange={onTypeFilterChange}
        editMode={editMode}
        onEditModeToggle={onEditModeToggle}
        selected={selected}
        pagedLength={paged.length}
        allOnPageSelected={allOnPageSelected}
        someSelected={someSelected}
        onToggleAll={onToggleAll}
        onDelete={onDelete}
      />

      {/* Type tabs */}
      <TypeTabs
        tabs={tabs}
        activeTab={activeTab}
        counts={counts}
        onTabChange={onTabChange}
      />

      {/* Table or empty state */}
      {paged.length === 0 ? (
        <EmptyState />
      ) : (
        <TxTable
          rows={paged}
          editMode={editMode}
          selected={selected}
          sort={sort}
          onSort={onSort}
          onToggleOne={onToggleOne}
          onToggleAll={onToggleAll}
          allOnPageSelected={allOnPageSelected}
          someSelected={someSelected}
          density={density}
          showFx={showFx}
          showFees={showFees}
        />
      )}

      {/* Footer */}
      <TxFooter
        totalCount={filtered.length}
        selectedCount={selected.size}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
