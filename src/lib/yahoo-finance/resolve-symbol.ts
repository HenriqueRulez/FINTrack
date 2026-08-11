// Resolver de símbolo Yahoo por ISIN (server-only, BUG-7/FIN-15).
//
// O import do Trading212 grava o ticker cru da coluna "Ticker" só com
// .toUpperCase() (trading212.ts). Instrumentos europeus (LSE/Xetra/Euronext)
// não são símbolos Yahoo — o Yahoo precisa do sufixo de bolsa (.L/.DE/.AS/.MI…),
// por isso o getQuote falha e a posição fica "Preço indisponível". Este módulo
// resolve o símbolo quotável correcto a partir do ISIN da linha.
//
// Testável por injecção de dependências (mesmo padrão do PriceProvider em
// derive.ts): o CORE puro recebe `quote`/`search` injectados — zero rede nos
// testes; o WRAPPER `resolveYahooSymbol` liga-os à instância real do client.ts
// e adiciona cache em memória por `ticker|isin` para não repetir search no mesmo
// run. NUNCA importar em Client Components (bate no Yahoo).

import { yahooQuoteRaw, yahooSearch } from "./client";

// Dependências injectadas. `quote` deve usar validateResult:false (ETFs falham
// a validação de schema por defeito) — a primitiva yahooQuoteRaw já o faz.
export interface ResolveDeps {
  quote: (symbol: string) => Promise<{ regularMarketPrice?: number } | null>;
  search: (
    query: string,
    queryOptions?: { quotesCount?: number; newsCount?: number },
    moduleOptions?: { validateResult?: boolean }
  ) => Promise<{
    quotes: Array<{ symbol?: string; exchange?: string; quoteType?: string }>;
  }>;
}

// Um símbolo "resolve" se a quote traz um regularMarketPrice numérico > 0.
async function isQuotable(
  quote: ResolveDeps["quote"],
  symbol: string
): Promise<boolean> {
  try {
    const q = await quote(symbol);
    return (
      !!q &&
      typeof q.regularMarketPrice === "number" &&
      Number.isFinite(q.regularMarketPrice) &&
      q.regularMarketPrice > 0
    );
  } catch {
    return false;
  }
}

// Core puro (testável): resolve o símbolo Yahoo quotável para (ticker, isin).
//   a. ticker já quotável              → devolve o ticker inalterado (sem search)
//   b. ticker falha e há isin          → search(isin) e devolve a PRIMEIRA
//                                        candidata cujo quote traz preço
//   c. sem isin / sem candidata válida → devolve o ticker original (fallback;
//                                        a posição fica com aviso, o import NÃO
//                                        rebenta)
export async function resolveYahooSymbolCore(
  deps: ResolveDeps,
  ticker: string,
  isin: string | null
): Promise<string> {
  // a. O ticker cru já resolve? (tickers US coincidem com o símbolo Yahoo.)
  if (await isQuotable(deps.quote, ticker)) return ticker;

  // b. Sem ISIN não há por onde resolver → fallback.
  if (!isin) return ticker;

  let quotes: Array<{ symbol?: string }> = [];
  try {
    const res = await deps.search(
      isin,
      { quotesCount: 8, newsCount: 0 },
      { validateResult: false }
    );
    quotes = res?.quotes ?? [];
  } catch {
    return ticker; // search falhou → fallback
  }

  const seen = new Set<string>();
  for (const cand of quotes) {
    const symbol = cand.symbol;
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    if (await isQuotable(deps.quote, symbol)) return symbol;
  }

  // c. Nenhuma candidata quotável → fallback ao ticker original.
  return ticker;
}

const realDeps: ResolveDeps = { quote: yahooQuoteRaw, search: yahooSearch };

// Cache em memória por `ticker|isin` — evita repetir search para o mesmo
// instrumento dentro do mesmo run (ex.: várias linhas do mesmo ticker no CSV).
const resolveCache = new Map<string, string>();

// Wrapper que usa a instância real do client.ts. `deps`/`cache` são injectáveis
// para teste, mas o uso normal é `resolveYahooSymbol(ticker, isin)`.
export async function resolveYahooSymbol(
  ticker: string,
  isin: string | null,
  deps: ResolveDeps = realDeps,
  cache: Map<string, string> = resolveCache
): Promise<string> {
  const key = `${ticker}|${isin ?? ""}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const resolved = await resolveYahooSymbolCore(deps, ticker, isin);
  cache.set(key, resolved);
  return resolved;
}
