// Mapper do export CSV do Trading212 → candidatos a entrada de ledger.
// Server-only, função pura (recebe linhas já parseadas por ./csv.ts).
//
// Regras (decisões fechadas — TODO.md "Tarefas — pipeline csv-import"):
//  - Market/Limit buy → buy; Market/Limit sell → sell; Deposit → cash;
//    "Dividend (Dividend)" → div. Qualquer outra Action → ignorada (não erro).
//  - Moeda fora de EUR/USD/GBP → erro (constraint do DB). Campos essenciais em
//    falta/ilegíveis → erro, com motivo apresentável.
//  - fx normalizado para MULTIPLICATIVO "EUR por 1 unidade da moeda"
//    (grossEur = qty·price·fx). O T212 alterna a direcção do exchange rate entre
//    tipos de linha, por isso testam-se as duas direcções (rate e 1/rate) e
//    escolhe-se a que reproduz o Total (EUR) da própria linha.
//  - fees: conversão de moeda → fee do buy/sell (guardada em unidades da moeda
//    nativa para que fee·fx = fee em EUR); deposit fee → fee do cash (EUR).
//  - Dividendos: total positivo; withholding guardado à parte (em EUR); sem ID
//    próprio no ficheiro → external_id sintético e determinístico.
//  - Arredondamentos: qty 8 casas; price/fee/total/withholding 4 casas.
//
// Testes unitários em tests/unit/trading212.spec.ts (fixture real).

export type ImportLedgerType = "buy" | "sell" | "cash" | "div";

const SUPPORTED_CURRENCIES = new Set(["EUR", "USD", "GBP"]);

export interface ImportCandidate {
  date: string; // YYYY-MM-DD
  type: ImportLedgerType;
  ticker: string | null;
  label: string | null;
  qty: number | null;
  price: number | null;
  currency: string;
  fx: number; // EUR por 1 unidade da moeda (multiplicativo)
  fee: number; // em unidades da moeda nativa (fee·fx = fee em EUR)
  total: number; // EUR, positivo
  isin: string | null;
  withholding_tax: number; // EUR, >= 0
  external_id: string;
}

export interface MapDisplay {
  date: string;
  type: ImportLedgerType | null;
  ticker: string | null;
  label: string | null;
  qty: number | null;
  price: number | null;
  currency: string | null;
  total: number | null;
}

export type MapResult =
  | { status: "ok"; candidate: ImportCandidate }
  | { status: "ignored"; reason: string; display: MapDisplay }
  | { status: "error"; reason: string; display: MapDisplay };

// Erro de formato do ficheiro inteiro (cabeçalho irreconhecível) — a rota
// traduz para 422.
export class Trading212FormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Trading212FormatError";
  }
}

const REQUIRED_HEADERS = [
  "Action",
  "Time",
  "ISIN",
  "Ticker",
  "ID",
  "No. of shares",
  "Price / share",
  "Currency (Price / share)",
  "Exchange rate",
  "Total",
  "Currency (Total)",
  "Withholding tax",
  "Deposit fee",
  "Currency conversion fee",
] as const;

