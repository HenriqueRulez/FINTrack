// Sandbox Fable 5 — overview derivado do ledger (substitui o antigo
// portfolio.ts de posições directas). Partilhado pelas pages (chamada
// directa) e pela rota GET /api/fable5/portfolio. Server-only.
//
// Pipeline: f5_transactions → buildLedger (valores em EUR) → enriquecimento
// com cotações actuais + FX → conversão EUR→moeda base com a taxa ACTUAL
// (o pivot EUR fixo das transacções garante que mudar a base nunca
// invalida dados guardados).

import { createClient } from "@/lib/supabase/server";
import { buildLedger } from "./ledger";
import { getF5History } from "./history";
import { getPricesFor, type F5Quote } from "./prices";
import { getF5Settings } from "./settings";
import {
  f5Table,
  type F5Allocation,
  type F5Asset,
  type F5AssetType,
  type F5HoldingRow,
  type F5Overview,
  type F5Transaction,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function fxPair(from: string, to: string): string {
  return `${from}${to}=X`;
}

export async function getF5Overview(
  opts: { force?: boolean; withSparklines?: boolean } = {}
): Promise<F5Overview> {
  const supabase = await createClient();
  const settings = await getF5Settings(supabase);

  const [txRes, assetRes] = await Promise.all([
    f5Table(supabase, "f5_transactions").select("*").order("date") as Promise<{
      data: F5Transaction[] | null;
      error: { message: string } | null;
    }>,
    f5Table(supabase, "f5_assets").select("*") as Promise<{
      data: F5Asset[] | null;
      error: { message: string } | null;
    }>,
  ]);
  if (txRes.error || assetRes.error) {
    throw new Error("f5: database error loading ledger");
  }
  const txs = txRes.data ?? [];
  const assets = new Map((assetRes.data ?? []).map((a) => [a.ticker, a]));

  const { aggregates } = buildLedger(txs);
  const tickers = [...aggregates.keys()];

  const priceOpts = {
    staleMinutes: settings.refresh_interval_minutes,
    force: opts.force,
  };
  const quotes = await getPricesFor(supabase, tickers, priceOpts);

  // Pares FX actuais: moedas das cotações → base, e EUR → base (pivot do ledger)
  const quoteCurrencies = new Set<string>();
  for (const t of tickers) {
    const cur = quotes[t.toUpperCase()]?.currency;
    if (cur) quoteCurrencies.add(cur);
  }

  async function loadFxFor(targetBase: string) {
    const needed = new Set(quoteCurrencies);
    needed.add("EUR"); // pivot do ledger
    needed.delete(targetBase);
    const pairs = [...needed].map((c) => fxPair(c, targetBase));
    return pairs.length > 0
      ? await getPricesFor(supabase, pairs, priceOpts)
      : {};
  }

  let base = settings.base_currency;
  let fxQuotes = await loadFxFor(base);
  let eurRate =
    base === "EUR" ? 1 : (fxQuotes[fxPair("EUR", base)]?.price ?? null);

  // Conversão EUR→base indisponível (Yahoo em baixo e cache vazio): degradar
  // a apresentação para EUR — valores correctos na moeda pivot em vez de
  // zeros falsos na moeda configurada. Os dados do ledger já vivem em EUR.
  if (eurRate === null) {
    base = "EUR";
    fxQuotes = await loadFxFor("EUR");
    eurRate = 1;
  }

  const rate = (from: string): number | null =>
    from === base ? 1 : (fxQuotes[fxPair(from, base)]?.price ?? null);

  // Sparklines reais (30 dias) — só quando pedido (página Performance)
  const sparkMap = new Map<string, number[]>();
  if (opts.withSparklines && tickers.length > 0) {
    const period1 = new Date(Date.now() - 31 * DAY_MS);
    const histories = await Promise.all(
      tickers.map((t) => getF5History(t, period1))
    );
    tickers.forEach((t, i) => {
      const closes = histories[i].map((p) => p.close);
      if (closes.length >= 2) sparkMap.set(t, closes);
    });
  }

  const holdings: F5HoldingRow[] = [];
  for (const agg of aggregates.values()) {
    const asset = assets.get(agg.ticker);
    const q: F5Quote | null = quotes[agg.ticker.toUpperCase()] ?? null;
    const active = agg.status === "active";

    const avgCostBase =
      eurRate !== null && active ? agg.avgCostEur * eurRate : null;
    const investedBase = eurRate !== null ? agg.investedEur * eurRate : null;

    let marketValueBase: number | null = null;
    if (active && q) {
      const qRate = rate(q.currency);
      if (qRate !== null) marketValueBase = agg.openQty * q.price * qRate;
    } else if (!active) {
      marketValueBase = 0;
    }

    const unrealizedBase =
      active && marketValueBase !== null && investedBase !== null
        ? marketValueBase - investedBase
        : active
          ? null
          : 0;

    const spark = sparkMap.get(agg.ticker) ?? null;
    const pct30 =
      spark && spark.length >= 2 && spark[0] !== 0
        ? (spark[spark.length - 1] / spark[0] - 1) * 100
        : null;

    holdings.push({
      ticker: agg.ticker,
      name: asset?.name ?? q?.name ?? null,
      asset_type: (asset?.asset_type ?? "stock") as F5AssetType,
      openQty: agg.openQty,
      avgCostBase,
      investedBase,
      currentPrice: q?.price ?? null,
      quoteCurrency: q?.currency ?? null,
      marketValueBase,
      unrealizedBase,
      realizedBase: eurRate !== null ? agg.realizedEur * eurRate : 0,
      feesBase: eurRate !== null ? agg.feesEur * eurRate : 0,
      pctOfPortfolio: 0, // preenchido abaixo
      status: agg.status,
      holdDays: agg.holdDays,
      cycleStartDate: agg.cycleStartDate,
      priceIsStale: q?.isStale ?? false,
      priceFetchedAt: q?.fetchedAt ?? null,
      spark30d: spark,
      pct30,
    });
  }

  // % do portfólio sobre o valor de mercado das posições abertas
  const activeRows = holdings.filter((h) => h.status === "active");
  const totalMarket = activeRows.reduce(
    (sum, h) => sum + (h.marketValueBase ?? 0),
    0
  );
  for (const h of holdings) {
    h.pctOfPortfolio =
      h.status === "active" && totalMarket > 0 && h.marketValueBase !== null
        ? (h.marketValueBase / totalMarket) * 100
        : 0;
  }

  // Ordenação: activas por valor desc, fechadas no fundo
  holdings.sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return (b.marketValueBase ?? 0) - (a.marketValueBase ?? 0);
  });

  // Summary
  let invested_open = 0;
  let unrealized_total = 0;
  let realized_total = 0;
  let fees_total = 0;
  const stale_tickers: string[] = [];
  let oldestFetch: string | null = null;
  for (const h of holdings) {
    invested_open += h.investedBase ?? 0;
    unrealized_total += h.unrealizedBase ?? 0;
    realized_total += h.realizedBase;
    fees_total += h.feesBase;
    if (h.status === "active" && (h.currentPrice === null || h.priceIsStale)) {
      stale_tickers.push(h.ticker);
    }
    if (h.priceFetchedAt && (!oldestFetch || h.priceFetchedAt < oldestFetch)) {
      oldestFetch = h.priceFetchedAt;
    }
  }

  // Alocação por tipo (só posições abertas)
  const byType = new Map<F5AssetType, number>();
  for (const h of activeRows) {
    const value = h.marketValueBase ?? h.investedBase ?? 0;
    byType.set(h.asset_type, (byType.get(h.asset_type) ?? 0) + value);
  }
  const allocTotal = [...byType.values()].reduce((a, b) => a + b, 0);
  const allocation: F5Allocation[] = [...byType.entries()]
    .map(([asset_type, value]) => ({
      asset_type,
      value,
      pct: allocTotal > 0 ? (value / allocTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    holdings,
    summary: {
      total_value: totalMarket,
      invested_open,
      unrealized_total,
      realized_total,
      fees_total,
      gain_total: unrealized_total + realized_total,
      active_count: activeRows.length,
      closed_count: holdings.length - activeRows.length,
      tx_count: txs.length,
      base_currency: base,
      prices_fetched_at: oldestFetch,
      stale_tickers,
    },
    allocation,
    settings,
  };
}
