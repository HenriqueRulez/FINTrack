// yahoo-finance2 v3+ requires instantiation — calling the default export as a
// function causes "Call new YahooFinance() first" at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as new (opts?: {
  suppressNotices?: string[];
}) => {
  quote: (
    symbol: string,
    queryOptions?: Record<string, unknown>,
    moduleOptions?: { validateResult?: boolean }
  ) => Promise<{
    regularMarketPrice?: number;
    currency?: string;
    longName?: string;
    shortName?: string;
  }>;
  chart: (
    symbol: string,
    options: { period1: Date | string; period2?: Date | string; interval?: string }
  ) => Promise<{ quotes: Array<{ date: Date; close: number | null }> }>;
  search: (
    query: string,
    queryOptions?: { quotesCount?: number; newsCount?: number },
    moduleOptions?: { validateResult?: boolean }
  ) => Promise<{
    quotes: Array<{ symbol?: string; exchange?: string; quoteType?: string }>;
  }>;
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

// 1-hour in-memory cache for arbitrary-range historical data (chart A-02),
// keyed por ticker:period1:period2 — o passado é imutável dentro do TTL.
const historyRangeCache = new Map<string, HistoryCacheEntry>();

// 15-minute in-memory cache for FX rates (moeda→EUR)
const fxCache = new Map<string, { rate: number; fetchedAt: number }>();
const FX_CACHE_TTL_MS = 15 * 60 * 1000;

// --- Bound partilhado dos caches em memória (B-04/B-05/B-14) --------------
// Sem isto os Maps crescem sem limite à medida que aparecem novos tickers/
// datas. `pruneCache` remove entradas expiradas por TTL e, se ainda exceder
// o cap, remove as mais antigas (ordem de inserção do Map ≈ LRU por idade de
// escrita). Throttle por Map via WeakMap para não varrer a cada chamada.
const MAX_CACHE_ENTRIES = 1000;
const PURGE_INTERVAL_MS = 60_000;
const lastPurgeAt = new WeakMap<Map<string, unknown>, number>();

function pruneCache<V>(
  map: Map<string, V>,
  now: number,
  getFetchedAt: (v: V) => number | null,
  ttlMs: number
): void {
  const key = map as unknown as Map<string, unknown>;
  const last = lastPurgeAt.get(key) ?? 0;
  if (now - last < PURGE_INTERVAL_MS && map.size <= MAX_CACHE_ENTRIES) return;
  lastPurgeAt.set(key, now);

  // Remove expiradas por TTL (só quando a entrada tem fetchedAt).
  for (const [k, value] of map) {
    const fetchedAt = getFetchedAt(value);
    if (fetchedAt !== null && now - fetchedAt >= ttlMs) map.delete(k);
  }

  // Cap de tamanho: remove as entradas mais antigas até voltar ao cap.
  if (map.size > MAX_CACHE_ENTRIES) {
    const excess = map.size - MAX_CACHE_ENTRIES;
    let i = 0;
    for (const k of map.keys()) {
      if (i++ >= excess) break;
      map.delete(k);
    }
  }
}

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

    pruneCache(fxCache, Date.now(), (v) => v.fetchedAt, FX_CACHE_TTL_MS);
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

    // fxHistoryCache é imutável por (moeda,data) → só cap de tamanho, sem TTL.
    pruneCache(fxHistoryCache, Date.now(), () => null, 0);
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

    pruneCache(cache, Date.now(), (v) => v.fetchedAt, CACHE_TTL_MS);
    cache.set(ticker, result);
    return result;
  } catch {
    return null;
  }
}

// --- Primitivas cruas para o resolver de símbolo (resolve-symbol.ts) --------
// O resolver precisa de bater no Yahoo SEM o cache de quotes acima (que é por
// ticker e assume símbolo já quotável) e com `validateResult:false` — sem ele
// o yahoo-finance2 lança "did not validate with schema" em ETFs
// (quoteType ETF != const EQUITY). Estas primitivas são server-only, iguais ao
// resto do módulo.