// O cabeçalho do T212 usa "Time (UTC)"; normalizamos removendo o sufixo "(...)"
// para casar de forma robusta com pequenas variações da coluna Time.
function normalizeHeader(h: string): string {
  const trimmed = h.trim();
  if (trimmed === "Time (UTC)" || trimmed.startsWith("Time")) return "Time";
  return trimmed;
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
const r8 = (n: number) => Math.round(n * 1e8) / 1e8;

function num(v: string | undefined): number | null {
  if (v === undefined) return null;
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function displayFrom(cols: (i: string) => string): MapDisplay {
  return {
    date: cols("Time").slice(0, 10),
    type: null,
    ticker: cols("Ticker").trim() || null,
    label: null,
    qty: num(cols("No. of shares")),
    price: num(cols("Price / share")),
    currency: cols("Currency (Price / share)").trim() || cols("Currency (Total)").trim() || null,
    total: num(cols("Total")),
  };
}

// Normaliza o exchange rate para "EUR por 1 unidade da moeda", escolhendo a
// direcção (rate ou 1/rate) que reproduz grossEur ≈ Total. Devolve null se
// nenhuma direcção bate certo (rate ilegível/incoerente).
function normalizeFx(
  grossNative: number,
  rate: number,
  totalEur: number
): number | null {
  if (!(rate > 0) || !(grossNative > 0) || !(totalEur > 0)) return null;
  const direct = rate;
  const inverse = 1 / rate;
  const errDirect = Math.abs(grossNative * direct - totalEur);
  const errInverse = Math.abs(grossNative * inverse - totalEur);
  const best = errDirect <= errInverse ? direct : inverse;
  const bestErr = Math.min(errDirect, errInverse);
  // Tolerância generosa: fees (cêntimos) e arredondamento do Total a 2 casas do
  // T212 afastam grossEur do Total sem indicar erro. A direcção errada falha por
  // ~35%, muito acima deste limite.
  const tol = 0.05 + 0.05 * totalEur;
  if (bestErr > tol) return null;
  return r6(best);
}

export function actionToType(action: string): ImportLedgerType | null {
  switch (action.trim()) {
    case "Market buy":
    case "Limit buy":
      return "buy";
    case "Market sell":
    case "Limit sell":
      return "sell";
    case "Deposit":
      return "cash";
    case "Dividend (Dividend)":
      return "div";
    default:
      return null;
  }
}

export function mapTrading212(rows: string[][]): MapResult[] {
  if (rows.length === 0) {
    throw new Trading212FormatError("Ficheiro CSV vazio.");
  }

  const header = rows[0].map(normalizeHeader);
  const idx = new Map<string, number>();
  header.forEach((h, i) => {
    if (!idx.has(h)) idx.set(h, i);
  });

  for (const req of REQUIRED_HEADERS) {
    if (!idx.has(req)) {
      throw new Trading212FormatError(
        `Cabeçalho Trading212 não reconhecido (falta a coluna "${req}").`
      );
    }
  }

  const results: MapResult[] = [];

  for (let r = 1; r < rows.length; r++) {
    const raw = rows[r];
    // Salta linhas totalmente vazias (ex.: linha em branco final).
    if (raw.every((c) => c.trim() === "")) continue;

    const cols = (name: string): string => {
      const i = idx.get(name);
      return i === undefined ? "" : (raw[i] ?? "");
    };

    const action = cols("Action").trim();
    const type = actionToType(action);
    const display = displayFrom(cols);

    if (type === null) {
      results.push({
        status: "ignored",
        reason: `Tipo de operação não suportado: "${action || "(vazio)"}"`,
        display,
      });
      continue;
    }

    const dateFull = cols("Time").trim();
    const date = dateFull.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      results.push({
        status: "error",
        reason: "Data inválida ou em falta.",
        display: { ...display, type },
      });
      continue;
    }

    if (type === "cash") {
      const currency = cols("Currency (Total)").trim();
      if (!SUPPORTED_CURRENCIES.has(currency)) {
        results.push({
          status: "error",
          reason: `Moeda não suportada: ${currency || "(vazia)"}. Suportadas: EUR, USD, GBP.`,
          display: { ...display, type, currency: currency || null },
        });
        continue;
      }
      if (currency !== "EUR") {
        results.push({
          status: "error",
          reason: "Depósito em moeda diferente de EUR não é suportado.",
          display: { ...display, type, currency },
        });
        continue;
      }
      const total = num(cols("Total"));
      if (total === null || total <= 0) {
        results.push({
          status: "error",
          reason: "Valor do depósito em falta ou inválido.",
          display: { ...display, type, currency },
        });
        continue;
      }
      const depositFee = num(cols("Deposit fee"));
      const externalId = cols("ID").trim();
      if (!externalId) {
        results.push({
          status: "error",
          reason: "Depósito sem identificador (ID) — não pode ser deduplicado.",
          display: { ...display, type, currency },
        });
        continue;
      }
      results.push({
        status: "ok",
        candidate: {
          date,
          type,
          ticker: null,
          label: "Deposit",
          qty: null,
          price: null,
          currency,
          fx: 1,
          fee: depositFee !== null ? r4(Math.abs(depositFee)) : 0,
          total: r4(total),
          isin: null,
          withholding_tax: 0,
          external_id: externalId,
        },
      });
      continue;
    }

    // buy / sell / div — partilham qty, price, currency da acção.
    const currency = cols("Currency (Price / share)").trim();
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      results.push({
        status: "error",
        reason: `Moeda não suportada: ${currency || "(vazia)"}. Suportadas: EUR, USD, GBP.`,
        display: { ...display, type, currency: currency || null },
      });
      continue;
    }

    const qty = num(cols("No. of shares"));
    const price = num(cols("Price / share"));
    const totalEur = num(cols("Total"));
    if (qty === null || qty <= 0 || price === null || price < 0 || totalEur === null) {
      results.push({
        status: "error",
        reason: "Campos essenciais (quantidade, preço ou total) em falta ou inválidos.",
        display: { ...display, type, currency },
      });
      continue;
    }

    const grossNative = qty * price;

    // fx multiplicativo (EUR por unidade da moeda).
    let fx: number | null;
    if (currency === "EUR") {
      fx = 1;
    } else {
      const rate = num(cols("Exchange rate"));
      if (rate === null) {
        results.push({
          status: "error",
          reason: "Taxa de câmbio em falta para linha em moeda estrangeira.",
          display: { ...display, type, currency },
        });
        continue;
      }
      fx = normalizeFx(grossNative, rate, totalEur);
      if (fx === null) {
        results.push({
          status: "error",
          reason: "Não foi possível normalizar a taxa de câmbio face ao Total do ficheiro.",
          display: { ...display, type, currency },
        });
        continue;
      }
    }

    if (type === "div") {
      const isin = cols("ISIN").trim() || null;
      const whNative = num(cols("Withholding tax"));
      const withholding = whNative !== null ? r4(Math.abs(whNative) * fx) : 0;
      // Sem ID próprio → external_id sintético determinístico.
      const externalId = `t212:div:${isin ?? "?"}:${dateFull}:${r4(totalEur)}`;
      results.push({
        status: "ok",
        candidate: {
          date,
          type,
          ticker: cols("Ticker").trim() || null,
          label: null,
          qty: r8(qty),
          price: r4(price),
          currency,
          fx,
          fee: 0,
          total: r4(totalEur),
          isin,
          withholding_tax: withholding,
          external_id: externalId,
        },
      });
      continue;
    }

    // buy / sell
    const ticker = cols("Ticker").trim();
    if (!ticker) {
      results.push({
        status: "error",
        reason: "Ticker em falta para compra/venda.",
        display: { ...display, type, currency },
      });
      continue;
    }
    const isin = cols("ISIN").trim() || null;
    const externalId = cols("ID").trim();
    if (!externalId) {
      results.push({
        status: "error",
        reason: "Transacção sem identificador (ID) — não pode ser deduplicada.",
        display: { ...display, type, currency },
      });
      continue;
    }
    // Fee de conversão de moeda vem em EUR; guarda-se em unidades da moeda
    // nativa (fee_native = fee_eur / fx) para que ledger.feeEur = fee·fx = EUR.
    const convFeeEur = num(cols("Currency conversion fee"));
    const feeEur = convFeeEur !== null ? Math.abs(convFeeEur) : 0;
    const feeNative = fx > 0 ? feeEur / fx : 0;

    results.push({
      status: "ok",
      candidate: {
        date,
        type,
        ticker: ticker.toUpperCase(),
        label: null,
        qty: r8(qty),
        price: r4(price),
        currency,
        fx,
        fee: r4(feeNative),
        total: r4(totalEur),
        isin,
        withholding_tax: 0,
        external_id: externalId,
      },
    });
  }

  return results;
}

// Projecção de um candidato para o formato de display da resposta da API.
export function candidateToDisplay(c: ImportCandidate): MapDisplay {
  return {
    date: c.date,
    type: c.type,
    ticker: c.ticker,
    label: c.label,
    qty: c.qty,
    price: c.price,
    currency: c.currency,
    total: c.total,
  };
}
