"use client";

// Wrapper client que carrega os charts Recharts sem SSR — mesmo padrão de
// PortfolioChartClient.tsx (Server Components não podem usar ssr:false).

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const AllocationDonutClient = dynamic(
  () => import("@/components/fable5/charts").then((m) => m.AllocationDonut),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[250px] w-full rounded-md bg-muted" />,
  }
);

export const F5PortfolioChartClient = dynamic(
  () =>
    import("@/components/fable5/portfolio-chart").then(
      (m) => m.F5PortfolioChart
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
