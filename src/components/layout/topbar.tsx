"use client";

import { useAnimations } from "@/hooks/useAnimations";

const DAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function Topbar() {
  const { enabled: animationsEnabled } = useAnimations();
  const riseClass = animationsEnabled ? "rise" : "";

  const now = new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const day = now.getDate().toString().padStart(2, "0");
  const month = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  return (
    <header
      className={`flex items-center justify-between h-14 px-6 border-b border-border/60 bg-background shrink-0 ${riseClass} d0`}
    >
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
        <span>· 2 min ago</span>
      </div>
    </header>
  );
}
