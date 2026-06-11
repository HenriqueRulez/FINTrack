"use client";

// Cópia adaptada de src/components/holdings/GainLossCell.tsx —
// valor absoluto + badge de percentagem, colorido gain/loss.

import { fmtMoney } from "@/lib/fable5/format";

export function GainLossCell({
  absoluteValue,
  pctValue,
  currency,
}: {
  absoluteValue: number;
  pctValue: number | null;
  currency: string;
}) {
  const isGain = absoluteValue >= 0;
  const colorClass = isGain ? "text-[var(--gain)]" : "text-[var(--loss)]";
  const badgeBg = isGain
    ? "bg-[var(--gain)]/15 text-[var(--gain)]"
    : "bg-[var(--loss)]/15 text-[var(--loss)]";
  const sign = isGain ? "+" : "−";

  return (
    <span className="inline-flex flex-col items-end gap-1 leading-[1.2]">
      <span className={`text-sm font-medium tabular-nums ${colorClass}`}>
        {sign}
        {fmtMoney(Math.abs(absoluteValue), currency)}
      </span>
      {pctValue !== null && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium tabular-nums ${badgeBg}`}
        >
          {sign}
          {Math.abs(pctValue).toFixed(2)}%
        </span>
      )}
    </span>
  );
}
