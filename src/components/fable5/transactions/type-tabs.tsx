"use client";

// Cópia adaptada de src/components/transactions/TypeTabs.tsx —
// tabs All / Buy / Sell com badges de contagem (decisão: só buy/sell).

export type F5TabKey = "all" | "buy" | "sell";

export interface F5TabDefinition {
  key: F5TabKey;
  label: string;
}

export const F5_TYPE_TABS: F5TabDefinition[] = [
  { key: "all", label: "All" },
  { key: "buy", label: "Buy" },
  { key: "sell", label: "Sell" },
];

interface TypeTabsProps {
  activeTab: F5TabKey;
  counts: Record<F5TabKey, number>;
  onTabChange: (key: F5TabKey) => void;
}

export function TypeTabs({ activeTab, counts, onTabChange }: TypeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por tipo de transacção"
      className="grid grid-cols-3 bg-background border-b border-border/50"
    >
      {F5_TYPE_TABS.map((tab, idx) => {
        const isActive = tab.key === activeTab;
        const isLast = idx === F5_TYPE_TABS.length - 1;

        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-controls="f5-tx-table"
            onClick={() => onTabChange(tab.key)}
            className={[
              "px-4 py-4 bg-transparent border-none font-mono text-sm font-medium cursor-pointer",
              "transition-colors duration-150 inline-flex items-center justify-center gap-2 tracking-wide",
              "border-r border-border/50 relative",
              isLast ? "border-r-0" : "",
              isActive
                ? "text-foreground bg-muted/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            <span>{tab.label}</span>

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

            {isActive && (
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-primary"
                style={{ boxShadow: "0 0 8px oklch(0.72 0.17 185 / 60%)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
