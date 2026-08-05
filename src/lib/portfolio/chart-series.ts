// Matemática diária pura do gráfico "Portfolio over time" (achado A-02).
// Zero I/O: recebe o timeline do ledger e um mapa de closes JÁ EM EUR por ticker;
// devolve a série diária { date, portfolio, invested }. A rota (chart/route.ts)
// faz só o I/O (carrega txs, busca closes no Yahoo, converte a EUR) e delega aqui.
//
// Corrige os dois bugs do A-02:
//  1) Fins-de-semana/feriados/cripto-vs-bolsa não podem criar "dips" falsos —
//     cada dia usa carry-forward do último close conhecido de cada ticker.
//  2) A linha "invested" só conta o custo de um ticker a partir da 1ª compra —
//     garantido pelo timeline, cujo investedEur só inclui posições abertas.

import type { TimelinePoint } from "./ledger";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ChartPoint {
  date: string; // YYYY-MM-DD
  portfolio: number; // valor de mercado em EUR
  invested: number; // custo das posições abertas em EUR
}

export interface ChartSeriesInput {
  // Série cumulativa do ledger (buildTimeline) — um ponto por data com transacções.
  timeline: TimelinePoint[];
  // ticker → (YYYY-MM-DD → close EM EUR). Esparso: só dias com candle real.
  closesByTicker: Record<string, Record<string, number>>;
  startDate: string; // YYYY-MM-DD inclusive (início da janela do timeframe)
  endDate: string; // YYYY-MM-DD inclusive (hoje)
}

function dateToUtcMs(day: string): number {
  return new Date(`${day}T00:00:00Z`).getTime();
}

function utcMsToDate(ms: number): string {
  return new Date(ms).toISOString().split("T")[0];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Último close conhecido com data <= day (carry-forward). null se não houver
// nenhum candle em ou antes de day (preço indisponível — não somar lixo).
function carryForwardClose(
  entries: Array<[string, number]> | undefined,
  day: string
): number | null {
  if (!entries || entries.length === 0) return null;
  let result: number | null = null;
  for (const [d, close] of entries) {
    if (d <= day) result = close;
    else break; // entries ordenadas asc — nada mais é <= day
  }
  return result;
}

export function buildChartSeries(input: ChartSeriesInput): ChartPoint[] {
  const { timeline, closesByTicker, startDate, endDate } = input;
  if (timeline.length === 0) return [];

  const start = dateToUtcMs(startDate);
  const end = dateToUtcMs(endDate);
  if (start > end) return [];

  // Closes de cada ticker ordenados asc para o carry-forward.
  const sortedCloses: Record<string, Array<[string, number]>> = {};
  for (const [ticker, byDate] of Object.entries(closesByTicker)) {
    sortedCloses[ticker] = Object.entries(byDate).sort((a, b) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
    );
  }

  const points: ChartPoint[] = [];
  let tlIdx = 0;
  let state: TimelinePoint | null = null;

  for (let t = start; t <= end; t += DAY_MS) {
    const day = utcMsToDate(t);

    // Avança o estado do ledger para o último ponto do timeline com data <= day.
    while (tlIdx < timeline.length && timeline[tlIdx].date <= day) {
      state = timeline[tlIdx];
      tlIdx++;
    }

    if (!state) {
      // Antes da 1ª transacção — nada detido.
      points.push({ date: day, portfolio: 0, invested: 0 });
      continue;
    }

    let portfolio = 0;
    for (const [ticker, qty] of Object.entries(state.qtyByTicker)) {
      if (qty <= 0) continue;
      const close = carryForwardClose(sortedCloses[ticker], day);
      if (close === null) continue; // preço indisponível nesse dia — ignora
      portfolio += qty * close;
    }

    points.push({
      date: day,
      portfolio: round2(portfolio),
      invested: round2(state.investedEur),
    });
  }

  return points;
}
