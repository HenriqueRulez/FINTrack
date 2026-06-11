// Sandbox Fable 5 — helpers de formatação (seguros em server e client).
// formatCurrency de @/lib/utils só cobre EUR/USD/BRL; aqui as cotações Yahoo
// podem vir em qualquer moeda ISO (ex.: GBP), daí o try/catch.

export function fmtMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function fmtQty(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 8,
  }).format(value);
}

// Data de "hoje" em hora LOCAL (YYYY-MM-DD). Nunca usar toISOString() para
// isto: é UTC, e à noite (BRL) ou 00h-01h (PT no verão) rejeitaria a data
// local de hoje como "futura".
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
