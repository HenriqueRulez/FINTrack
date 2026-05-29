"use client";

import type { TransactionType } from "./mock-data";

// ---------------------------------------------------------------------------
// TypeBadge — colored inline badge per transaction type
// ---------------------------------------------------------------------------

interface TypeBadgeProps {
  type: TransactionType;
}

const BADGE_CONFIG: Record<
  TransactionType,
  { label: string; className: string; style?: React.CSSProperties }
> = {
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
  cash: {
    label: "CASH",
    className:
      "bg-muted text-muted-foreground border border-border/70",
  },
  conv: {
    label: "CONV",
    className: "border text-chart-5",
    style: {
      background: "rgba(56,189,248,0.12)",
      borderColor: "rgba(56,189,248,0.4)",
    },
  },
  div: {
    label: "DIV",
    className: "border text-chart-3",
    style: {
      background: "rgba(245,158,11,0.12)",
      borderColor: "rgba(245,158,11,0.4)",
    },
  },
  int: {
    label: "INT",
    className: "border text-chart-2",
    style: {
      background: "rgba(139,92,246,0.12)",
      borderColor: "rgba(139,92,246,0.4)",
    },
  },
};

export function TypeBadge({ type }: TypeBadgeProps) {
  const cfg = BADGE_CONFIG[type];
  return (
    <span
      className={[
        "inline-flex px-2 py-[3px] rounded-sm text-[10px] font-semibold tracking-wider uppercase tabular-nums",
        cfg.className,
      ].join(" ")}
      style={cfg.style}
    >
      {cfg.label}
    </span>
  );
}
