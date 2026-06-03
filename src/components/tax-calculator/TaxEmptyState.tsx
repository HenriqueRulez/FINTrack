import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// TaxEmptyState — centred icon + message for empty panels
// ---------------------------------------------------------------------------

interface TaxEmptyStateProps {
  icon: ReactNode;
  message: string;
}

export function TaxEmptyState({ icon, message }: TaxEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
        <div
          className="flex items-center justify-center w-14 h-14 text-muted-foreground/40"
          aria-hidden="true"
        >
          {icon}
        </div>
        <div>{message}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty-state icons (48×48 — fiel ao tax-app.jsx)
// ---------------------------------------------------------------------------

export function EmptyTrendIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 36l12-12 8 8 16-18" />
      <path d="M30 14h12v12" />
    </svg>
  );
}

export function EmptyCoinsIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <ellipse cx="18" cy="16" rx="12" ry="6" />
      <path d="M6 16v8c0 3.3 5.37 6 12 6s12-2.7 12-6v-8" />
      <ellipse cx="30" cy="28" rx="12" ry="6" />
      <path d="M18 28v8c0 3.3 5.37 6 12 6s12-2.7 12-6v-8" />
    </svg>
  );
}
