// PriceProvider real (server-only) para a camada de derivação (./derive.ts):
// resolve preço live + nome + câmbio moeda→EUR de cada ticker via Yahoo Finance.
// Isolado de derive.ts para manter a derivação pura e testável sem rede.
//
// Câmbios são deduplicados por moeda: N tickers em USD partilham uma só chamada
// USDEUR=X (reduz billing/risco de ban — objectivo declarado do projecto).

import { getQuotes, getFxToEur } from "@/lib/yahoo-finance/client";
import type { LivePrice, PriceProvider } from "./derive";

export const yahooPriceProvider: PriceProvider = async (tickers) => {
  if (tickers.length === 0) return {};

  const quotes = await getQuotes(tickers);

  // Moedas únicas presentes nas quotes — uma chamada de câmbio por moeda.
  const currencies = [
    ...new Set(
      Object.values(quotes)
        .filter((q): q is NonNullable<typeof q> => q !== null)
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
