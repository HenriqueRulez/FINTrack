"use client";

// Vista da página /transactions do sandbox — adaptação de
// src/components/transactions/TransactionsPage.tsx: dados via props (o server
// component carrega do banco), filtros/sort/paginação client-side, e
// mutações REAIS (dialogs → API → router.refresh()).

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { txTotal, TxTable, type Density, type SortCol, type SortState } from "./tx-table";
import { FilterRow } from "./filter-row";
import { TypeTabs, type F5TabKey } from "./type-tabs";
import { TxFooter } from "./tx-footer";
import { EmptyState } from "./empty-state";
import { TxTweaksPanel } from "./tx-tweaks-panel";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { DeleteTransactionsDialog } from "./delete-transactions-dialog";
import type { F5Asset, F5Transaction } from "@/lib/fable5/types";

function passGlobalFilters(
  tx: F5Transaction,
  fromDate: string,
  toDate: string,
  tickerQuery: string,
  typeFilter: string
): boolean {
  if (fromDate && tx.date < fromDate) return false;
  if (toDate && tx.date > toDate) return false;
  if (
    tickerQuery &&
    !tx.ticker.toLowerCase().includes(tickerQuery.toLowerCase())
  )
    return false;
  if (typeFilter !== "all" && tx.type !== typeFilter) return false;
  return true;
}

function sortTransactions(
  rows: F5Transaction[],
  sort: SortState
): F5Transaction[] {
  return [...rows].sort((a, b) => {
    let valA: string | number = 0;
    let valB: string | number = 0;
    switch (sort.col) {
      case "date": valA = a.date; valB = b.date; break;
      case "ticker": valA = a.ticker; valB = b.ticker; break;
      case "type": valA = a.type; valB = b.type; break;
      case "qty": valA = a.qty; valB = b.qty; break;
      case "price": valA = a.price; valB = b.price; break;
      case "fx": valA = a.fx_to_eur; valB = b.fx_to_eur; break;
      case "fee": valA = a.fee; valB = b.fee; break;
      case "total": valA = txTotal(a); valB = txTotal(b); break;
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

export function TransactionsView({
  transactions,
  assets,
}: {
  transactions: F5Transaction[];
  assets: Record<string, F5Asset>;
}) {
  const router = useRouter();

  // Filtros
  const [activeTab, setActiveTab] = useState<F5TabKey>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tickerQuery, setTickerQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sort / paginação / display
  const [sort, setSort] = useState<SortState>({ col: "date", dir: "desc" });
  const [pageSize, setPageSize] = useState(20);
  const [density, setDensity] = useState<Density>("comfortable");
  const [showFx, setShowFx] = useState(true);
  const [showFees, setShowFees] = useState(true);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<F5Transaction | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  function handleSort(col: SortCol) {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  }

  function handleEditModeToggle() {
    setEditMode((prev) => {
      if (prev) setSelected(new Set());
      return !prev;
    });
  }

  // Contagens das tabs (com filtros globais, sem o filtro da tab)
  const counts = useMemo(() => {
    const out: Record<F5TabKey, number> = { all: 0, buy: 0, sell: 0 };
    for (const tx of transactions) {
      if (!passGlobalFilters(tx, fromDate, toDate, tickerQuery, typeFilter)) {
        continue;
      }
      out.all++;
      out[tx.type]++;
    }
    return out;
  }, [transactions, fromDate, toDate, tickerQuery, typeFilter]);

  const filtered = useMemo(() => {
    const base = transactions.filter(
      (tx) =>
        (activeTab === "all" || tx.type === activeTab) &&
        passGlobalFilters(tx, fromDate, toDate, tickerQuery, typeFilter)
    );
    return sortTransactions(base, sort);
  }, [transactions, activeTab, fromDate, toDate, tickerQuery, typeFilter, sort]);

  const paged = useMemo(
    () => filtered.slice(0, pageSize),
    [filtered, pageSize]
  );

  const allOnPageSelected =
    paged.length > 0 && paged.every((tx) => selected.has(tx.id));
  const someSelected = paged.some((tx) => selected.has(tx.id));

  const handleToggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelected((prev) => {
      const allIds = paged.map((tx) => tx.id);
      const allSel = allIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSel) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });
  }, [paged]);

  function afterMutation() {
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <section>
        <h1 className="text-2xl font-medium">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Source of truth do sandbox — Holdings, Performance e Dashboard
          derivam daqui.
        </p>
      </section>

      {/* Main card */}
      <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
        <FilterRow
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
          pagedLength={paged.length}
          allOnPageSelected={allOnPageSelected}
          someSelected={someSelected}
          onToggleAll={handleToggleAll}
          onDelete={() => setDeleteIds([...selected])}
          onAdd={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        />

        <TypeTabs
          activeTab={activeTab}
          counts={counts}
          onTabChange={setActiveTab}
        />

        {paged.length === 0 ? (
          <EmptyState />
        ) : (
          <TxTable
            rows={paged}
            editMode={editMode}
            selected={selected}
            sort={sort}
            onSort={handleSort}
            onToggleOne={handleToggleOne}
            onToggleAll={handleToggleAll}
            allOnPageSelected={allOnPageSelected}
            someSelected={someSelected}
            density={density}
            showFx={showFx}
            showFees={showFees}
            onRowClick={(tx) => {
              setEditing(tx);
              setFormOpen(true);
            }}
          />
        )}

        <TxFooter
          totalCount={filtered.length}
          selectedCount={selected.size}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </div>

      <TxTweaksPanel
        density={density}
        onDensityChange={setDensity}
        showFx={showFx}
        onShowFxChange={setShowFx}
        showFees={showFees}
        onShowFeesChange={setShowFees}
      />

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        assets={assets}
        onSaved={afterMutation}
      />
      <DeleteTransactionsDialog
        ids={deleteIds}
        onOpenChange={(open) => {
          if (!open) setDeleteIds([]);
        }}
        onDeleted={() => {
          setEditMode(false);
          afterMutation();
        }}
      />
    </div>
  );
}
