// Sandbox Fable 5 — histórico diário de preços (Yahoo Finance).
// Instância própria do yahoo-finance2 (o client raiz src/lib/yahoo-finance
// fica intocado e só dá 30 dias fixos; aqui o period1 é dinâmico — desde a
// primeira transacção). Cache em memória 1h por ticker; mudar de timeframe
// no gráfico não re-chama o Yahoo (slicing é feito sobre a série completa).
// Server-only: NUNCA importar em Client Components.

// NOTA: usa chart() — o historical() do yahoo-finance2 v3 está quebrado
// (o shim de compatibilidade gera um period2 inválido; verificado 2026-06-11).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as new (opts?: {
  suppressNotices?: string[];
}) => {
  chart: (
    symbol: string,
    options: { period1: Date | string; interval?: string }
  ) => Promise<{
    meta?: { currency?: string };
    quotes?: Array<{ date: Date; close: number | null; [key: string]: unknown }>;
  }>;
};

const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

export interface F5HistoryPoint {
  date: string; // YYYY-MM-DD
  close: number;
}

interface HistoryCacheEntry {
  period1Ms: number; // início coberto pela série em cache
  data: F5HistoryPoint[];
  fetchedAt: number;
}

const cache = new Map<string, HistoryCacheEntry>();
const TTL_MS = 60 * 60 * 1000; // 1 hora

// Dedupe de pedidos concorrentes por ticker (mesmo padrão de prices.ts).
const inFlight = new Map<string, Promise<F5HistoryPoint[]>>();

async function fetchHistory(
  ticker: string,
  period1: Date
): Promise<F5HistoryPoint[]> {
  try {
    const result = await yahooFinance.chart(ticker, {
      period1,
      interval: "1d",
    });
    // Acções de Londres cotam em pence ("GBp") — normalizar para GBP,
    // consistente com normalizeQuote() em prices.ts (senão o chart
    // multiplicaria o valor da posição por 100).
    const scale = result.meta?.currency === "GBp" ? 1 / 100 : 1;
    const points: F5HistoryPoint[] = [];
    const seen = new Set<string>();
    for (const q of result.quotes ?? []) {
      if (typeof q.close !== "number" || isNaN(q.close)) continue;
      const date = q.date.toISOString().split("T")[0];
      if (seen.has(date)) continue; // chart() pode incluir o quote intradiário do próprio dia
      seen.add(date);
      points.push({ date, close: q.close * scale });
    }
    return points;
  } catch {
    return [];
  }
}

export async function getF5History(
  ticker: string,
  period1: Date
): Promise<F5HistoryPoint[]> {
  const key = ticker.toUpperCase();
  const cached = cache.get(key);
  if (
    cached &&
    Date.now() - cached.fetchedAt < TTL_MS &&
    cached.period1Ms <= period1.getTime()
  ) {
    return cached.data;
  }

  const flightKey = `${key}:${period1.getTime()}`;
  let promise = inFlight.get(flightKey);
  if (!promise) {
    promise = fetchHistory(key, period1).then((data) => {
      // cachear também séries vazias — evita martelar o Yahoo em falha
      cache.set(key, { period1Ms: period1.getTime(), data, fetchedAt: Date.now() });
      return data;
    });
    inFlight.set(flightKey, promise);
    void promise.finally(() => inFlight.delete(flightKey));
  }
  return promise;
}

// Taxa de câmbio numa data específica (close do par "XXXYYY=X" nessa data,
// com carry-forward para fins-de-semana/feriados). null se indisponível —
// o caller decide o fallback (ex.: taxa actual do cache de preços).
export async function getFxOnDate(
  pair: string,
  date: string
): Promise<number | null> {
  const period1 = new Date(new Date(date + "T00:00:00Z").getTime() - 10 * 24 * 60 * 60 * 1000);
  const history = await getF5History(pair, period1);
  let last: number | null = null;
  for (const p of history) {
    if (p.date > date) break;
    last = p.close;
  }
  return last;
}
