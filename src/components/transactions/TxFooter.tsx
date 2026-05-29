"use client";

// ---------------------------------------------------------------------------
// TxFooter — count + page size selector
// ---------------------------------------------------------------------------

interface TxFooterProps {
  totalCount: number;
  selectedCount: number;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
}

export function TxFooter({
  totalCount,
  selectedCount,
  pageSize,
  onPageSizeChange,
}: TxFooterProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-border/50 bg-background gap-4">
      {/* Left — transaction count */}
      <p className="text-sm text-muted-foreground">
        Total:{" "}
        <b className="font-medium text-foreground">{totalCount}</b> transactions
        {selectedCount > 0 && (
          <>
            {" · "}
            <span className="text-primary font-medium">{selectedCount} selected</span>
          </>
        )}
      </p>

      {/* Right — page size selector */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Show:</span>
        <label className="bg-muted border border-border/50 rounded-md px-2 py-1 inline-flex items-center gap-1">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-transparent border-none outline-none text-foreground font-mono text-sm cursor-pointer"
            aria-label="Transactions per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
    </div>
  );
}
