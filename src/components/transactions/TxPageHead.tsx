"use client";

import { useAnimations } from "@/hooks/useAnimations";

// ---------------------------------------------------------------------------
// Inline SVG icons — 14×14
// ---------------------------------------------------------------------------

function UploadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <path d="M2 11v1.5h10V11" />
      <path d="M7 2v8M4 5l3-3 3 3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6 6.5c0-1 1-2 2-2s2 1 2 2-2 1.5-2 2.5M8 11.5v.01" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// TxPageHead
// ---------------------------------------------------------------------------

export function TxPageHead() {
  const { enabled: animationsEnabled } = useAnimations();
  const rise = animationsEnabled ? "rise" : "";

  return (
    <div
      className={`flex items-center justify-between gap-5 ${rise} d1`}
    >
      {/* Title */}
      <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
        Transactions
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Help */}
        <button
          type="button"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Help"
        >
          <HelpIcon />
        </button>

        {/* Import — stub */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-md text-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors font-mono"
          aria-label="Import transactions"
        >
          <UploadIcon />
          Import
        </button>

        {/* Add Manually — stub */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-[6px] rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-mono font-medium"
          aria-label="Add transaction manually"
        >
          <PlusIcon />
          Add Manually
        </button>
      </div>
    </div>
  );
}
