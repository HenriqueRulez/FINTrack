"use client";

// Badge de classe de activo — mapeamento do DESIGN.md:
// stock → chart-1 (teal), etf → chart-2 (violeta), crypto → chart-4 (rosa).
// Cópia adaptada de src/components/holdings/TypeBadge.tsx.

import type { F5AssetType } from "@/lib/fable5/types";

const BADGE_STYLES: Record<
  F5AssetType,
  { bg: string; text: string; label: string }
> = {
  stock: { bg: "bg-chart-1/15", text: "text-chart-1", label: "Stock" },
  etf: { bg: "bg-chart-2/15", text: "text-chart-2", label: "ETF" },
  crypto: { bg: "bg-chart-4/15", text: "text-chart-4", label: "Crypto" },
};

export function AssetTypeBadge({ assetType }: { assetType: F5AssetType }) {
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

export const ASSET_CHART_VAR: Record<F5AssetType, string> = {
  stock: "chart-1",
  etf: "chart-2",
  crypto: "chart-4",
};
