"use client";

import { fmtEUR, fmtDate } from "./mock-data";
import type { CgRow, CgView } from "./mock-data";
import { TaxEmptyState, EmptyTrendIcon } from "./TaxEmptyState";

// ---------------------------------------------------------------------------
// SegSelector — Aggregate / Detailed (same visual as CurrencySelector)
// ---------------------------------------------------------------------------

interface SegSelectorProps {
  value: CgView;
  onChange: (v: CgView) => void;
}

const SEG_OPTIONS: { key: CgView; label: string }[] = [
  { key: "aggregate", label: "Aggregate" },
  { key: "detailed", label: "Detailed" },
];

function SegSelector({ value, onChange }: SegSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Capital gains view"
      className="inline-flex items-center border border-border/50 rounded-md overflow-hidden"
    >
      {SEG_OPTIONS.map((opt, i) => {
        const isActive = value === opt.key;
        const isLast = i === SEG_OPTIONS.length - 1;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={isActive}
            className={[
              "px-3 py-1 text-xs transition-colors",
              !isLast ? "border-r border-border/50" : "",
              isActive
                ? "text-primary bg-primary/10 font-medium"
                : "text-muted-foreground bg-transparent hover:bg-muted/60",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CapitalGainsPanel
// ---------------------------------------------------------------------------

interface CapitalGainsPanelProps {
  rows: CgRow[];
  totalProceeds: number;
  totalCost: number;
  totalGain: number;
  totalTax: number;
  cgView: CgView;
  onCgViewChange: (v: CgView) => void;
  year: number;
}

const TH =
  "text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 border-b border-border/50 text-right first:text-left first:pl-5 last:pr-5";
const TD =
  "px-4 py-3 border-b border-border/50 text-sm text-right first:text-left first:pl-5 last:pr-5";

export function CapitalGainsPanel({
  rows,
  totalProceeds,
  totalCost,
  totalGain,
  totalTax,
  cgView,
  onCgViewChange,
  year,
}: CapitalGainsPanelProps) {
  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col min-h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
        <h2 className="text-lg font-medium tracking-tight leading-none">Capital Gains</h2>
        <SegSelector value={cgView} onChange={onCgViewChange} />
      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <TaxEmptyState
          icon={<EmptyTrendIcon />}
          message={`No taxable sales found for ${year}`}
        />
      ) : cgView === "aggregate" ? (
        <div className="p-5 flex flex-col gap-4">
          <AggRow
            label="Total proceeds"
            value={fmtEUR(totalProceeds)}
            valueClass="text-foreground"
          />
          <AggRow
            label="Total cost basis"
            value={fmtEUR(totalCost)}
            valueClass="text-foreground"
          />
          <AggRow
            label="Net realised gain"
            value={fmtEUR(totalGain, { signed: true })}
            valueClass={totalGain >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"}
          />
          <AggRow
            label="Capital gains tax due"
            value={fmtEUR(totalTax)}
            valueClass="text-[var(--loss)]"
            suffix="tier-weighted"
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse tabular-nums">
            <caption className="sr-only">Capital gains by sale event for {year}</caption>
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  Date
                </th>
                <th scope="col" className={TH}>
                  Asset
                </th>
                <th scope="col" className={TH}>
                  Hold
                </th>
                <th scope="col" className={TH}>
                  Gain
                </th>
                <th scope="col" className={TH}>
                  Rate
                </th>
                <th scope="col" className={TH}>
                  Tax
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.ticker}-${r.date}-${i}`} className="[&:last-child>td]:border-b-0">
                  <td className={`${TD} text-muted-foreground`}>{fmtDate(r.date)}</td>
                  <td className={`${TD} font-semibold`}>{r.ticker}</td>
                  <td className={`${TD} text-muted-foreground`}>{r.holdYears.toFixed(1)}y</td>
                  <td
                    className={TD}
                    style={{ color: r.gain >= 0 ? "var(--gain)" : "var(--loss)" }}
                  >
                    {fmtEUR(r.gain, { signed: true })}
                  </td>
                  <td className={`${TD} text-muted-foreground`}>{r.rate.toFixed(1)}%</td>
                  <td className={`${TD} text-foreground`}>{fmtEUR(r.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AggRow — one aggregate row (dashed separator, last has none)
// ---------------------------------------------------------------------------

interface AggRowProps {
  label: string;
  value: string;
  valueClass: string;
  suffix?: string;
}

function AggRow({ label, value, valueClass, suffix }: AggRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-dashed border-border/50 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-[22px] font-medium tabular-nums tracking-tight ${valueClass}`}>
        {value}
        {suffix && (
          <span className="text-[0.62em] text-muted-foreground ml-1.5 font-normal no-underline">
            {suffix}
          </span>
        )}
      </span>
    </div>
  );
}
