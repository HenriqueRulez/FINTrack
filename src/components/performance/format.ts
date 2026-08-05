// ---------------------------------------------------------------------------
// Formatting helpers for the Performance page — EUR only (fixed base currency)
// ---------------------------------------------------------------------------

export function formatMoneyEur(
  n: number,
  opts?: { signDisplay?: "always" | "never" | "auto" }
): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: opts?.signDisplay ?? "auto",
  }).format(n);
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

export function formatHoldDays(days: number): string {
  if (days <= 0) return "—";
  const months = Math.floor(days / 30);
  const rem = days % 30;
  if (months === 0) return `${rem}d`;
  return `${months}m ${rem}d`;
}
