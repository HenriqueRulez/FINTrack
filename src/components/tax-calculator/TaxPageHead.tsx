"use client";

import type { TaxYear } from "./mock-data";

// ---------------------------------------------------------------------------
// HelpIcon — 16×16 (same as TxPageHead)
// ---------------------------------------------------------------------------

function HelpIcon() {
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
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6 6.5c0-1 1-2 2-2s2 1 2 2-2 1.5-2 2.5M8 11.5v.01" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
      className="text-muted-foreground"
    >
      <path d="M2.5 4l2.5 2.5L7.5 4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// TaxYearChip — native <select> styled as a chip (fiel ao .input--chip)
// ---------------------------------------------------------------------------

const YEARS: TaxYear[] = [2026, 2025, 2024];

interface TaxYearChipProps {
  year: TaxYear;
  onYearChange: (y: TaxYear) => void;
}

function TaxYearChip({ year, onYearChange }: TaxYearChipProps) {
  return (
    <label className="inline-flex items-center gap-2 bg-muted border border-border/50 hover:border-border rounded-md px-3 py-[7px] min-h-[32px] text-sm transition-colors cursor-pointer">
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value) as TaxYear)}
        aria-label="Tax Year"
        className="bg-transparent border-none outline-none text-foreground font-mono tabular-nums cursor-pointer appearance-none pr-1"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <ChevronIcon />
    </label>
  );
}

// ---------------------------------------------------------------------------
// TaxPageHead
// ---------------------------------------------------------------------------

interface TaxPageHeadProps {
  year: TaxYear;
  onYearChange: (y: TaxYear) => void;
  rise: string;
}

export function TaxPageHead({ year, onYearChange, rise }: TaxPageHeadProps) {
  return (
    <div className={`flex items-center justify-between gap-5 ${rise} d1`}>
      {/* Title */}
      <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
        Tax Calculator
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          title="How is this calculated?"
          aria-label="How is this calculated?"
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary cursor-help transition-colors"
        >
          <HelpIcon />
        </button>
        <span className="text-sm text-muted-foreground">Tax Year:</span>
        <TaxYearChip year={year} onYearChange={onYearChange} />
      </div>
    </div>
  );
}
