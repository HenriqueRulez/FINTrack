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
};

const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

interface QuoteResult {
  price: number;
  currency: string;
  name: string;
  fetchedAt: number;
}

// 15-minute in-memory cache to avoid rate limiting from Yahoo Finance
const cache = new Map<string, QuoteResult>();
const CACHE_TTL_MS = 15 * 60 * 1000;

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
