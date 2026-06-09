"use client";

import type { AssetClass } from "./mock-data";

// ---------------------------------------------------------------------------
// TypeBadge — asset class badge with colour-coded style per DESIGN.md
// Mapping: Stocks → chart-1 (teal), ETFs → chart-2 (violet),
//          Crypto → chart-4 (rose), Other → chart-5 (sky blue)
// ---------------------------------------------------------------------------

interface TypeBadgeProps {
  assetClass: AssetClass;
}

const BADGE_STYLES: Record<AssetClass, { bg: string; text: string; label: string }> = {
  Stocks: {
    bg: "bg-chart-1/15",
    text: "text-chart-1",
    label: "Stock",
  },
  ETFs: {
    bg: "bg-chart-2/15",
    text: "text-chart-2",
    label: "ETF",
  },
  Crypto: {
    bg: "bg-chart-4/15",
    text: "text-chart-4",
    label: "Crypto",
  },
  Other: {
    bg: "bg-chart-5/15",
    text: "text-chart-5",
    label: "Other",
  },
};

export function TypeBadge({ assetClass }: TypeBadgeProps) {
  const styles = BADGE_STYLES[assetClass];

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
