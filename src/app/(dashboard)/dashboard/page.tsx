import { HeroSection } from "@/components/dashboard/HeroSection";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { TopMoversSection } from "@/components/dashboard/TopMoversSection";
import { PortfolioChartClient } from "@/components/dashboard/PortfolioChartClient";
import { createClient } from "@/lib/supabase/server";
import { getQuote, getHistory } from "@/lib/yahoo-finance/client";
import type { Tables } from "@/types/database";
import type { KpiItem } from "@/components/dashboard/KpiGrid";
import type { MoverItem } from "@/components/dashboard/TopMoversSection";
import type { ChartPoint } from "@/components/dashboard/PortfolioChart";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEur(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function buildKpis(
  investedCapital: number,
  openPositions: number,
  dayPnl: number
): KpiItem[] {
  return [
    {
      label: "Invested capital",
      value: formatEur(investedCapital),
      sub: "cost basis",
      sentiment: "neutral",
    },
    {
      label: "Cash reserve",
      value: formatEur(0),
      sub: "available",
      sentiment: "neutral",
    },
    {
      label: "Open positions",
      value: String(openPositions),
      sub: "active holdings",
      sentiment: "neutral",
    },
    {
      label: "Day P&L",
      value: formatEur(dayPnl),
      sub: "today vs yesterday",
      sentiment: dayPnl > 0 ? "gain" : dayPnl < 0 ? "loss" : "neutral",
    },
  ];
}

// ---------------------------------------------------------------------------
// Data fetching — direct Supabase + Yahoo Finance (no internal HTTP round-trip)
// ---------------------------------------------------------------------------

interface DashboardData {
  totalValue: number;
  deltaAbsolute: number;
  deltaPercent: number;
  kpis: KpiItem[];
  chartData: ChartPoint[];
  movers: MoverItem[];
}

async function getDashboardData(): Promise<DashboardData> {
  const empty: DashboardData = {
    totalValue: 0,
    deltaAbsolute: 0,
    deltaPercent: 0,
    kpis: buildKpis(0, 0, 0),
    chartData: [],
    movers: [],
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return empty;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: positions, error } = await (supabase as any)
      .from("portfolio_positions")
      .select("*")
      .eq("user_id", user.id) as {
        data: Tables<"portfolio_positions">[] | null;
        error: { message: string } | null;
      };

    if (error || !positions || positions.length === 0) return empty;

    // ---- Summary ----
    let totalValue = 0;
    let totalCost = 0;
    for (const p of positions) {
      const price = p.current_price ?? p.avg_price;
      totalValue += p.quantity * price;
      totalCost += p.quantity * p.avg_price;
    }
    const deltaAbsolute = totalValue - totalCost;
    const deltaPercent = totalCost > 0 ? (deltaAbsolute / totalCost) * 100 : 0;
    const kpis = buildKpis(totalCost, positions.length, 0);

    // ---- Chart + Movers (parallel) ----
    const [historiesResult, quotesResult] = await Promise.all([
      // Chart: histories for all positions
      Promise.all(
        positions.map(async (p) => ({
          position: p,
          history: await getHistory(p.ticker),
        }))
      ),
      // Movers: current quotes for all positions
      Promise.all(
        positions.map(async (p) => ({
          position: p,
          quote: await getQuote(p.ticker),
        }))
      ),
    ]);

    // Build chart data (default 3M = 90 days)
    const dateMap = new Map<string, { portfolio: number; invested: number }>();
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    for (const { position, history } of historiesResult) {
      const investedContrib = position.avg_price * position.quantity;
      for (const point of history) {
        if (new Date(point.date) < cutoff) continue;
        const existing = dateMap.get(point.date) ?? {
          portfolio: 0,
          invested: 0,
        };
        existing.portfolio += point.close * position.quantity;
        existing.invested += investedContrib;
        dateMap.set(point.date, existing);
      }
    }

    const chartData: ChartPoint[] = Array.from(dateMap.entries())
      .map(([date, values]) => ({
        date,
        portfolio: Math.round(values.portfolio * 100) / 100,
        invested: Math.round(values.invested * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build movers
    const enriched = quotesResult.map(({ position, quote }) => {
      const currentPrice =
        quote?.price ?? position.current_price ?? position.avg_price;
      const changePercent =
        position.avg_price > 0
          ? ((currentPrice - position.avg_price) / position.avg_price) * 100
          : 0;
      return {
        ticker: position.ticker,
        name: quote?.name ?? position.name,
        price: Math.round(currentPrice * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        sparkline: undefined as number[] | undefined,
      };
    });

    // Add sparklines from histories (last 7 points)
    const movers: MoverItem[] = enriched
      .sort(
        (a, b) =>
          Math.abs(b.changePercent) - Math.abs(a.changePercent)
      )
      .slice(0, 5)
      .map((m) => {
        const histEntry = historiesResult.find(
          (h) => h.position.ticker === m.ticker
        );
        const sparkline = histEntry?.history.slice(-7).map((h) => h.close);
        return {
          ...m,
          sparkline:
            sparkline && sparkline.length >= 2 ? sparkline : undefined,
        };
      });

    return {
      totalValue,
      deltaAbsolute,
      deltaPercent,
      kpis,
      chartData,
      movers,
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <>
      {/* Hero — patrimônio + KPI grid */}
      <HeroSection
        totalValue={data.totalValue}
        deltaPercent={data.deltaPercent}
        deltaAbsolute={data.deltaAbsolute}
        isLoading={false}
        kpiSlot={<KpiGrid items={data.kpis} isLoading={false} />}
      />

      {/* Portfolio evolution chart — rendered via Client Component wrapper (ssr: false) */}
      <PortfolioChartClient
        data={data.chartData.length > 0 ? data.chartData : null}
        isLoading={false}
      />

      {/* Top movers strip */}
      <TopMoversSection
        movers={data.movers.length > 0 ? data.movers : []}
        isLoading={false}
      />
    </>
  );
}
