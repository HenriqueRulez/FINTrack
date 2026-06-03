"use client";

import { fmtEUR, fmtDate } from "./mock-data";
import type { DivRow } from "./mock-data";
import { TaxEmptyState, EmptyCoinsIcon } from "./TaxEmptyState";

interface DividendTaxPanelProps {
  rows: DivRow[];
  total: number;
  totalTax: number;
  dividendRate: number;
  year: number;
}

const TH =
  "text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 border-b border-border/50 text-right first:text-left first:pl-5 last:pr-5";
const TD =
  "px-4 py-3 border-b border-border/50 text-sm text-right first:text-left first:pl-5 last:pr-5";

export function DividendTaxPanel({
  rows,
  total,
  totalTax,
  dividendRate,
  year,
}: DividendTaxPanelProps) {
  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col min-h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
        <h2 className="text-lg font-medium tracking-tight leading-none">Dividend Tax</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded-sm tabular-nums text-muted-foreground border border-border/50 bg-card">
          {Math.round(dividendRate)}% rate
        </span>
      </div>

      {/* Body */}
      {rows.length === 0 ? (
        <TaxEmptyState
          icon={<EmptyCoinsIcon />}
          message={`No dividend income found for ${year}`}
        />
      ) : (
        <div className="p-5 flex flex-col gap-4">
          <AggRow
            label="Total dividends received"
            value={fmtEUR(total, { signed: true })}
            valueClass="text-[var(--gain)]"
          />
          <AggRow
            label="Dividend tax due"
            value={fmtEUR(totalTax)}
            valueClass="text-[var(--loss)]"
          />
          <AggRow
            label="Net dividend income"
            value={fmtEUR(total - totalTax)}
            valueClass="text-foreground"
          />

          {/* Per-event table */}
          <div className="overflow-x-auto mt-2">
            <table className="w-full border-collapse tabular-nums">
              <caption className="sr-only">Dividend income by event for {year}</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Date
                  </th>
                  <th scope="col" className={TH}>
                    Asset
                  </th>
                  <th scope="col" className={TH}>
                    Amount
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
                    <td className={TD} style={{ color: "var(--gain)" }}>
                      {fmtEUR(r.amount, { signed: true })}
                    </td>
                    <td className={`${TD} text-foreground`}>{fmtEUR(r.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AggRow — keeps dashed border (table follows below)
// ---------------------------------------------------------------------------

interface AggRowProps {
  label: string;
  value: string;
  valueClass: string;
}

function AggRow({ label, value, valueClass }: AggRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-dashed border-border/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-[22px] font-medium tabular-nums tracking-tight ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}
