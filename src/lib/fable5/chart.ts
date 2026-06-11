// Sandbox Fable 5 — série "Portfolio over time" para o dashboard.
// portfolio(d) = Σ qty(ticker, d) × close(ticker, d) × fx(quoteCur→base, d)
// invested(d)  = custo médio acumulado em EUR × fx(EUR→base, d)
// A quantidade por data vem do ledger (buildTimeline) — ao contrário do raiz,
// a série reflecte compras/vendas nas datas reais. Eixo de datas = união dos
// históricos com carry-forward do último close (stocks não cotam ao
// fim-de-semana, cripto cota 24/7). Server-only.

import { createClient } from "@/lib/supabase/server";
import { localToday } from "./format";
import { buildTimeline } from "./ledger";
import { getF5History, type F5HistoryPoint } from "./history";
import { getPricesFor } from "./prices";
import { getF5Settings } from "./settings";
import { f5Table, type F5Currency, type F5Transaction } from "./types";

export interface F5ChartPoint {
  date: string; // YYYY-MM-DD
  portfolio: number;
  invested: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function fxPair(from: string, to: string): string {
  return `${from}${to}=X`;
}

// Carry-forward por ponteiro único: valor na data = último close <= data.
// O eixo (dates) e a série são percorridos UMA vez cada — O(D+H), em vez de
// re-varrer o histórico inteiro por cada data do eixo.
function seriesOnDates(
  history: F5HistoryPoint[],
  dates: string[] // ordenadas asc
): Map<string, number | null> {
  const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : 1));
  const out = new Map<string, number | null>();
  let i = 0;
  let last: number | null = null;
  for (const date of dates) {
    while (i < sorted.length && sorted[i].date <= date) {
      last = sorted[i].close;
      i++;
    }
    out.set(date, last);
  }
  return out;
}

export async function getF5ChartSeries(): Promise<{
  data: F5ChartPoint[];
  base: F5Currency;
}> {
  const supabase = await createClient();
  const settings = await getF5Settings(supabase);
  const base = settings.base_currency;

  const { data: txs, error } = (await f5Table(supabase, "f5_transactions")
    .select("*")
    .order("date")) as {
    data: F5Transaction[] | null;
    error: { message: string } | null;
  };
  if (error) throw new Error("f5: database error loading transactions");
  if (!txs || txs.length === 0) return { data: [], base };

  const timeline = buildTimeline(txs);
  const firstDate = timeline[0].date;
  const period1 = new Date(
    new Date(firstDate + "T00:00:00Z").getTime() - 7 * DAY_MS
  );

  // Moedas das cotações (para saber que pares FX históricos são precisos)
  const tickers = [...new Set(txs.map((t) => t.ticker.toUpperCase()))];
  const quotes = await getPricesFor(supabase, tickers, {
    staleMinutes: settings.refresh_interval_minutes,
  });

  const fxCurrencies = new Set<string>();
  for (const t of tickers) {
    const cur = quotes[t]?.currency;
    if (cur && cur !== base) fxCurrencies.add(cur);
  }
  if (base !== "EUR") fxCurrencies.add("EUR"); // para converter o invested (pivot EUR)

  // Históricos: tickers + pares FX, tudo em paralelo (cache 1h por série)
  const [tickerHistories, fxHistories] = await Promise.all([
    Promise.all(tickers.map((t) => getF5History(t, period1))),
    Promise.all(
      [...fxCurrencies].map((c) => getF5History(fxPair(c, base), period1))
    ),
  ]);

  // Eixo de datas: união das datas dos históricos no intervalo [firstDate, hoje]
  const today = localToday();
  const axis = new Set<string>();
  for (const h of tickerHistories) {
    for (const p of h) if (p.date >= firstDate && p.date <= today) axis.add(p.date);
  }
  for (const t of timeline) axis.add(t.date); // garante as datas das transacções
  const dates = [...axis].sort();

  const closeAt = new Map<string, Map<string, number | null>>();
  tickers.forEach((t, i) =>
    closeAt.set(t, seriesOnDates(tickerHistories[i], dates))
  );
  const fxAt = new Map<string, Map<string, number | null>>();
  [...fxCurrencies].forEach((c, i) =>
    fxAt.set(c, seriesOnDates(fxHistories[i], dates))
  );
  const rateAt = (from: string, date: string): number | null =>
    from === base ? 1 : (fxAt.get(from)?.get(date) ?? null);

  // qty/invested por data: step function sobre a timeline do ledger
  let tlIdx = -1;
  const data: F5ChartPoint[] = [];
  for (const date of dates) {
    while (tlIdx + 1 < timeline.length && timeline[tlIdx + 1].date <= date) {
      tlIdx++;
    }
    if (tlIdx < 0) continue; // antes da primeira transacção
    const point = timeline[tlIdx];

    let portfolio = 0;
    let complete = true;
    for (const [ticker, qty] of Object.entries(point.qtyByTicker)) {
      const close = closeAt.get(ticker)?.get(date) ?? null;
      const cur = quotes[ticker]?.currency ?? null;
      const rate = cur ? rateAt(cur, date) : null;
      if (close === null || rate === null) {
        complete = false;
        break;
      }
      portfolio += qty * close * rate;
    }
    const eurRate = rateAt("EUR", date);
    if (!complete || eurRate === null) continue; // sem dados completos, omite o ponto

    data.push({
      date,
      portfolio,
      invested: point.investedEur * eurRate,
    });
  }

  return { data, base };
}
