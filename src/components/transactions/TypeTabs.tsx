"use client";

import type { TabDefinition, TabKey } from "./mock-data";

// ---------------------------------------------------------------------------
// TypeTabs — 6-column grid of filter tabs with count badges
// ---------------------------------------------------------------------------

interface TypeTabsProps {
  tabs: TabDefinition[];
  activeTab: TabKey;
  counts: Record<TabKey, number>;
  onTabChange: (key: TabKey) => void;
}

export function TypeTabs({ tabs, activeTab, counts, onTabChange }: TypeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por tipo de transacção"
      className="grid grid-cols-3 md:grid-cols-6 bg-background border-b border-border/50"
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.key === activeTab;
        const isLast = idx === tabs.length - 1;

        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-controls="tx-table"
            onClick={() => onTabChange(tab.key)}
            className={[
              "px-4 py-4 bg-transparent border-none font-mono text-sm font-medium cursor-pointer",
              "transition-colors duration-150 inline-flex items-center justify-center gap-2 tracking-wide",
              "border-r border-border/50 relative",
              // in 3-col mode, 3rd tab has no right border (cols 3 and 6)
              (idx + 1) % 3 === 0 ? "md:border-r border-r-0" : "",
              isLast ? "border-r-0" : "",
              isActive
                ? "text-foreground bg-muted/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            <span>{tab.label}</span>

            {/* Count badge */}
            <span
              className={[
                "rounded-sm text-[10px] px-[5px] py-[1px] tabular-nums tracking-wide",
                isActive
                  ? "text-primary border border-primary/40 bg-primary/10"
                  : "text-muted-foreground border border-border/50 bg-card",
              ].join(" ")}
            >
              {counts[tab.key]}
            </span>

            {/* Active underline — teal neon */}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-primary"
                style={{
                  boxShadow: "0 0 8px oklch(0.72 0.17 185 / 60%)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
