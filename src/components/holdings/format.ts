// ---------------------------------------------------------------------------
// Formatting helpers for the Holdings page — EUR only (fixed base currency)
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
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
