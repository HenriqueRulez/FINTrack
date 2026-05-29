// ---------------------------------------------------------------------------
// EmptyState — shown when no transactions match active filters
// ---------------------------------------------------------------------------

export function EmptyState() {
  return (
    <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
      {/* Empty list icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-muted-foreground/40"
        aria-hidden="true"
      >
        <rect x="4" y="6" width="24" height="20" rx="2" />
        <path d="M10 12h12M10 17h8M10 22h5" />
      </svg>
      <p className="text-base font-medium text-foreground">
        No transactions match your filters
      </p>
      <p className="text-sm text-muted-foreground">
        Try clearing the date range or ticker filter
      </p>
    </div>
  );
}
