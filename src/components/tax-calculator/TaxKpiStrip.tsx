"use client";

import { fmtEUR } from "./mock-data";

// ---------------------------------------------------------------------------
// KPI icons (fiel ao tax-app.jsx)
// ---------------------------------------------------------------------------

function InfoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5.5" />
      <path d="M7 6v4M7 4v.01" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 12l4-4 3 2 5-6" />
      <path d="M10 4h4v4" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <ellipse cx="6" cy="5" rx="4" ry="2" />
      <path d="M2 5v3c0 1.1 1.79 2 4 2s4-.9 4-2V5" />
      <ellipse cx="10" cy="9" rx="4" ry="2" />
      <path d="M6 9v3c0 1.1 1.79 2 4 2s4-.9 4-2V9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// TaxKpiStrip — 3 "fat" cards in a 1.4fr 1fr 1fr grid
// ---------------------------------------------------------------------------

interface TaxKpiStripProps {
  totalTax: number;
  cgTax: number;
  cgCount: number;
  divTax: number;
  divCount: number;
  year: number;
  rise: string;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function TaxKpiStrip({
  totalTax,
  cgTax,
  cgCount,
  divTax,
  divCount,
  year,
  rise,
}: TaxKpiStripProps) {
  return (
    <section
      className={`grid gap-4 grid-cols-[1.4fr_1fr_1fr] max-[1100px]:grid-cols-2 max-[700px]:grid-cols-1 ${rise} d2`}
    >
      {/* Card 1 — Total Estimated Tax Liability */}
      <div className="bg-card border border-border/50 rounded-lg p-5 flex flex-col gap-3 min-h-[130px] max-[1100px]:col-span-2 max-[700px]:col-span-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground font-medium">
            Total Estimated Tax Liability
          </span>
          <span className="text-muted-foreground">
            <InfoIcon />
          </span>
        </div>
        <div
          className={`text-[32px] font-medium leading-none tabular-nums tracking-tight text-foreground ${
            totalTax > 0 ? "neon-loss" : ""
          }`}
        >
          {fmtEUR(totalTax)}
        </div>
        <div className="text-sm text-muted-foreground">Sum for {year}</div>
      </div>

      {/* Card 2 — Capital Gains Tax */}
      <div className="bg-card border border-border/50 rounded-lg p-5 flex flex-col gap-3 min-h-[130px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground font-medium">Capital Gains Tax</span>
          <span
            style={{ color: cgTax > 0 ? "var(--gain)" : undefined }}
            className={cgTax > 0 ? "" : "text-muted-foreground"}
          >
            <TrendUpIcon />
          </span>
        </div>
        <div className="text-[32px] font-medium leading-none tabular-nums tracking-tight text-foreground">
          {fmtEUR(cgTax)}
        </div>
        <div className="text-sm text-muted-foreground">From {plural(cgCount, "sale event")}</div>
      </div>

      {/* Card 3 — Dividend Tax */}
      <div className="bg-card border border-border/50 rounded-lg p-5 flex flex-col gap-3 min-h-[130px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground font-medium">Dividend Tax</span>
          <span
            style={{ color: divTax > 0 ? "var(--chart-3)" : undefined }}
            className={divTax > 0 ? "" : "text-muted-foreground"}
          >
            <CoinsIcon />
          </span>
        </div>
        <div className="text-[32px] font-medium leading-none tabular-nums tracking-tight text-foreground">
          {fmtEUR(divTax)}
        </div>
        <div className="text-sm text-muted-foreground">
          From {plural(divCount, "dividend event")}
        </div>
      </div>
    </section>
  );
}
