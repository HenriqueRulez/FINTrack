"use client";

import { useMemo, useState } from "react";
import { useAnimations } from "@/hooks/useAnimations";
import { TaxPageHead } from "./TaxPageHead";
import { TaxKpiStrip } from "./TaxKpiStrip";
import { CapitalGainsPanel } from "./CapitalGainsPanel";
import { DividendTaxPanel } from "./DividendTaxPanel";
import { TaxTweaksPanel } from "./TaxTweaksPanel";
import {
  SAMPLE_EVENTS_2026,
  EMPTY_EVENTS,
  TAX_SETTINGS,
  deriveCapitalGains,
  deriveDividendTax,
} from "./mock-data";
import type { CgView, TaxYear } from "./mock-data";

// ---------------------------------------------------------------------------
// TaxCalculatorPage — client root; holds state, derives tax math via useMemo.
//
// TODO (Engineer, phase 2): replace mock events/settings with real data from
// the API. Today everything is mock and 100% client-side (no network calls).
// ---------------------------------------------------------------------------

export function TaxCalculatorPage() {
  const { enabled } = useAnimations();
  const rise = enabled ? "rise" : "";

  const [useSampleData, setUseSampleData] = useState(false);
  const [cgView, setCgView] = useState<CgView>("aggregate");
  const [year, setYear] = useState<TaxYear>(2026);

  // Sample data only exists for 2026 (D3) — other years stay empty.
  const events = useSampleData && year === 2026 ? SAMPLE_EVENTS_2026 : EMPTY_EVENTS;

  const cg = useMemo(
    () => deriveCapitalGains(events.sales, TAX_SETTINGS),
    [events.sales],
  );
  const div = useMemo(
    () => deriveDividendTax(events.dividends, TAX_SETTINGS),
    [events.dividends],
  );

  const totalTax = cg.totalTax + div.totalTax;

  return (
    <div className="flex flex-col gap-8">
      <TaxPageHead year={year} onYearChange={setYear} rise={rise} />

      <TaxKpiStrip
        totalTax={totalTax}
        cgTax={cg.totalTax}
        cgCount={cg.rows.length}
        divTax={div.totalTax}
        divCount={div.rows.length}
        year={year}
        rise={rise}
      />

      <section
        className={`grid gap-4 grid-cols-2 max-[1100px]:grid-cols-1 ${rise} d3`}
      >
        <CapitalGainsPanel
          rows={cg.rows}
          totalProceeds={cg.totalProceeds}
          totalCost={cg.totalCost}
          totalGain={cg.totalGain}
          totalTax={cg.totalTax}
          cgView={cgView}
          onCgViewChange={setCgView}
          year={year}
        />
        <DividendTaxPanel
          rows={div.rows}
          total={div.total}
          totalTax={div.totalTax}
          dividendRate={TAX_SETTINGS.dividendRate}
          year={year}
        />
      </section>

      <TaxTweaksPanel
        useSampleData={useSampleData}
        onUseSampleDataChange={setUseSampleData}
        cgView={cgView}
        onCgViewChange={setCgView}
      />
    </div>
  );
}
