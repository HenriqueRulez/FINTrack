"use client";

// Empty state da tabela de transacções (estilo do raiz).

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-muted-foreground/50"
        aria-hidden="true"
      >
        <path d="M6 10h20l-6-6" />
        <path d="M26 22H6l6 6" />
      </svg>
      <p className="text-sm text-muted-foreground">
        No transactions match your filters
      </p>
    </div>
  );
}