// Quote cru de um símbolo com validação de schema desligada. Devolve null se a
// chamada falhar (símbolo inexistente, rede) — o resolver decide o fallback.
export async function yahooQuoteRaw(
  symbol: string
): Promise<{ regularMarketPrice?: number } | null> {
  try {
    return await yahooFinance.quote(symbol, {}, { validateResult: false });
  } catch {
    return null;
  }
}

// Search cru do Yahoo (resolve símbolo quotável a partir de um ISIN). Repassa
// as opções ao pacote; `validateResult:false` é responsabilidade do chamador.
export async function yahooSearch(
  query: string,
  queryOptions?: { quotesCount?: number; newsCount?: number },
  moduleOptions?: { validateResult?: boolean }
): Promise<{
  quotes: Array<{ symbol?: string; exchange?: string; quoteType?: string }>;
}> {
  return yahooFinance.search(query, queryOptions, moduleOptions);
}

export async function getQuotes(
  tickers: string[]
): Promise<Record<string, QuoteResult | null>> {
  const results = await Promise.all(
    tickers.map(async (ticker) => ({ ticker, quote: await getQuote(ticker) }))
  );

  return Object.fromEntries(results.map(({ ticker, quote }) => [ticker, quote]));
}

// Histórico de closes num intervalo arbitrário [period1, period2] (interval 1d).
// Usado pelo gráfico "Portfolio over time" (A-02) — o getHistory fixo de 30 dias
// é insuficiente para timeframes 3M/1Y/ALL. Usa chart() directamente porque
// historical() está deprecado no yahoo-finance2 v3 (mesmo padrão de getFxOnDate).
// Cache de 1h keyed por ticker:period1:period2. Devolve [] em erro.
export async function getHistoryRange(
  ticker: string,
  period1: Date,
  period2?: Date
): Promise<HistoryPoint[]> {
  const key = `${ticker}:${period1.getTime()}:${period2 ? period2.getTime() : ""}`;
  const cached = historyRangeCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < HISTORY_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const { quotes } = await yahooFinance.chart(ticker, {
      period1,
      period2,
      interval: "1d",
    });

    const data: HistoryPoint[] = quotes
      .filter((q) => q.close != null && !Number.isNaN(q.close))
      .map((q) => ({
        date: q.date.toISOString().split("T")[0],
        close: q.close as number,
      }));

    pruneCache(historyRangeCache, Date.now(), (v) => v.fetchedAt, HISTORY_CACHE_TTL_MS);
    historyRangeCache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    console.error(
      `[yahoo-finance] getHistoryRange error for ${ticker}:`,
      err instanceof Error ? err.message : String(err)
    );
    pruneCache(historyRangeCache, Date.now(), (v) => v.fetchedAt, HISTORY_CACHE_TTL_MS);
    historyRangeCache.set(key, { data: [], fetchedAt: Date.now() });
    return [];
  }
}

export async function getHistory(ticker: string): Promise<HistoryPoint[]> {
  const cached = historyCache.get(ticker);
  if (cached && Date.now() - cached.fetchedAt < HISTORY_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const period1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const period2 = new Date();
    const { quotes } = await yahooFinance.chart(ticker, {
      period1,
      period2,
      interval: "1d",
    });

    const data: HistoryPoint[] = quotes
      .filter((q) => q.close != null && !Number.isNaN(q.close))
      .map((q) => ({
        date: q.date.toISOString().split("T")[0],
        close: q.close as number,
      }));

    pruneCache(historyCache, Date.now(), (v) => v.fetchedAt, HISTORY_CACHE_TTL_MS);
    historyCache.set(ticker, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    console.error(
      `[yahoo-finance] getHistory error for ${ticker}:`,
      err instanceof Error ? err.message : String(err)
    );
    // Cache empty result to avoid re-fetching on repeated failures within TTL
    pruneCache(historyCache, Date.now(), (v) => v.fetchedAt, HISTORY_CACHE_TTL_MS);
    historyCache.set(ticker, { data: [], fetchedAt: Date.now() });
    return [];
  }
}
