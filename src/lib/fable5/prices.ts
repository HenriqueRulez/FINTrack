// Sandbox Fable 5 — cache de cotações persistente (f5_price_cache, Postgres):
// só tickers stale (fora da janela configurada) vão ao Yahoo, num ÚNICO
// request em lote (quote(string[]) — 1 round-trip para N tickers), com dedupe
// de pedidos concorrentes e stale-while-error.
// Server-only: NUNCA importar em Client Components.

import { f5Table, type F5PriceCacheRow } from "./types";

// Instância própria do yahoo-finance2 com suporte a batch — o client raiz
// (src/lib/yahoo-finance) faz 1 chamada HTTP por ticker e fica intocado.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as new (opts?: {
  suppressNotices?: string[];
}) => {
  quote: (symbols: string[]) => Promise<
    Array<{
      symbol?: string;
      regularMarketPrice?: number;
      currency?: string;
      longName?: string;
      shortName?: string;
    }>
  >;
};

const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

export interface F5Quote {
  ticker: string;
  price: number;
  currency: string;
  name: string | null;
  fetchedAt: string; // ISO
  isStale: boolean; // true = a servir valor antigo (Yahoo falhou ou força bloqueada)
}

interface FetchedQuote {
  price: number;
  currency: string;
  name: string;
  fetchedAt: number;
}

// Piso duro para force=true: nunca re-chamar o Yahoo para o mesmo ticker
// com menos de 60s — protege contra spam do botão "Atualizar".
const FORCE_FLOOR_MS = 60_000;

// Dedupe de pedidos concorrentes: duas requests simultâneas para o mesmo
// ticker partilham a mesma Promise em vez de duplicar chamadas externas.
const inFlight = new Map<string, Promise<FetchedQuote | null>>();

// Yahoo devolve acções de Londres em pence ("GBp") — normalizar para GBP.
function normalizeQuote(q: FetchedQuote): FetchedQuote {
  if (q.currency === "GBp") {
    return { ...q, price: q.price / 100, currency: "GBP" };
  }
  return q;
}

// Um único request ao Yahoo para N tickers. Símbolos inválidos simplesmente
// não vêm na resposta (ficam null); falha do batch inteiro → todos null e o
// stale-while-error serve o cache.
async function fetchQuotesBatch(
  tickers: string[]
): Promise<Map<string, FetchedQuote | null>> {
  const out = new Map<string, FetchedQuote | null>(
    tickers.map((t) => [t, null])
  );
  try {
    const results = await yahooFinance.quote(tickers);
    const now = Date.now();
    for (const q of results ?? []) {
      if (!q?.symbol || typeof q.regularMarketPrice !== "number") continue;
      out.set(
        q.symbol.toUpperCase(),
        normalizeQuote({
          price: q.regularMarketPrice,
          currency: q.currency ?? "USD",
          name: q.longName ?? q.shortName ?? q.symbol,
          fetchedAt: now,
        })
      );
    }
  } catch {
    // batch falhou — o caller serve cache stale
  }
  return out;
}

export async function getPricesFor(
  supabase: unknown,
  tickers: string[],
  opts: { staleMinutes: number; force?: boolean }
): Promise<Record<string, F5Quote | null>> {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))];
  if (unique.length === 0) return {};

  const { data: cachedRows } = (await f5Table(supabase, "f5_price_cache")
    .select("*")
    .in("ticker", unique)) as { data: F5PriceCacheRow[] | null };

  const cached = new Map((cachedRows ?? []).map((r) => [r.ticker, r]));
  const now = Date.now();
  const windowMs = opts.force ? FORCE_FLOOR_MS : opts.staleMinutes * 60_000;

  const staleTickers = unique.filter((t) => {
    const row = cached.get(t);
    if (!row) return true;
    return now - new Date(row.fetched_at).getTime() >= windowMs;
  });

  const fetched = new Map<string, FetchedQuote | null>();
  if (staleTickers.length > 0) {
    const toFetch = staleTickers.filter((t) => !inFlight.has(t));
    if (toFetch.length > 0) {
      const batch = fetchQuotesBatch(toFetch); // 1 request HTTP para N tickers
      for (const t of toFetch) {
        const promise = batch.then((m) => m.get(t) ?? null).catch(() => null);
        inFlight.set(t, promise);
        void promise.finally(() => inFlight.delete(t));
      }
    }
    const settled = await Promise.all(
      staleTickers.map(async (t) => ({ t, quote: await inFlight.get(t)! }))
    );
    for (const { t, quote } of settled) fetched.set(t, quote);

    const upserts = settled
      .filter(({ quote }) => quote !== null)
      .map(({ t, quote }) => ({
        ticker: t,
        price: quote!.price,
        currency: quote!.currency,
        name: quote!.name,
        fetched_at: new Date(quote!.fetchedAt).toISOString(),
      }));
    if (upserts.length > 0) {
      await f5Table(supabase, "f5_price_cache").upsert(upserts, {
        onConflict: "ticker",
      });
    }
  }

  const result: Record<string, F5Quote | null> = {};
  for (const t of unique) {
    const freshQuote = fetched.get(t);
    if (freshQuote) {
      result[t] = {
        ticker: t,
        price: freshQuote.price,
        currency: freshQuote.currency,
        name: freshQuote.name,
        fetchedAt: new Date(freshQuote.fetchedAt).toISOString(),
        isStale: false,
      };
      continue;
    }
    const row = cached.get(t);
    if (row) {
      // Dentro da janela = fresco; fora da janela mas Yahoo falhou = stale-while-error
      const isStale = now - new Date(row.fetched_at).getTime() >= windowMs;
      result[t] = {
        ticker: t,
        price: row.price,
        currency: row.currency,
        name: row.name,
        fetchedAt: row.fetched_at,
        isStale,
      };
      continue;
    }
    result[t] = null;
  }
  return result;
}
