"use client";

import { useState } from "react";
import type { Density } from "./mock-data";

// ---------------------------------------------------------------------------
// Sliders icon
// ---------------------------------------------------------------------------

function SlidersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2 4h12M2 8h12M2 12h12" />
      <circle cx="5" cy="4" r="1.5" fill="var(--background)" />
      <circle cx="10" cy="8" r="1.5" fill="var(--background)" />
      <circle cx="6" cy="12" r="1.5" fill="var(--background)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch — reusing ShowSoldToggle pattern
// ---------------------------------------------------------------------------

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground select-none">{label}</span>
      <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={[
          "relative inline-flex w-8 h-[18px] shrink-0 cursor-pointer rounded-full border transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          value ? "bg-primary/20 border-primary" : "bg-muted border-border",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none absolute top-[2px] left-[2px] w-3 h-3 rounded-full transition-transform duration-150",
            value ? "translate-x-[14px] bg-primary" : "translate-x-0 bg-muted-foreground",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TxTweaksPanel
// ---------------------------------------------------------------------------

interface TxTweaksPanelProps {
  density: Density;
  onDensityChange: (d: Density) => void;
  showFx: boolean;
  onShowFxChange: (v: boolean) => void;
  showFees: boolean;
  onShowFeesChange: (v: boolean) => void;
}

const DENSITIES: { key: Density; label: string }[] = [
  { key: "compact", label: "Compact" },
  { key: "comfortable", label: "Normal" },
  { key: "spacious", label: "Spacious" },
];

export function TxTweaksPanel({
  density,
  onDensityChange,
  showFx,
  onShowFxChange,
  showFees,
  onShowFeesChange,
}: TxTweaksPanelProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className={[
          "fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full border shadow-lg",
          "inline-flex items-center justify-center transition-colors duration-150",
          panelOpen
            ? "bg-primary/10 border-primary/40 text-primary"
            : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60",
        ].join(" ")}
        aria-label={panelOpen ? "Close tweaks panel" : "Open tweaks panel"}
        aria-expanded={panelOpen}
      >
        <SlidersIcon />
      </button>

      {/* Panel */}
      {panelOpen && (
        <div
          className="fixed bottom-16 right-4 w-64 z-50 bg-card border border-border/50 rounded-lg shadow-xl p-4 flex flex-col gap-4"
          role="dialog"
          aria-label="Display settings"
        >
          {/* Display — density */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Display
            </p>

            {/* Segmented density control */}
            <div className="inline-flex border border-border/50 rounded-md overflow-hidden w-full">
              {DENSITIES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => onDensityChange(d.key)}
                  className={[
                    "flex-1 text-xs px-2 py-1.5 transition-colors duration-150 border-r border-border/50 last:border-r-0",
                    density === d.key
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-transparent text-muted-foreground hover:bg-muted/60",
                  ].join(" ")}
                  aria-pressed={density === d.key}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Columns
            </p>
            <Toggle
              value={showFx}
              onChange={onShowFxChange}
              label="Show exchange rate"
            />
            <Toggle
              value={showFees}
              onChange={onShowFeesChange}
              label="Show fees"
            />
          </div>
        </div>
      )}
    </>
  );
}
