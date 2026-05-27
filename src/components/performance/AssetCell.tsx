import type { TradeItem } from "./mock-data";

// ---------------------------------------------------------------------------
// AssetCell — logo + ticker + full name for Trade Analysis table
// ---------------------------------------------------------------------------

interface AssetCellProps {
  trade: TradeItem;
}

export function AssetCell({ trade }: AssetCellProps) {
  return (
    <div className="flex items-center gap-3 min-w-[240px]">
      {/* Logo */}
      <div
        className="w-9 h-9 rounded-[4px] flex items-center justify-center text-[11px] font-bold shrink-0 border border-border/50"
        style={{
          background: `var(--${trade.chart})`,
          color: "rgba(11,13,24,0.85)",
        }}
        aria-hidden="true"
      >
        {trade.ticker[0]}
      </div>

      {/* Text */}
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-semibold tracking-wide leading-[1.2]">
          {trade.ticker}
        </span>
        <span className="text-[12px] text-muted-foreground truncate max-w-[200px]">
          {trade.name}
        </span>
      </div>
    </div>
  );
}
