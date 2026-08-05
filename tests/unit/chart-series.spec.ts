// Testes unitários da matemática diária do gráfico (src/lib/portfolio/chart-series.ts).
// Cobrem os dois bugs do achado A-02: carry-forward de closes (fins-de-semana/
// feriados/cripto não podem criar dips) e "invested" só a partir da 1ª compra.
// Zero I/O — closes injectados já em EUR. Correr: npx playwright test -c playwright.unit.config.ts

import { expect, test } from "@playwright/test";
import {
  buildChartSeries,
  type ChartSeriesInput,
} from "../../src/lib/portfolio/chart-series";
import type { TimelinePoint } from "../../src/lib/portfolio/ledger";

function pointFor(date: string, series: ReturnType<typeof buildChartSeries>) {
  const p = series.find((s) => s.date === date);
  if (!p) throw new Error(`sem ponto para ${date}`);
  return p;
}

test.describe("buildChartSeries — carry-forward de closes", () => {
  test("dia sem candle (fim-de-semana) reusa o último close, sem dip", () => {
    const timeline: TimelinePoint[] = [
      { date: "2026-01-02", qtyByTicker: { AAPL: 10 }, investedEur: 1000 },
    ];
    const input: ChartSeriesInput = {
      timeline,
      // sexta 02 tem candle; sábado 03 e domingo 04 não têm
      closesByTicker: { AAPL: { "2026-01-02": 100 } },
      startDate: "2026-01-02",
      endDate: "2026-01-04",
    };
    const series = buildChartSeries(input);
    expect(series).toHaveLength(3);
    expect(pointFor("2026-01-02", series).portfolio).toBe(1000);
    expect(pointFor("2026-01-03", series).portfolio).toBe(1000); // carry-forward
    expect(pointFor("2026-01-04", series).portfolio).toBe(1000); // carry-forward
  });

  test("com dois tickers, o buraco de candle de um não derruba o total", () => {
    const timeline: TimelinePoint[] = [
      { date: "2026-01-05", qtyByTicker: { AAA: 1, BBB: 1 }, investedEur: 200 },
    ];
    const series = buildChartSeries({
      timeline,
      closesByTicker: {
        AAA: { "2026-01-05": 100, "2026-01-06": 100, "2026-01-07": 100 },
        BBB: { "2026-01-05": 100, "2026-01-07": 100 }, // falta o dia 06
      },
      startDate: "2026-01-05",
      endDate: "2026-01-07",
    });
    // Dia 06: AAA=100 (candle real) + BBB=100 (carry-forward) = 200, sem dip.
    expect(pointFor("2026-01-06", series).portfolio).toBe(200);
    expect(pointFor("2026-01-07", series).portfolio).toBe(200);
  });
});

test.describe("buildChartSeries — invested a partir da 1ª compra", () => {
  test("antes da 1ª compra, portfolio e invested são 0 mesmo com closes existentes", () => {
    const timeline: TimelinePoint[] = [
      { date: "2026-01-03", qtyByTicker: { AAPL: 5 }, investedEur: 500 },
    ];
    const series = buildChartSeries({
      timeline,
      closesByTicker: {
        AAPL: {
          "2026-01-01": 100,
          "2026-01-02": 100,
          "2026-01-03": 120,
          "2026-01-04": 120,
        },
      },
      startDate: "2026-01-01",
      endDate: "2026-01-04",
    });
    // Dias antes da compra: nada detido → 0/0 (não aplicar custo a datas anteriores)
    expect(pointFor("2026-01-01", series)).toMatchObject({ portfolio: 0, invested: 0 });
    expect(pointFor("2026-01-02", series)).toMatchObject({ portfolio: 0, invested: 0 });
    // A partir da compra: invested = 500, portfolio = 5 × 120 = 600
    expect(pointFor("2026-01-03", series)).toMatchObject({ portfolio: 600, invested: 500 });
    expect(pointFor("2026-01-04", series)).toMatchObject({ portfolio: 600, invested: 500 });
  });
});

test.describe("buildChartSeries — casos de borda", () => {
  test("timeline vazio devolve série vazia", () => {
    expect(
      buildChartSeries({
        timeline: [],
        closesByTicker: {},
        startDate: "2026-01-01",
        endDate: "2026-01-05",
      })
    ).toEqual([]);
  });

  test("ticker sem qualquer close não soma lixo (contribui 0)", () => {
    const timeline: TimelinePoint[] = [
      { date: "2026-01-05", qtyByTicker: { AAA: 1, GHOST: 999 }, investedEur: 100 },
    ];
    const series = buildChartSeries({
      timeline,
      closesByTicker: { AAA: { "2026-01-05": 100 } }, // GHOST sem closes
      startDate: "2026-01-05",
      endDate: "2026-01-05",
    });
    // Só AAA conta; GHOST (sem preço) é ignorado — nada de NaN nem valor inflado.
    expect(pointFor("2026-01-05", series).portfolio).toBe(100);
  });

  test("startDate depois de endDate devolve série vazia", () => {
    expect(
      buildChartSeries({
        timeline: [
          { date: "2026-01-01", qtyByTicker: { AAA: 1 }, investedEur: 10 },
        ],
        closesByTicker: { AAA: { "2026-01-01": 10 } },
        startDate: "2026-01-05",
        endDate: "2026-01-01",
      })
    ).toEqual([]);
  });
});
