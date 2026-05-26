"use client";

import type { Currency } from "./mock-data";

// ---------------------------------------------------------------------------
// CurrencySelector — segmented control for EUR / USD / Native
// ---------------------------------------------------------------------------

interface CurrencySelectorProps {
  value: Currency;
  onChange: (v: Currency) => void;
}

const OPTIONS: Currency[] = ["EUR", "USD", "Native"];

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <div
      role="group"
      aria-label="Seleccionar moeda de exibição"
      className="inline-flex items-center border border-border/50 rounded-md overflow-hidden"
    >
      {OPTIONS.map((opt, i) => {
        const isActive = value === opt;
        const isLast = i === OPTIONS.length - 1;

        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            aria-pressed={isActive}
            className={[
              "px-3 py-1 text-xs transition-colors",
              !isLast ? "border-r border-border/50" : "",
              isActive
                ? "text-primary bg-primary/10 font-medium"
                : "text-muted-foreground bg-transparent hover:bg-muted/60",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
