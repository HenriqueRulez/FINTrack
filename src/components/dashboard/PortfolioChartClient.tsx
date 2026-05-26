"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { PortfolioChartProps } from "./PortfolioChart";

// PortfolioChart uses Recharts which requires browser APIs (window/ResizeObserver)
// — must be loaded without SSR. This Client Component wrapper owns the dynamic import
// so that Next.js 15 App Router Server Components can render it without errors.
const PortfolioChart = dynamic(
  () =>
    import("@/components/dashboard/PortfolioChart").then(
      (m) => m.PortfolioChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card border border-border/40 rounded-lg p-5">
        <Skeleton className="h-[320px] w-full rounded-md bg-muted" />
      </div>
    ),
  }
);

export function PortfolioChartClient(props: PortfolioChartProps) {
  return <PortfolioChart {...props} />;
}
