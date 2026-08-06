// Testes unitários da camada de cache persistente do M-03 em
// src/lib/portfolio/prices.ts (yahooPriceProvider): SELECT/upsert em price_cache
// + fallback ao Yahoo. Prova comportamental do M-03 — o QA não conseguiu
// exercitar este caminho no browser (ledger da conta de teste vazio).
//
// Mock: as duas dependências externas de prices.ts ("@/lib/yahoo-finance/client"
// e "@/lib/supabase/server") são interceptadas por um hook em Module._load
// instalado pelo import de "./_prices-mock-setup", que TEM de vir ANTES do
// import de prices (ordem de imports preservada; ver comentário no setup).
// Correr com: npx playwright test -c playwright.unit.config.ts

import { db, resetMocks, yahoo, freshTs, staleTs } from "./_prices-mock-setup";
import { yahooPriceProvider } from "../../src/lib/portfolio/prices";
import { expect, test } from "@playwright/test";

const SELECT_COLS = "ticker, price, currency, name, fetched_at";

test.beforeEach(() => {
  resetMocks();
});

test.describe("yahooPriceProvider — cache persistente (M-03)", () => {
  test("cache-hit dentro do TTL: não bate no Yahoo; usa valores cacheados; fx é resolvido", async () => {
    db.selectRows = [
      {
        ticker: "AAPL",
        price: 150,
        currency: "USD",
        name: "Apple Inc.",
        fetched_at: freshTs(),
      },
    ];
    yahoo.fx = { USD: 0.9 };

    const result = await yahooPriceProvider(["AAPL"]);

    // getQuotes NÃO chamado — a quote veio do price_cache
    expect(yahoo.getQuotesCalls).toEqual([]);
    // SELECT feito com as colunas e tickers exactos
    expect(db.selectCalls).toEqual([{ cols: SELECT_COLS, tickers: ["AAPL"] }]);
    // Nada a persistir → sem upsert
    expect(db.upsertCalls).toEqual([]);
    // fx resolvido para converter (não está na tabela)
    expect(yahoo.getFxCalls).toEqual(["USD"]);
    expect(result.AAPL).toEqual({
      price: 150,
      currency: "USD",
      name: "Apple Inc.",
      fxToEur: 0.9,
    });
  });

  test("cache-miss/stale: só os em falta vão ao Yahoo e são persistidos por upsert", async () => {
    // AAPL stale (fora do TTL), MSFT ausente da tabela → ambos "missing"
    db.selectRows = [
      {
        ticker: "AAPL",
        price: 1,
        currency: "USD",
        name: "stale",
        fetched_at: staleTs(),
      },
    ];
    yahoo.quotes = {
      AAPL: { price: 150, currency: "USD", name: "Apple Inc." },
      MSFT: { price: 300, currency: "USD", name: "Microsoft Corp." },
    };
    yahoo.fx = { USD: 0.9 };

    const result = await yahooPriceProvider(["AAPL", "MSFT"]);

    // Yahoo chamado uma vez, exactamente para os dois missing
    expect(yahoo.getQuotesCalls).toEqual([["AAPL", "MSFT"]]);
    // Valores frescos (não os stale) no resultado
    expect(result.AAPL).toEqual({
      price: 150,
      currency: "USD",
      name: "Apple Inc.",
      fxToEur: 0.9,
    });
    expect(result.MSFT).toEqual({
      price: 300,
      currency: "USD",
      name: "Microsoft Corp.",
      fxToEur: 0.9,
    });
    // upsert com onConflict "ticker" e as duas linhas frescas
    expect(db.upsertCalls).toHaveLength(1);
    expect(db.upsertCalls[0].opts).toEqual({ onConflict: "ticker" });
    const rows = db.upsertCalls[0].rows as Array<{
      ticker: string;
      price: number;
      currency: string;
      name: string;
      fetched_at: string;
    }>;
    expect(rows.map((r) => r.ticker).sort()).toEqual(["AAPL", "MSFT"]);
    for (const r of rows) {
      expect(typeof r.fetched_at).toBe("string");
      expect(Number.isNaN(Date.parse(r.fetched_at))).toBe(false);
    }
  });

  test("mix hit+stale: só o stale vai ao Yahoo; o hit vem do cache", async () => {
    db.selectRows = [
      {
        ticker: "AAPL",
        price: 150,
        currency: "USD",
        name: "Apple Inc.",
        fetched_at: freshTs(), // hit
      },
      {
        ticker: "MSFT",
        price: 1,
        currency: "USD",
        name: "stale",
        fetched_at: staleTs(), // stale
      },
    ];
    yahoo.quotes = {
      MSFT: { price: 300, currency: "USD", name: "Microsoft Corp." },
    };
    yahoo.fx = { USD: 0.9 };

    const result = await yahooPriceProvider(["AAPL", "MSFT"]);

    // Só MSFT foi ao Yahoo
    expect(yahoo.getQuotesCalls).toEqual([["MSFT"]]);
    // AAPL do cache, MSFT do Yahoo
    expect(result.AAPL?.price).toBe(150);
    expect(result.AAPL?.name).toBe("Apple Inc.");
    expect(result.MSFT?.price).toBe(300);
    expect(result.MSFT?.name).toBe("Microsoft Corp.");
    // upsert só do stale reobtido
    expect(db.upsertCalls).toHaveLength(1);
    const rows = db.upsertCalls[0].rows as Array<{ ticker: string }>;
    expect(rows.map((r) => r.ticker)).toEqual(["MSFT"]);
  });

  test("falha de leitura da DB: cai ao Yahoo para todos, não rebenta, upsert desligado", async () => {
    db.selectReject = true;
    yahoo.quotes = {
      AAPL: { price: 150, currency: "USD", name: "Apple Inc." },
    };
    yahoo.fx = { USD: 0.9 };

    const result = await yahooPriceProvider(["AAPL"]);

    // Tentou ler (e falhou), foi ao Yahoo direto
    expect(db.selectCalls).toHaveLength(1);
    expect(yahoo.getQuotesCalls).toEqual([["AAPL"]]);
    expect(result.AAPL?.price).toBe(150);
    // supabase = null → upsert NÃO é tentado
    expect(db.upsertCalls).toEqual([]);
  });

  test("falha de upsert: resultado correcto do Yahoo é devolvido na mesma, não rebenta", async () => {
    db.selectRows = []; // AAPL ausente → missing
    db.upsertReject = true;
    yahoo.quotes = {
      AAPL: { price: 150, currency: "USD", name: "Apple Inc." },
    };
    yahoo.fx = { USD: 0.9 };

    const result = await yahooPriceProvider(["AAPL"]);

    // upsert foi tentado (e falhou) mas o resultado é o do Yahoo
    expect(db.upsertCalls).toHaveLength(1);
    expect(result.AAPL).toEqual({
      price: 150,
      currency: "USD",
      name: "Apple Inc.",
      fxToEur: 0.9,
    });
  });

  test("tickers vazio: devolve {} sem tocar em DB nem Yahoo", async () => {
    const result = await yahooPriceProvider([]);

    expect(result).toEqual({});
    expect(db.selectCalls).toEqual([]);
    expect(yahoo.getQuotesCalls).toEqual([]);
    expect(yahoo.getFxCalls).toEqual([]);
    expect(db.upsertCalls).toEqual([]);
  });

  test("Yahoo devolve null (sem cotação): LivePrice = null; nada a persistir", async () => {
    db.selectRows = [];
    yahoo.quotes = { XYZ: null };

    const result = await yahooPriceProvider(["XYZ"]);

    expect(yahoo.getQuotesCalls).toEqual([["XYZ"]]);
    expect(result.XYZ).toBeNull();
    // q null → não entra no toUpsert
    expect(db.upsertCalls).toEqual([]);
  });

  test("sem fx (câmbio indisponível): LivePrice = null, mas a quote é cacheada na mesma", async () => {
    db.selectRows = [];
    yahoo.quotes = {
      AAPL: { price: 150, currency: "GBP", name: "Apple Inc." },
    };
    yahoo.fx = {}; // getFxToEur("GBP") → null

    const result = await yahooPriceProvider(["AAPL"]);

    expect(yahoo.getFxCalls).toEqual(["GBP"]);
    expect(result.AAPL).toBeNull();
    // a quote foi persistida (o cache guarda a cotação; o fx é por-moeda, à parte)
    expect(db.upsertCalls).toHaveLength(1);
    const rows = db.upsertCalls[0].rows as Array<{ ticker: string }>;
    expect(rows.map((r) => r.ticker)).toEqual(["AAPL"]);
  });

  test("cache-hit sem fx: o cache não quebra o comportamento de null", async () => {
    db.selectRows = [
      {
        ticker: "AAPL",
        price: 150,
        currency: "GBP",
        name: "Apple Inc.",
        fetched_at: freshTs(),
      },
    ];
    yahoo.fx = {}; // GBP→null

    const result = await yahooPriceProvider(["AAPL"]);

    expect(yahoo.getQuotesCalls).toEqual([]); // veio do cache
    expect(result.AAPL).toBeNull(); // sem fx → indisponível, como no caminho Yahoo
  });
});
