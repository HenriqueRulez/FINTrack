"use client";

import type { AssetType } from "./types";

// ---------------------------------------------------------------------------
// TypeBadge — asset class badge with colour-coded style per DESIGN.md
// Mapping: stock → chart-1 (teal), etf → chart-2 (violet),
//          crypto → chart-4 (rose), other → chart-5 (sky blue)
// ---------------------------------------------------------------------------

interface TypeBadgeProps {
  assetType: AssetType;
}

const BADGE_STYLES: Record<AssetType, { bg: string; text: string; label: string }> = {
  stock: {
    bg: "bg-chart-1/15",
    text: "text-chart-1",
    label: "Stock",
  },
  etf: {
    bg: "bg-chart-2/15",
    text: "text-chart-2",
    label: "ETF",
  },
  crypto: {
    bg: "bg-chart-4/15",
    text: "text-chart-4",
    label: "Crypto",
  },
  other: {
    bg: "bg-chart-5/15",
    text: "text-chart-5",
    label: "Other",
  },
};

export function TypeBadge({ assetType }: TypeBadgeProps) {
  const styles = BADGE_STYLES[assetType];

  return (
    <span
      className={[
        "inline-flex items-center",
        "text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-wide whitespace-nowrap",
        styles.bg,
        styles.text,
      ].join(" ")}
    >
      {styles.label}
    </span>
  );
}
