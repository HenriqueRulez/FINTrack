// Orquestração de I/O do gráfico "Portfolio over time" (A-02): carrega a timeline
// do ledger, busca closes históricos no Yahoo, converte-os a EUR e delega a
// matemática diária pura ao buildChartSeries. Server-only (usa Yahoo).
// Partilhado pela rota /api/portfolio/chart e pela página do dashboard, para não
// duplicar o algoritmo nem as chamadas externas.

import {
  getHistoryRange,
  getQuotes,
  getFxToEur,
} from "@/lib/yahoo-finance/client";
import { buildTimeline } from "./ledger";
import { mapRowsToLedgerTx, type TransactionRow } from "./derive";
import { buildChartSeries, type ChartPoint } from "./chart-series";

const DAY_MS = 24 * 60 * 60 * 1000;

function toIso(ms: number): string {
  return new Date(ms).toISOString().split("T")[0];
}

// Início da janela do timeframe (YYYY-MM-DD, UTC) — null em ALL (sem limite).
export function tfStartDate(tf: string, today: Date): string | null {
  const t = today.getTime();
  switch (tf) {
    case "1D":
      return toIso(t - 1 * DAY_MS);
    case "1W":
      return toIso(t - 7 * DAY_MS);
    case "1M":
      return toIso(t - 30 * DAY_MS);
    case "3M":
      return toIso(t - 90 * DAY_MS);
    case "YTD":
      return `${today.getUTCFullYear()}-01-01`;
    case "1Y":
      return toIso(t - 365 * DAY_MS);
    case "ALL":
      return null;
    default:
      return toIso(t - 90 * DAY_MS);
  }
}

export async function buildPortfolioChart(
  rows: TransactionRow[],
  tf: string,
  today: Date = new Date()
): Promise<ChartPoint[]> {
  const txs = mapRowsToLedgerTx(rows);
  const timeline = buildTimeline(txs);
  if (timeline.length === 0) return [];

  // Janela: de max(1ª data de tx, início do tf) até hoje.
  const todayIso = toIso(today.getTime());
  const firstTxDate = timeline[0].date;
  const tfStart = tfStartDate(tf, today);
  const windowStart = tfStart && tfStart > firstTxDate ? tfStart : firstTxDate;

  // Tickers alguma vez detidos + moeda de cada um (via quote live).
  const tickers = [...new Set(txs.map((t) => t.ticker))];
  const quotes = await getQuotes(tickers);

  // Câmbios live deduplicados por moeda. NOTA: usa-se fx LIVE (não fx-por-data)
  // como simplificação deliberada da série — capturar fx histórico por dia/ticker
  // multiplicaria as chamadas Yahoo e o risco de ban. O custo (invested) já usa o
  // fx da data via o ledger; só a curva de valor de mercado usa fx live.
  const currencies = [
    ...new Set(
      Object.values(quotes)
        .filter((q): q is NonNullable<typeof q> => q !== null)
        .map((q) => q.currency.toUpperCase())
    ),
  ];
  const fxEntries = await Promise.all(
    currencies.map(async (cur) => [cur, await getFxToEur(cur)] as const)
  );
  const fxByCurrency = new Map(fxEntries);

  // Closes históricos por ticker, convertidos a EUR. Fetch recua 10 dias antes da
  // janela para dar semente ao carry-forward (feriados/fim-de-semana).
  const period1 = new Date(
    new Date(`${windowStart}T00:00:00Z`).getTime() - 10 * DAY_MS
  );
  const period2 = new Date(new Date(`${todayIso}T00:00:00Z`).getTime() + DAY_MS);

  const closesByTicker: Record<string, Record<string, number>> = {};
  await Promise.all(
    tickers.map(async (ticker) => {
      const q = quotes[ticker];
      if (!q) return; // sem quote → sem moeda → preço indisponível
      const fx = fxByCurrency.get(q.currency.toUpperCase());
      if (fx == null) return; // sem câmbio → não somar lixo
      const history = await getHistoryRange(ticker, period1, period2);
      const byDate: Record<string, number> = {};
      for (const point of history) {
        byDate[point.date] = point.close * fx;
      }
      closesByTicker[ticker] = byDate;
    })
  );

  return buildChartSeries({
    timeline,
    closesByTicker,
    startDate: windowStart,
    endDate: todayIso,
  });
}
