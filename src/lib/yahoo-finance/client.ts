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
