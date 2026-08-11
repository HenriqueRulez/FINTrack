// Testes unitários do resolver de símbolo Yahoo (BUG-7/FIN-15):
// src/lib/yahoo-finance/resolve-symbol.ts. As dependências externas (quote e
// search do Yahoo) são injectadas e mockadas — zero rede, zero banco.
// Correr com: npx playwright test -c playwright.unit.config.ts

import { expect, test } from "@playwright/test";
import {
  resolveYahooSymbolCore,
  resolveYahooSymbol,
  type ResolveDeps,
} from "../../src/lib/yahoo-finance/resolve-symbol";

// Constrói deps mockadas a partir de um mapa símbolo→preço (undefined = sem
// cotação) e de um mapa isin→candidatas do search. Regista as chamadas para
// asserção de comportamento (ex.: não chamar search quando o ticker resolve).
function makeDeps(opts: {
  prices?: Record<string, number | undefined>;
  search?: Record<string, Array<{ symbol?: string; quoteType?: string }>>;
}) {
  const quoteCalls: string[] = [];
  const searchCalls: string[] = [];
  const prices = opts.prices ?? {};
  const searchMap = opts.search ?? {};

  const deps: ResolveDeps = {
    quote: async (symbol) => {
      quoteCalls.push(symbol);
      const price = prices[symbol];
      return price === undefined ? null : { regularMarketPrice: price };
    },
    search: async (query) => {
      searchCalls.push(query);
      return { quotes: searchMap[query] ?? [] };
    },
  };

  return { deps, quoteCalls, searchCalls };
}

test.describe("resolveYahooSymbolCore (core puro)", () => {
  test("caso 1 — ticker já quotável: devolve o ticker e NÃO chama search", async () => {
    const { deps, quoteCalls, searchCalls } = makeDeps({
      prices: { AAPL: 231.5 },
    });

    const result = await resolveYahooSymbolCore(deps, "AAPL", "US0378331005");

    expect(result).toBe("AAPL");
    expect(quoteCalls).toEqual(["AAPL"]); // só o quote inicial
    expect(searchCalls).toEqual([]); // search nunca chamado (CA2)
  });

  test("caso 2 — ticker falha + isin resolve: devolve o símbolo da candidata quotável", async () => {
    const { deps, quoteCalls, searchCalls } = makeDeps({
      prices: { "CSSPX.MI": 724.36 }, // VWRA (ticker cru) não tem preço
      search: {
        IE00B5BMR087: [{ symbol: "CSSPX.MI", quoteType: "ETF" }],
      },
    });

    const result = await resolveYahooSymbolCore(deps, "VWRA", "IE00B5BMR087");

    expect(result).toBe("CSSPX.MI"); // CA1
    expect(searchCalls).toEqual(["IE00B5BMR087"]);
    // quote do ticker cru (falha) + quote da candidata (ok)
    expect(quoteCalls).toEqual(["VWRA", "CSSPX.MI"]);
  });

  test("caso 3a — sem isin: devolve o ticker original (fallback), sem search", async () => {
    const { deps, quoteCalls, searchCalls } = makeDeps({
      prices: {}, // ticker não resolve
    });

    const result = await resolveYahooSymbolCore(deps, "XYZ", null);

    expect(result).toBe("XYZ"); // CA3
    expect(searchCalls).toEqual([]);
    expect(quoteCalls).toEqual(["XYZ"]);
  });

  test("caso 3b — com isin mas sem candidata quotável: devolve o ticker original", async () => {
    const { deps, searchCalls } = makeDeps({
      prices: {}, // nem o ticker nem a candidata resolvem
      search: { IE00XXXX: [{ symbol: "FOO.DE" }] },
    });

    const result = await resolveYahooSymbolCore(deps, "BAR", "IE00XXXX");

    expect(result).toBe("BAR"); // CA3
    expect(searchCalls).toEqual(["IE00XXXX"]);
  });

  test("caso 4 — primeira candidata sem preço, segunda com preço: devolve a segunda", async () => {
    const { deps, quoteCalls } = makeDeps({
      prices: { "REAL.L": 55.1 }, // só a 2ª candidata tem preço
      search: {
        IE00BK5BQT80: [
          { symbol: "DEAD.XX" }, // sem preço
          { symbol: "REAL.L" }, // com preço
        ],
      },
    });

    const result = await resolveYahooSymbolCore(deps, "VWRA", "IE00BK5BQT80");

    expect(result).toBe("REAL.L");
    // ticker cru falha → search → 1ª candidata falha → 2ª candidata ok
    expect(quoteCalls).toEqual(["VWRA", "DEAD.XX", "REAL.L"]);
  });

  test("regressão — preço 0/NaN não conta como quotável", async () => {
    const { deps } = makeDeps({
      prices: { ZERO: 0, GOOD: 10 },
      search: { IE00Z: [{ symbol: "GOOD" }] },
    });

    // ZERO tem regularMarketPrice=0 → não quotável → cai ao search
    const result = await resolveYahooSymbolCore(deps, "ZERO", "IE00Z");
    expect(result).toBe("GOOD");
  });

  test("search a lançar excepção: fallback ao ticker original, sem rebentar", async () => {
    const deps: ResolveDeps = {
      quote: async () => null, // ticker não resolve
      search: async () => {
        throw new Error("did not validate with schema");
      },
    };

    const result = await resolveYahooSymbolCore(deps, "VWRA", "IE00B5BMR087");
    expect(result).toBe("VWRA");
  });
});

test.describe("resolveYahooSymbol (wrapper com cache)", () => {
  test("cache por ticker|isin: 2ª chamada não repete quote/search", async () => {
    const { deps, quoteCalls, searchCalls } = makeDeps({
      prices: { "CSSPX.MI": 724.36 },
      search: { IE00B5BMR087: [{ symbol: "CSSPX.MI" }] },
    });
    const cache = new Map<string, string>();

    const first = await resolveYahooSymbol("VWRA", "IE00B5BMR087", deps, cache);
    const second = await resolveYahooSymbol("VWRA", "IE00B5BMR087", deps, cache);

    expect(first).toBe("CSSPX.MI");
    expect(second).toBe("CSSPX.MI");
    // Só o 1º run bateu no Yahoo; o 2º veio do cache
    expect(searchCalls).toEqual(["IE00B5BMR087"]);
    expect(quoteCalls).toEqual(["VWRA", "CSSPX.MI"]);
  });
});
