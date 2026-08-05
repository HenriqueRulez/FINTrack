// yahoo-finance2 v3+ requires instantiation — calling the default export as a
// function causes "Call new YahooFinance() first" at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as new (opts?: {
  suppressNotices?: string[];
}) => {
  quote: (
    symbol: string
  ) => Promise<{
    regularMarketPrice?: number;
    currency?: string;
    longName?: string;
    shortName?: string;
  }>;
  historical: (
    symbol: string,
    options: { period1: Date | string; interval?: string }
  ) => Promise<Array<{ date: Date; close: number; [key: string]: unknown }>>;
  chart: (
    symbol: string,
    options: { period1: Date | string; period2?: Date | string; interval?: string }
  ) => Promise<{ quotes: Array<{ date: Date; close: number | null }> }>;
};

const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

export interface HistoryPoint {
  date: string; // ISO string — ex: "2025-04-23"
  close: number;
}

interface QuoteResult {
  price: number;
  currency: string;
  name: string;
  fetchedAt: number;
}

interface HistoryCacheEntry {
  data: HistoryPoint[];
  fetchedAt: number;
}

// 15-minute in-memory cache to avoid rate limiting from Yahoo Finance
const cache = new Map<string, QuoteResult>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// 1-hour in-memory cache for historical data (sparklines)
const historyCache = new Map<string, HistoryCacheEntry>();
const HISTORY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// 15-minute in-memory cache for FX rates (moeda→EUR)
const fxCache = new Map<string, { rate: number; fetchedAt: number }>();
const FX_CACHE_TTL_MS = 15 * 60 * 1000;

// Câmbio LIVE de 1 unidade de `currency` em EUR (par Yahoo `<CUR>EUR=X`).
// EUR→1. Usado para converter valor de mercado (preço live em moeda nativa)
// para a moeda base EUR — achado F-01. Devolve null se o par não existir.
export async function getFxToEur(currency: string): Promise<number | null> {
  const cur = currency.toUpperCase();
  if (cur === "EUR") return 1;

  const cached = fxCache.get(cur);
  if (cached && Date.now() - cached.fetchedAt < FX_CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const quote = await yahooFinance.quote(`${cur}EUR=X`);
    if (!quote.regularMarketPrice) return null;

    fxCache.set(cur, { rate: quote.regularMarketPrice, fetchedAt: Date.now() });
    return quote.regularMarketPrice;
  } catch {
    return null;
  }
}

// Cache imutável de câmbios históricos por (moeda, data) — o passado não muda.
const fxHistoryCache = new Map<string, number | null>();

// Câmbio HISTÓRICO de 1 unidade de `currency` em EUR à data `date` (YYYY-MM-DD).
// Usado na CRIAÇÃO de transações para capturar o fx_to_eur da data do trade
// (F-01) — uma compra antiga usou o câmbio DESSE dia, não o de hoje. Faz
// carry-forward do último close conhecido <= date (apanha fins-de-semana/
// feriados sem candle). EUR→1. Devolve null se indisponível.
// Usa chart() directamente (historical() está deprecado no yahoo-finance2 v3).
export async function getFxOnDate(
  currency: string,
  date: string
): Promise<number | null> {
  const cur = currency.toUpperCase();
  if (cur === "EUR") return 1;

  const key = `${cur}:${date}`;
  const cached = fxHistoryCache.get(key);
  if (cached !== undefined) return cached;

  try {
    // Fim do dia-alvo em UTC — inclui o candle desse dia; a janela recua 10 dias
    // para garantir um close anterior em caso de feriado/fim-de-semana.
    const target = new Date(`${date}T23:59:59Z`).getTime();
    const period1 = new Date(target - 10 * 24 * 60 * 60 * 1000);
    const period2 = new Date(target + 2 * 24 * 60 * 60 * 1000);

    const { quotes } = await yahooFinance.chart(`${cur}EUR=X`, {
      period1,
      period2,
      interval: "1d",
    });

    // Último close válido com data <= fim do dia-alvo (carry-forward).
    let rate: number | null = null;
    for (const q of quotes) {
      if (q.close == null || Number.isNaN(q.close)) continue;
      if (q.date.getTime() <= target) rate = q.close;
    }

    fxHistoryCache.set(key, rate);
    return rate;
  } catch {
    return null;
  }
}

export async function getQuote(ticker: string): Promise<QuoteResult | null> {
  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    // No fields filter — avoids the restrictive generic overload that infers 'never'
    const quote = await yahooFinance.quote(ticker);

    if (!quote.regularMarketPrice) return null;

    const result: QuoteResult = {
      price: quote.regularMarketPrice,
      currency: quote.currency ?? "USD",
      name: quote.longName ?? quote.shortName ?? ticker,
      fetchedAt: Date.now(),
    };

    cache.set(ticker, result);
    return result;
  } catch {
    return null;
  }
}

export async function getQuotes(
  tickers: string[]
): Promise<Record<string, QuoteResult | null>> {
  const results = await Promise.all(
    tickers.map(async (ticker) => ({ ticker, quote: await getQuote(ticker) }))
  );

  return Object.fromEntries(results.map(({ ticker, quote }) => [ticker, quote]));
}

export async function getHistory(ticker: string): Promise<HistoryPoint[]> {
  const cached = historyCache.get(ticker);
  if (cached && Date.now() - cached.fetchedAt < HISTORY_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const raw = await yahooFinance.historical(ticker, { period1, interval: "1d" });

    const data: HistoryPoint[] = raw
      .filter((item) => typeof item.close === "number" && !isNaN(item.close))
      .map((item) => ({
        date: item.date.toISOString().split("T")[0],
        close: item.close,
      }));

    historyCache.set(ticker, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    console.error(`[yahoo-finance] getHistory error for ${ticker}:`, err);
    // Cache empty result to avoid re-fetching on repeated failures within TTL
    historyCache.set(ticker, { data: [], fetchedAt: Date.now() });
    return [];
  }
}
