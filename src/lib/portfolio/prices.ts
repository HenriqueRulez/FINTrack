// PriceProvider real (server-only) para a camada de derivação (./derive.ts):
// resolve preço live + nome + câmbio moeda→EUR de cada ticker via Yahoo Finance.
// Isolado de derive.ts para manter a derivação pura e testável sem rede.
//
// Camada de cache PERSISTENTE (M-03): antes de bater no Yahoo, lê price_cache
// (tabela partilhada por todos os utilizadores, dados de mercado públicos). Só
// os tickers em falta ou stale vão ao getQuotes; as quotes frescas são
// persistidas por upsert. Sobrevive a restart/cold-start (o cache em memória de
// client.ts morre a cada reinício) e é partilhada entre instâncias — reduz
// billing/risco de ban do Yahoo (objectivo declarado do projecto).
//
// Câmbios são deduplicados por moeda: N tickers em USD partilham uma só chamada
// USDEUR=X. O câmbio NÃO entra em price_cache (é por-moeda, não por-ticker);
// getFxToEur mantém o seu cache próprio em memória, dedupido por moeda.

import { getQuotes, getFxToEur } from "@/lib/yahoo-finance/client";
import { createClient } from "@/lib/supabase/server";
import type { LivePrice, PriceProvider } from "./derive";

// TTL alinhado com o cache de quotes em memória do client Yahoo
// (src/lib/yahoo-finance/client.ts: CACHE_TTL_MS = 15 min). Não inventar novo.
const PRICE_CACHE_TTL_MS = 15 * 60 * 1000;

// Quote sem câmbio — o que persiste em price_cache (fx fica fora, é por-moeda).
interface CachedQuote {
  price: number;
  currency: string;
  name: string;
}

export const yahooPriceProvider: PriceProvider = async (tickers) => {
  if (tickers.length === 0) return {};

  const now = Date.now();
  const quotes: Record<string, CachedQuote | null> = {};

  // 1. Ler price_cache para servir quotes frescas sem tocar no Yahoo. Falha de
  //    DB não rebenta o fluxo (B-06/B-14): cai para o caminho Yahoo directo e o
  //    upsert fica desligado (supabase = null). O cache é optimização, não fonte
  //    de verdade.
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
    const { data, error } = await supabase
      .from("price_cache")
      .select("ticker, price, currency, name, fetched_at")
      .in("ticker", tickers);
    if (error) throw error;
    // Anotação de tipo em vez de cast: o read do ssr infere `never[]` (ver
    // FIN-7/TD-6, incompat. @supabase/ssr@0.6.1 × supabase-js@2.112.1), e `never[]`
    // é atribuível a este tipo — mesmo padrão dos reads em api/portfolio/*.
    const rows: Array<CachedQuote & { ticker: string; fetched_at: string }> =
      data ?? [];
    for (const row of rows) {
      if (now - new Date(row.fetched_at).getTime() < PRICE_CACHE_TTL_MS) {
        quotes[row.ticker] = {
          price: row.price,
          currency: row.currency,
          name: row.name,
        };
      }
    }
  } catch (err) {
    console.error(
      "[prices] price_cache read failed:",
      err instanceof Error ? err.message : String(err)
    );
    supabase = null;
  }

  // 2. Só os tickers em falta ou stale vão ao Yahoo.
  const missing = tickers.filter((t) => !(t in quotes));
  if (missing.length > 0) {
    const fresh = await getQuotes(missing);
    const fetchedAt = new Date(now).toISOString();
    const toUpsert: Array<{
      ticker: string;
      price: number;
      currency: string;
      name: string;
      fetched_at: string;
    }> = [];

    for (const ticker of missing) {
      const q = fresh[ticker];
      if (q) {
        quotes[ticker] = { price: q.price, currency: q.currency, name: q.name };
        toUpsert.push({
          ticker,
          price: q.price,
          currency: q.currency,
          name: q.name,
          fetched_at: fetchedAt,
        });
      } else {
        quotes[ticker] = null;
      }
    }

    // 3. Persistir as quotes frescas (best-effort; falha não rebenta o fluxo).
    if (supabase && toUpsert.length > 0) {
      try {
        const { error } = await supabase
          .from("price_cache")
          .upsert(toUpsert, { onConflict: "ticker" });
        if (error) throw error;
      } catch (err) {
        console.error(
          "[prices] price_cache upsert failed:",
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  // 4. Câmbio por moeda (dedupido) — inalterado, cache em memória por moeda.
  const currencies = [
    ...new Set(
      Object.values(quotes)
        .filter((q): q is CachedQuote => q !== null)
        .map((q) => q.currency.toUpperCase())
    ),
  ];
  const fxEntries = await Promise.all(
    currencies.map(async (cur) => [cur, await getFxToEur(cur)] as const)
  );
  const fxByCurrency = new Map(fxEntries);

  const result: Record<string, LivePrice | null> = {};
  for (const ticker of tickers) {
    const q = quotes[ticker];
    if (!q) {
      result[ticker] = null;
      continue;
    }
    const cur = q.currency.toUpperCase();
    const fxToEur = fxByCurrency.get(cur) ?? null;
    // Sem câmbio não há valor fiável em EUR — trata como preço indisponível.
    result[ticker] =
      fxToEur === null
        ? null
        : { price: q.price, currency: cur, name: q.name, fxToEur };
  }
  return result;
};
