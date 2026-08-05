import { HeroSection } from "@/components/dashboard/HeroSection";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { TopMoversSection } from "@/components/dashboard/TopMoversSection";
import { PortfolioChartClient } from "@/components/dashboard/PortfolioChartClient";
import { createClient } from "@/lib/supabase/server";
import { getHistory } from "@/lib/yahoo-finance/client";
import {
  derivePortfolio,
  type DerivedPortfolio,
  type TransactionRow,
} from "@/lib/portfolio/derive";
import { yahooPriceProvider } from "@/lib/portfolio/prices";
import { buildPortfolioChart } from "@/lib/portfolio/chart-data";
import { computeDayPnlEur } from "@/lib/portfolio/day-pnl";
import type { KpiItem } from "@/components/dashboard/KpiGrid";
import type { MoverItem } from "@/components/dashboard/TopMoversSection";
import type { ChartPoint } from "@/components/dashboard/PortfolioChart";

const LEDGER_COLUMNS = "id, date, ticker, type, qty, price, fx, fee, created_at";

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

// KPIs reais (F-04): removidos os placeholders falsos "Cash reserve"=0 e
// "Day P&L"=0. Day P&L usa dado real; quando indisponível mostra "—" (neutral).
function buildKpis(
  investedCapitalEur: number,
  unrealizedEur: number,
  openPositions: number,
  dayPnlEur: number | null
): KpiItem[] {
  return [
    {
      label: "Invested capital",
      value: formatEur(investedCapitalEur),
      sub: "cost basis",
      sentiment: "neutral",
    },
    {
      label: "Unrealized P&L",
      value: formatEur(unrealizedEur),
      sub: "open positions",
      sentiment:
        unrealizedEur > 0 ? "gain" : unrealizedEur < 0 ? "loss" : "neutral",
    },
    {
      label: "Open positions",
      value: String(openPositions),
      sub: "active holdings",
      sentiment: "neutral",
    },
    {
      label: "Day P&L",
      value: dayPnlEur === null ? "—" : formatEur(dayPnlEur),
      sub: "today vs yesterday",
      sentiment:
        dayPnlEur === null
          ? "neutral"
          : dayPnlEur > 0
            ? "gain"
            : dayPnlEur < 0
              ? "loss"
              : "neutral",
    },
  ];
}

// ---------------------------------------------------------------------------
// Data fetching — leitura directa (ledger → derivePortfolio), sem HTTP interno
// ---------------------------------------------------------------------------

type DashboardState = "ok" | "empty" | "error";

interface DashboardData {
  state: DashboardState;
  hasPriceGaps: boolean;
  totalValue: number;
  deltaAbsolute: number;
  deltaPercent: number;
  kpis: KpiItem[];
  chartData: ChartPoint[];
  movers: MoverItem[];
}

async function getDashboardData(): Promise<DashboardData> {
  const emptyKpis = buildKpis(0, 0, 0, null);
  const base: Omit<DashboardData, "state"> = {
    hasPriceGaps: false,
    totalValue: 0,
    deltaAbsolute: 0,
    deltaPercent: 0,
    kpis: emptyKpis,
    chartData: [],
    movers: [],
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...base, state: "empty" };

  const { data, error } = await supabase
    .from("transactions")
    .select(LEDGER_COLUMNS)
    .eq("user_id", user.id);

  // A-03: erro de leitura NÃO devolve patrimônio 0 silencioso — sinaliza erro.
  if (error) return { ...base, state: "error" };
  const rows: TransactionRow[] = data ?? [];

  // Carteira genuinamente vazia (0 transacções) — zeros são reais, não erro.
  if (rows.length === 0) return { ...base, state: "empty" };

  // Deriva o portfólio; falha de preços/DB → estado de erro (banner na UI).
  let derived: DerivedPortfolio;
  try {
    derived = await derivePortfolio(rows, yahooPriceProvider);
  } catch {
    return { ...base, state: "error" };
  }
  const { holdings, summary } = derived;

  // Chart (3M por defeito) + Day P&L em paralelo — algoritmo importado, não duplicado.
  const [chartData, dayPnlEur] = await Promise.all([
    buildPortfolioChart(rows, "3M").catch(() => [] as ChartPoint[]),
    computeDayPnlEur(holdings).catch(() => null),
  ]);

  // Movers — top 5 activas por |variação|, sparkline dos últimos 7 closes.
  const active = holdings.filter(
    (h) => h.status === "active" && h.currentPriceEur !== null
  );
  const enrichedMovers: MoverItem[] = await Promise.all(
    active.map(async (h) => {
      const history = await getHistory(h.ticker).catch(() => []);
      const sparkline = history.slice(-7).map((p) => p.close);
      return {
        ticker: h.ticker,
        name: h.name,
        price: h.currentPriceEur as number,
        changePercent: Math.round(h.unrealizedPct * 100) / 100,
        sparkline: sparkline.length >= 2 ? sparkline : undefined,
      };
    })
  );
  const movers = enrichedMovers
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5);

  return {
    state: "ok",
    hasPriceGaps: summary.hasPriceGaps,
    totalValue: summary.totalValueEur,
    deltaAbsolute: summary.unrealizedEur,
    deltaPercent: summary.unrealizedPct,
    kpis: buildKpis(
      summary.totalCostEur,
      summary.unrealizedEur,
      summary.openPositions,
      dayPnlEur
    ),
    chartData,
    movers,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const data = await getDashboardData();
  const isError = data.state === "error";

  return (
    <>
      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss"
        >
          Não foi possível carregar o teu portfólio agora (falha de dados ou de
          preços). Os valores não estão a ser mostrados para não te induzir em
          erro. Tenta novamente dentro de momentos.
        </div>
      )}

      {!isError && data.hasPriceGaps && (
        <div
          role="status"
          className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-muted-foreground"
        >
          Algumas posições estão sem preço live neste momento — o patrimônio
          apresentado pode estar incompleto.
        </div>
      )}

      {/* Hero — patrimônio + KPI grid. Em erro, totalValue=null (sem €0 falso). */}
      <HeroSection
        totalValue={isError ? null : data.totalValue}
        deltaPercent={isError ? null : data.deltaPercent}
        deltaAbsolute={isError ? null : data.deltaAbsolute}
        isLoading={false}
        kpiSlot={<KpiGrid items={data.kpis} isLoading={false} />}
      />

      {/* Portfolio evolution chart */}
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
