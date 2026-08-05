"use client";

import { formatMoneyEur } from "./format";

// ---------------------------------------------------------------------------
// GainLossCell — displays absolute (EUR) + percentage gain/loss
// ---------------------------------------------------------------------------

interface GainLossCellProps {
  absoluteValueEur: number;
  pctValue: number;
}

export function GainLossCell({ absoluteValueEur, pctValue }: GainLossCellProps) {
  const isGain = absoluteValueEur >= 0;
  const colorClass = isGain ? "text-[var(--gain)]" : "text-[var(--loss)]";
  const badgeBg = isGain
    ? "bg-[var(--gain)]/15 text-[var(--gain)]"
    : "bg-[var(--loss)]/15 text-[var(--loss)]";

  const sign = isGain ? "+" : "−";
  const absVal = Math.abs(absoluteValueEur);
  const absPct = Math.abs(pctValue);

  const formatted = formatMoneyEur(absVal);

  return (
    <span className="inline-flex flex-col items-end gap-1 leading-[1.2]">
      <span className={`text-sm font-medium tabular-nums ${colorClass}`}>
        {sign}
        {formatted}
      </span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium tabular-nums ${badgeBg}`}>
        {sign}
        {absPct.toFixed(2)}%
      </span>
    </span>
  );
}
