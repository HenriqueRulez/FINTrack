"use client";

// Painel flutuante de ajustes de display (densidade + colunas FX/Fee) —
// adaptação do TxTweaksPanel do raiz.

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Density } from "./tx-table";

const DENSITIES: Density[] = ["compact", "comfortable", "spacious"];

interface TxTweaksPanelProps {
  density: Density;
  onDensityChange: (d: Density) => void;
  showFx: boolean;
  onShowFxChange: (v: boolean) => void;
  showFees: boolean;
  onShowFeesChange: (v: boolean) => void;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <span
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-colors",
          checked ? "bg-primary/80 border-primary" : "bg-muted border-border"
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-[1px] h-3 w-3 rounded-full bg-background transition-all",
            checked ? "left-[14px]" : "left-[1px]"
          )}
        />
      </span>
    </button>
  );
}

export function TxTweaksPanel({
  density,
  onDensityChange,
  showFx,
  onShowFxChange,
  showFees,
  onShowFeesChange,
}: TxTweaksPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-2">
      {open && (
        <div className="w-56 rounded-lg border border-border/60 bg-card p-4 shadow-lg flex flex-col gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Density
            </p>
            <div className="flex gap-1 bg-muted/50 rounded-md p-1">
              {DENSITIES.map((d) => (
                <button
                  key={d}
                  onClick={() => onDensityChange(d)}
                  className={cn(
                    "flex-1 px-1 py-1 text-[10px] rounded-sm capitalize transition-colors",
                    density === d
                      ? "bg-card text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={density === d}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Columns
            </p>
            <div className="flex flex-col gap-2">
              <Toggle checked={showFx} onChange={onShowFxChange} label="FX rate" />
              <Toggle checked={showFees} onChange={onShowFeesChange} label="Fees" />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Display settings"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
          open
            ? "bg-primary text-primary-foreground border-primary neon-primary"
            : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 4h8M12 4h2M2 8h2M6 8h8M2 12h8M12 12h2" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>
    </div>
  );
}
