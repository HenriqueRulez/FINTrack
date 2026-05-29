"use client";

import { useMemo, useState, useCallback } from "react";
import { TxPageHead } from "./TxPageHead";
import { TxCard } from "./TxCard";
import { TxTweaksPanel } from "./TxTweaksPanel";
import {
  TRANSACTIONS,
  TYPE_TABS,
} from "./mock-data";
import type {
  TabKey,
  SortCol,
  SortState,
  Density,
  Transaction,
} from "./mock-data";

// ---------------------------------------------------------------------------
// Global filter helper
// ---------------------------------------------------------------------------

function passGlobalFilters(
  tx: Transaction,
  fromDate: string,
  toDate: string,
  tickerQuery: string,
  typeFilter: string
): boolean {
  if (fromDate && tx.date < fromDate) return false;
  if (toDate && tx.date > toDate) return false;
  if (
    tickerQuery &&
    !tx.ticker.toLowerCase().includes(tickerQuery.toLowerCase()) &&
    !(tx.label ?? "").toLowerCase().includes(tickerQuery.toLowerCase())
  )
    return false;
  if (typeFilter !== "all" && tx.type !== typeFilter) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

function sortTransactions(rows: Transaction[], sort: SortState): Transaction[] {
  return [...rows].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;

    switch (sort.col) {
      case "date":
        valA = a.date;
        valB = b.date;
        break;
      case "ticker":
        valA = a.ticker;
        valB = b.ticker;
        break;
      case "type":
        valA = a.type;
        valB = b.type;
        break;
      case "qty":
        valA = a.qty ?? -Infinity;
        valB = b.qty ?? -Infinity;
        break;
      case "price":
        valA = a.price ?? -Infinity;
        valB = b.price ?? -Infinity;
        break;
      case "fx":
        valA = a.fx;
        valB = b.fx;
        break;
      case "fee":
        valA = a.fee;
        valB = b.fee;
        break;
      case "total":
        valA = a.total;
        valB = b.total;
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
// TransactionsPage — root client component
// ---------------------------------------------------------------------------

export function TransactionsPage() {
  // -- Filters
  const [activeTab, setActiveTab] = useState<TabKey>("bs");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tickerQuery, setTickerQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // -- Edit mode
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // -- Sort
  const [sort, setSort] = useState<SortState>({ col: "date", dir: "desc" });

  // -- Pagination & display
  const [pageSize, setPageSize] = useState(20);
  const [density, setDensity] = useState<Density>("comfortable");
  const [showFx, setShowFx] = useState(true);
  const [showFees, setShowFees] = useState(true);

  // -- Sort handler
  function handleSort(col: SortCol) {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  }

  // -- Toggle edit mode
  function handleEditModeToggle() {
    setEditMode((prev) => {
      if (prev) setSelected(new Set()); // clear selection when exiting
      return !prev;
    });
  }

  // -- Tab counts (with global filters active, but without tab filter)
  const counts = useMemo(() => {
    const out = {} as Record<TabKey, number>;
    TYPE_TABS.forEach((tab) => {
      out[tab.key] = TRANSACTIONS.filter(
        (tx) =>
          tab.match(tx) &&
          passGlobalFilters(tx, fromDate, toDate, tickerQuery, typeFilter)
      ).length;
    });
    return out;
  }, [fromDate, toDate, tickerQuery, typeFilter]);

  // -- Filtered + sorted rows (global filters + active tab)
  const activeTabDef = TYPE_TABS.find((t) => t.key === activeTab)!;

  const filtered = useMemo(() => {
    const base = TRANSACTIONS.filter(
      (tx) =>
        activeTabDef.match(tx) &&
        passGlobalFilters(tx, fromDate, toDate, tickerQuery, typeFilter)
    );
    return sortTransactions(base, sort);
  }, [activeTabDef, fromDate, toDate, tickerQuery, typeFilter, sort]);

  // -- Paged rows
  const paged = useMemo(
    () => filtered.slice(0, pageSize),
    [filtered, pageSize]
  );

  // -- Toggle one row
  const handleToggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // -- Toggle all visible rows
  const handleToggleAll = useCallback(() => {
    setSelected((prev) => {
      const allIds = paged.map((tx) => tx.id);
      const allSelected = allIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      } else {
        const next = new Set(prev);
        allIds.forEach((id) => next.add(id));
        return next;
      }
    });
  }, [paged]);

  // -- Delete (demo only)
  function handleDelete() {
    alert(`Would delete ${selected.size} transaction(s)`);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <TxPageHead />

      {/* Main card */}
      <TxCard
        filtered={filtered}
        paged={paged}
        counts={counts}
        tabs={TYPE_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fromDate={fromDate}
        toDate={toDate}
        tickerQuery={tickerQuery}
        typeFilter={typeFilter}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onTickerQueryChange={setTickerQuery}
        onTypeFilterChange={setTypeFilter}
        editMode={editMode}
        onEditModeToggle={handleEditModeToggle}
        selected={selected}
        onToggleOne={handleToggleOne}
        onToggleAll={handleToggleAll}
        onDelete={handleDelete}
        sort={sort}
        onSort={handleSort}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        density={density}
        showFx={showFx}
        showFees={showFees}
      />

      {/* Tweaks panel (floating) */}
      <TxTweaksPanel
        density={density}
        onDensityChange={setDensity}
        showFx={showFx}
        onShowFxChange={setShowFx}
        showFees={showFees}
        onShowFeesChange={setShowFees}
      />
    </div>
  );
}
