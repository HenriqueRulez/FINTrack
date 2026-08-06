// Mocks das duas dependências externas de src/lib/portfolio/prices.ts, para
// exercitar a camada de cache persistente do M-03 (SELECT/upsert em price_cache
// + fallback ao Yahoo) sem rede nem banco.
//
// PORQUÊ um ficheiro separado importado ANTES de prices: os `import` do spec são
// hoisted, mas a ORDEM entre statements de import é preservada. Ao importar este
// módulo primeiro, o hook em Module._load fica instalado antes de o require de
// prices.ts resolver "@/lib/yahoo-finance/client" e "@/lib/supabase/server".
// Confirmado empiricamente que o harness (Playwright 1.60, projecto CJS)
// transpila os imports estáticos para require e que Module._load vê a STRING do
// alias original ("@/lib/..."). Ver prices.spec.ts.

import Module from "node:module";

// --- Estado controlável do mock Yahoo -----------------------------------
interface MockQuote {
  price: number;
  currency: string;
  name: string;
}

export const yahoo = {
  // ticker -> quote (ou null para "sem cotação"). Ausente = null.
  quotes: {} as Record<string, MockQuote | null>,
  // moeda -> câmbio→EUR (ou null). Ausente: EUR→1, resto→null.
  fx: {} as Record<string, number | null>,
  getQuotesCalls: [] as string[][],
  getFxCalls: [] as string[],
};

// --- Estado controlável do mock Supabase --------------------------------
export const db = {
  selectRows: [] as Array<{
    ticker: string;
    price: number;
    currency: string;
    name: string;
    fetched_at: string;
  }>,
  selectReject: false, // .in() rejeita → simula falha de leitura da DB
  upsertReject: false, // .upsert() rejeita → simula falha de escrita
  selectCalls: [] as Array<{ cols: string; tickers: string[] }>,
  upsertCalls: [] as Array<{ rows: unknown[]; opts: unknown }>,
};

export function resetMocks(): void {
  yahoo.quotes = {};
  yahoo.fx = {};
  yahoo.getQuotesCalls = [];
  yahoo.getFxCalls = [];
  db.selectRows = [];
  db.selectReject = false;
  db.upsertReject = false;
  db.selectCalls = [];
  db.upsertCalls = [];
}

// --- Implementações mock ------------------------------------------------
const getQuotes = async (tickers: string[]) => {
  yahoo.getQuotesCalls.push([...tickers]);
  return Object.fromEntries(
    tickers.map((t) => [t, t in yahoo.quotes ? yahoo.quotes[t] : null])
  );
};

const getFxToEur = async (currency: string) => {
  yahoo.getFxCalls.push(currency);
  if (currency in yahoo.fx) return yahoo.fx[currency];
  return currency.toUpperCase() === "EUR" ? 1 : null;
};

const supabaseMock = {
  from(_table: string) {
    return {
      select(cols: string) {
        return {
          in(_col: string, tickers: string[]) {
            db.selectCalls.push({ cols, tickers: [...tickers] });
            if (db.selectReject) {
              return Promise.reject(new Error("mock: price_cache read failed"));
            }
            return Promise.resolve({ data: db.selectRows, error: null });
          },
        };
      },
      upsert(rows: unknown[], opts: unknown) {
        db.upsertCalls.push({ rows, opts });
        if (db.upsertReject) {
          return Promise.reject(new Error("mock: price_cache upsert failed"));
        }
        return Promise.resolve({ error: null });
      },
    };
  },
};

const createClient = async () => supabaseMock;

// --- Hook de interceptação de require -----------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const M = Module as any;
const originalLoad = M._load;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
M._load = function (request: string, ...rest: any[]) {
  if (request.includes("yahoo-finance/client")) {
    return { getQuotes, getFxToEur };
  }
  if (request.includes("supabase/server")) {
    return { createClient };
  }
  return originalLoad.apply(this, [request, ...rest]);
};

// Helpers de timestamps para o TTL de 15 min (prices.ts: PRICE_CACHE_TTL_MS).
export function freshTs(): string {
  return new Date().toISOString();
}
export function staleTs(): string {
  return new Date(Date.now() - 30 * 60 * 1000).toISOString();
}
