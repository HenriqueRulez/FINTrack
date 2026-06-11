"use client";

// Topbar do sandbox Fable 5 — cópia adaptada de src/components/layout/topbar.tsx.
// O "Sync · X min ago" é real: calculado de prices_fetched_at (prop do layout).

import { useEffect, useState } from "react";

const DAY_NAMES = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
];
const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function syncLabel(iso: string | null, now: number): string {
  if (!iso) return "· never";
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (mins === 0) return "· just now";
  if (mins < 60) return `· ${mins} min ago`;
  return `· ${Math.floor(mins / 60)} h ago`;
}

export function F5Topbar({ pricesFetchedAt }: { pricesFetchedAt: string | null }) {
  // null até montar — evita mismatch de hidratação no tempo relativo
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const date = new Date();
  const dayName = DAY_NAMES[date.getDay()];
  const day = date.getDate().toString().padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border/60 bg-background shrink-0">
      {/* Left — date */}
      <div className="text-xs text-muted-foreground tracking-wide">
        <b className="uppercase tracking-wider text-[10px] text-foreground font-medium mr-2">
          {dayName}
        </b>
        {day} · {month} · {year}
      </div>

      {/* Right — sync status */}
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="neon-dot" aria-hidden="true" />
        <b className="text-foreground font-medium">Sync</b>
        <span>{now === null ? "·" : syncLabel(pricesFetchedAt, now)}</span>
      </div>
    </header>
  );
}
