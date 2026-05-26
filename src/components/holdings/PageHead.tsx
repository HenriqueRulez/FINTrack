"use client";

import { useAnimations } from "@/hooks/useAnimations";

// ---------------------------------------------------------------------------
// PageHead — title + LIVE status meta row
// ---------------------------------------------------------------------------

interface PageHeadProps {
  activeCount: number;
  soldCount: number;
}

export function PageHead({ activeCount, soldCount }: PageHeadProps) {
  const { enabled: animationsEnabled } = useAnimations();
  const rise = animationsEnabled ? "rise" : "";

  return (
    <div className={`flex flex-col gap-3 ${rise} d1`}>
      <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
        Holdings
      </h1>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="neon-dot" aria-hidden="true" />
        <span className="text-foreground font-medium">LIVE</span>
        <span>·</span>
        <span>
          <span className="text-primary">{activeCount} active</span>
          {" · "}
          {soldCount} closed
        </span>
      </div>
    </div>
  );
}
