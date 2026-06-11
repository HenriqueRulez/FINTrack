// Sandbox Fable 5 — Dashboard (Fase 2): evolução do património.
// Hero no visual do raiz + "Portfolio over time" derivado do ledger +
// KPIs + alocação. Server Component: chama as libs directamente (sem HTTP
// a si próprio); o refresh client-side passa por /api/fable5/portfolio.

import { getF5Overview } from "@/lib/fable5/overview";
import { getF5ChartSeries } from "@/lib/fable5/chart";
import { F5Hero } from "@/components/fable5/hero";
import { F5SummaryCards } from "@/components/fable5/summary-cards";
import { F5RefreshButton } from "@/components/fable5/refresh-button";
import {
  AllocationDonutClient,
  F5PortfolioChartClient,
} from "@/components/fable5/charts-client";

export const dynamic = "force-dynamic";

export default async function Fable5DashboardPage() {
  const [overview, chart] = await Promise.all([
    getF5Overview(),
    getF5ChartSeries(),
  ]);
  const { summary, allocation, settings } = overview;

  if (summary.tx_count === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-medium">Património</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O ledger do sandbox está vazio. Adicione a primeira transacção em
          Transactions para ver o património com preços reais do Yahoo Finance.
        </p>
      </section>
    );
  }

  const unrealizedPct =
    summary.invested_open > 0
      ? (summary.unrealized_total / summary.invested_open) * 100
      : null;

  return (
    <>
      <F5Hero
        totalValue={summary.total_value}
        deltaPercent={unrealizedPct}
        deltaAbsolute={summary.unrealized_total}
        deltaLabel="unrealized P/L"
        currency={summary.base_currency}
        kpiSlot={
          <div className="flex flex-col gap-3">
            <F5SummaryCards summary={summary} />
            <div className="flex justify-end">
              <F5RefreshButton
                fetchedAt={summary.prices_fetched_at}
                intervalMinutes={settings.refresh_interval_minutes}
              />
            </div>
          </div>
        }
      />

      <F5PortfolioChartClient
        data={chart.data}
        currency={summary.base_currency}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border/40 bg-card p-5">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground">
            Alocação por tipo
          </h2>
          <div className="mt-4">
            <AllocationDonutClient
              allocation={allocation}
              currency={summary.base_currency}
            />
          </div>
        </div>
      </section>
    </>
  );
}
