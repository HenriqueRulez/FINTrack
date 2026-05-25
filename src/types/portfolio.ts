import type { Position } from "@/components/portfolio/position-table";

export interface AggregatedPosition {
  ticker: string;
  name: string;
  asset_type: string;
  currency: string;
  totalQty: number;
  weightedAvgPrice: number;
  totalInvested: number;
  currentPrice: number | null;
  currentValue: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
  entries: Position[]; // todas as entradas originais deste ticker
}

/**
 * Agrega uma lista de posições individuais por ticker.
 * Calcula quantidade total, preço médio ponderado, total investido,
 * valor actual, ganho/perda absoluto e percentual.
 * A ordem dos tickers segue a primeira aparição no array de input.
 */
export function aggregatePositions(positions: Position[]): AggregatedPosition[] {
  const map = new Map<string, Position[]>();

  for (const p of positions) {
    const existing = map.get(p.ticker);
    if (existing) {
      existing.push(p);
    } else {
      map.set(p.ticker, [p]);
    }
  }

  return Array.from(map.entries()).map(([ticker, entries]) => {
    const totalQty = entries.reduce((s, e) => s + e.quantity, 0);
    const weightedAvgPrice =
      entries.reduce((s, e) => s + e.quantity * e.avg_price, 0) / totalQty;
    const totalInvested = totalQty * weightedAvgPrice;
    // All entries of the same ticker share the same current_price (updated in batch by the API)
    const currentPrice = entries[0].current_price;
    const currentValue = currentPrice != null ? totalQty * currentPrice : null;
    const gainLoss = currentValue != null ? currentValue - totalInvested : null;
    const gainLossPct =
      gainLoss != null && totalInvested !== 0
        ? (gainLoss / totalInvested) * 100
        : null;

    return {
      ticker,
      name: entries[0].name,
      asset_type: entries[0].asset_type,
      currency: entries[0].currency,
      totalQty,
      weightedAvgPrice,
      totalInvested,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct,
      entries,
    };
  });
}
