// KPIs do dashboard Fable 5 — grid 2×2 no estilo do KpiGrid do raiz
// (células com bordas internas). Presentational, renderizado no servidor.

import { cn, formatPercent } from "@/lib/utils";
import { fmtMoney } from "@/lib/fable5/format";
import type { F5Summary } from "@/lib/fable5/types";

interface Kpi {
  label: string;
  value: string;
  sub: string;
  sentiment: "gain" | "loss" | "neutral";
}

function sentimentOf(n: number): Kpi["sentiment"] {
  return n > 0 ? "gain" : n < 0 ? "loss" : "neutral";
}

export function F5SummaryCards({ summary }: { summary: F5Summary }) {
  const base = summary.base_currency;
  const unrealizedPct =
    summary.invested_open > 0
      ? (summary.unrealized_total / summary.invested_open) * 100
      : 0;

  const kpis: Kpi[] = [
    {
      label: "Invested capital",
      value: fmtMoney(summary.invested_open, base),
      sub: "cost basis · open",
      sentiment: "neutral",
    },
    {
      label: "Unrealized P/L",
      value: `${summary.unrealized_total >= 0 ? "+" : ""}${fmtMoney(summary.unrealized_total, base)}`,
      sub: formatPercent(unrealizedPct),
      sentiment: sentimentOf(summary.unrealized_total),
    },
    {
      label: "Realized P/L",
      value: `${summary.realized_total >= 0 ? "+" : ""}${fmtMoney(summary.realized_total, base)}`,
      sub: "closed trades",
      sentiment: sentimentOf(summary.realized_total),
    },
    {
      label: "Open positions",
      value: String(summary.active_count),
      sub:
        summary.stale_tickers.length > 0
          ? `${summary.stale_tickers.length} stale price(s)`
          : "prices fresh",
      sentiment: "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-2 rounded-lg border border-border/40 bg-card overflow-hidden">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className={cn(
            "p-4",
            i % 2 === 0 && "border-r border-border/40",
            i < 2 && "border-b border-border/40"
          )}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {kpi.label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-medium tabular-nums",
              kpi.sentiment === "gain" && "text-[var(--gain)]",
              kpi.sentiment === "loss" && "text-[var(--loss)]"
            )}
          >
            {kpi.value}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/70 tracking-wide">
            {kpi.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
