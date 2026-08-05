// Day P&L em EUR — variação de valor das posições ABERTAS face ao close anterior.
// Server-only (usa Yahoo). Partilhado pela rota /api/portfolio/summary e pela
// página do dashboard (leitura directa). Regra A-03: se NENHUMA activa tiver
// close anterior, devolve null (nunca 0 disfarçado de dado real).

import { getHistory, getFxToEur } from "@/lib/yahoo-finance/client";
import type { DerivedHolding } from "./derive";

export async function computeDayPnlEur(
  holdings: DerivedHolding[]
): Promise<number | null> {
  const active = holdings.filter(
    (h) => h.status === "active" && h.currentPriceEur !== null
  );
  if (active.length === 0) return null;

  // Câmbios live deduplicados por moeda — mesmo fx→EUR usado no preço live.
  const currencies = [...new Set(active.map((h) => h.currency.toUpperCase()))];
  const fxEntries = await Promise.all(
    currencies.map(async (cur) => [cur, await getFxToEur(cur)] as const)
  );
  const fxByCurrency = new Map(fxEntries);

  let sum = 0;
  let hasAnyPrevClose = false;
  await Promise.all(
    active.map(async (h) => {
      const fx = fxByCurrency.get(h.currency.toUpperCase());
      if (fx == null) return;
      const history = await getHistory(h.ticker);
      const prevNative = history[history.length - 2]?.close;
      if (prevNative == null) return;
      const prevCloseEur = prevNative * fx;
      sum += h.shares * ((h.currentPriceEur as number) - prevCloseEur);
      hasAnyPrevClose = true;
    })
  );

  return hasAnyPrevClose ? sum : null;
}
