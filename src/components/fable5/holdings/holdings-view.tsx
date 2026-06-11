"use client";

// Vista da página /holdings do sandbox — estado actual do portfólio,
// derivado do ledger (overview via props do server component).
// 7 KPIs no estilo do raiz; "Cash" do raiz não existe no sandbox e foi
// substituído por "Invested" + "Fees" (decisão de desenho D6).

import { useMemo, useState } from "react";
import { fmtMoney } from "@/lib/fable5/format";
import type { F5Overview, F5HoldingRow } from "@/lib/fable5/types";
import { F5RefreshButton } from "@/components/fable5/refresh-button";
import { KpiStrip, type KpiStripItem } from "./kpi-strip";
import {
  HoldingsTable,
  type CurrencyMode,
  type SortCol,
  type SortState,
} from "./holdings-table";

// ─── Ícones 13px (estilo do raiz) ────────────────────────────────────────────

function IconValue() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M1.5 12.5h11M3 9.5l3-3 2 2 3.5-4" />
    </svg>
  );
}
function IconInvested() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="2" y="5" width="10" height="7" rx="1" />
      <path d="M5 5V3.5a2 2 0 014 0V5" />
    </svg>
  );
}
function IconFees() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M4.5 9.5l5-5M5.5 5.5h.01M8.5 8.5h.01" />
    </svg>
  );
}
function IconPL() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M7 1.5v11M3.5 5L7 1.5 10.5 5M3.5 9L7 12.5 10.5 9" />
    </svg>
  );
}
function IconUnrealized() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" strokeDasharray="2.5 2" />
      <path d="M7 4.5v2.5l2 1.5" />
    </svg>
  );
}
function IconRealized() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M4.5 7l2 2 3.5-4" />
    </svg>
  );
}
function IconCount() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="2" y="2" width="4" height="4" />
      <rect x="8" y="2" width="4" height="4" />
      <rect x="2" y="8" width="4" height="4" />
      <rect x="8" y="8" width="4" height="4" />
    </svg>
  );
}

// ─── Toggle "Show closed" (estilo do ShowSoldToggle do raiz) ─────────────────

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

// ─── Sort helper ─────────────────────────────────────────────────────────────

function sortRows(rows: F5HoldingRow[], sort: SortState): F5HoldingRow[] {
  const value = (r: F5HoldingRow): string | number => {
    switch (sort.col) {
      case "ticker": return r.ticker;
      case "pct": return r.pctOfPortfolio;
      case "shares": return r.openQty;
      case "avg": return r.avgCostBase ?? -Infinity;
      case "cost": return r.investedBase ?? -Infinity;
      case "price": return r.currentPrice ?? -Infinity;
      case "value": return r.marketValueBase ?? -Infinity;
      case "gain": return (r.unrealizedBase ?? 0) + r.realizedBase;
    }
  };
  return [...rows].sort((a, b) => {
    // fechadas sempre no fundo (como o raiz)
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    const va = value(a);
    const vb = value(b);
    const cmp =
      typeof va === "string"
        ? va.localeCompare(vb as string)
        : (va as number) - (vb as number);
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

// ─── Vista ───────────────────────────────────────────────────────────────────

export function HoldingsView({ overview }: { overview: F5Overview }) {
  const { holdings, summary, settings } = overview;
  const base = summary.base_currency;

  const [showClosed, setShowClosed] = useState(false);
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("base");
  const [sort, setSort] = useState<SortState>({ col: "value", dir: "desc" });

  function handleSort(col: SortCol) {
    setSort((prev) => ({
      col,
      dir: prev.col === col ? (prev.dir === "asc" ? "desc" : "asc") : "desc",
    }));
  }

  const visibleRows = useMemo(
    () =>
      sortRows(
        holdings.filter((h) => showClosed || h.status === "active"),
        sort
      ),
    [holdings, showClosed, sort]
  );

  const totalPl = summary.unrealized_total + summary.realized_total;
  const kpis: KpiStripItem[] = [
    {
      label: "Total Value",
      value: fmtMoney(summary.total_value, base),
      sub: "open positions · market",
      icon: <IconValue />,
      neon: false,
    },
    {
      label: "Invested",
      value: fmtMoney(summary.invested_open, base),
      sub: "cost basis · open",
      icon: <IconInvested />,
    },
    {
      label: "Fees",
      value: fmtMoney(summary.fees_total, base),
      sub: "total paid",
      icon: <IconFees />,
    },
    {
      label: "Total P/L",
      value: `${totalPl >= 0 ? "+" : ""}${fmtMoney(totalPl, base)}`,
      sub: "realized + unrealized",
      icon: <IconPL />,
      sentiment: totalPl > 0 ? "gain" : totalPl < 0 ? "loss" : "neutral",
      neon: true,
    },
    {
      label: "Unrealized P/L",
      value: `${summary.unrealized_total >= 0 ? "+" : ""}${fmtMoney(summary.unrealized_total, base)}`,
      sub: "open positions",
      icon: <IconUnrealized />,
      sentiment:
        summary.unrealized_total > 0
          ? "gain"
          : summary.unrealized_total < 0
            ? "loss"
            : "neutral",
    },
    {
      label: "Realized P/L",
      value: `${summary.realized_total >= 0 ? "+" : ""}${fmtMoney(summary.realized_total, base)}`,
      sub: "closed trades",
      icon: <IconRealized />,
      sentiment:
        summary.realized_total > 0
          ? "gain"
          : summary.realized_total < 0
            ? "loss"
            : "neutral",
    },
    {
      label: "Holdings",
      value: String(summary.active_count),
      sub: `${summary.closed_count} closed`,
      icon: <IconCount />,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Page head */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
          Holdings
        </h1>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="neon-dot" aria-hidden="true" />
          <span className="text-foreground font-medium">LIVE</span>
          <span>·</span>
          <span>
            <span className="text-primary">{summary.active_count} active</span>
            {" · "}
            {summary.closed_count} closed
          </span>
        </div>
      </div>

      <KpiStrip kpis={kpis} />

      {/* Holdings card */}
      <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 gap-4 flex-wrap">
          <h2 className="text-sm font-medium">Holdings</h2>
          <div className="flex items-center gap-4">
            <ShowClosedToggle checked={showClosed} onChange={setShowClosed} />

            {/* Currency mode: Base / Native */}
            <div className="flex gap-1 bg-muted/50 rounded-md p-1" role="group" aria-label="Moeda de apresentação">
              {(["base", "native"] as CurrencyMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCurrencyMode(mode)}
                  className={[
                    "px-2 py-1 text-[11px] rounded-sm transition-colors uppercase",
                    currencyMode === mode
                      ? "bg-card text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                  aria-pressed={currencyMode === mode}
                >
                  {mode === "base" ? base : "Native"}
                </button>
              ))}
            </div>

            <F5RefreshButton
              fetchedAt={summary.prices_fetched_at}
              intervalMinutes={settings.refresh_interval_minutes}
            />
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Sem posições. Adicione transacções em Transactions.
          </div>
        ) : (
          <HoldingsTable
            rows={visibleRows}
            baseCurrency={base}
            currencyMode={currencyMode}
            sort={sort}
            onSort={handleSort}
          />
        )}
      </div>
    </div>
  );
}
