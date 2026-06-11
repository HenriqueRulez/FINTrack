"use client";

// Cópia adaptada de src/components/transactions/TypeBadge.tsx — só BUY/SELL
// (os outros tipos do raiz ficam para uma fase futura).

import type { F5TxType } from "@/lib/fable5/types";

const BADGE_CONFIG: Record<F5TxType, { label: string; className: string }> = {
  buy: {
    label: "BUY",
    className:
      "bg-[var(--gain)]/12 text-[var(--gain)] border border-[var(--gain)]/40",
  },
  sell: {
    label: "SELL",
    className:
      "bg-[var(--loss)]/12 text-[var(--loss)] border border-[var(--loss)]/40",
  },
};

export function TypeBadge({ type }: { type: F5TxType }) {
  const cfg = BADGE_CONFIG[type];
  return (
    <span
      className={[
        "inline-flex px-2 py-[3px] rounded-sm text-[10px] font-semibold tracking-wider uppercase tabular-nums",
        cfg.className,
      ].join(" ")}
    >
      {cfg.label}
    </span>
  );
}
