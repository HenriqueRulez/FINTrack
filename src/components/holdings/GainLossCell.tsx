"use client";

// ---------------------------------------------------------------------------
// GainLossCell — displays absolute + percentage gain/loss
// ---------------------------------------------------------------------------

interface GainLossCellProps {
  absoluteValue: number;
  pctValue: number;
  currency: "EUR" | "USD";
}

export function GainLossCell({
  absoluteValue,
  pctValue,
  currency,
}: GainLossCellProps) {
  const isGain = absoluteValue >= 0;
  const colorClass = isGain ? "text-[var(--gain)]" : "text-[var(--loss)]";
  const badgeBg = isGain
    ? "bg-[var(--gain)]/15 text-[var(--gain)]"
    : "bg-[var(--loss)]/15 text-[var(--loss)]";

  const sign = isGain ? "+" : "−";
  const absVal = Math.abs(absoluteValue);
  const absPct = Math.abs(pctValue);

  const formatted = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal);

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
