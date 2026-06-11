"use client";

// Charts Recharts do sandbox Fable 5 — carregados sem SSR via charts-client.tsx
// (Recharts precisa de browser APIs: window/ResizeObserver).

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { fmtMoney } from "@/lib/fable5/format";
import type { F5Allocation, F5AssetType } from "@/lib/fable5/types";

const TYPE_LABEL: Record<F5AssetType, string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Cripto",
};

// Cores alinhadas com a legenda do DESIGN.md (--chart-1 stocks, -2 ETFs, -4 crypto)
const TYPE_COLOR: Record<F5AssetType, string> = {
  stock: "var(--chart-1)",
  etf: "var(--chart-2)",
  crypto: "var(--chart-4)",
};

interface TooltipPayload {
  payload?: { name: string; value: number; pct?: number };
}

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  currency: string;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs">
      <p className="font-medium">{item.name}</p>
      <p className="tabular-nums text-muted-foreground">
        {fmtMoney(item.value, currency)}
        {item.pct !== undefined && ` · ${item.pct.toFixed(1)}%`}
      </p>
    </div>
  );
}

export function AllocationDonut({
  allocation,
  currency,
}: {
  allocation: F5Allocation[];
  currency: string;
}) {
  const data = allocation.map((a) => ({
    name: TYPE_LABEL[a.asset_type],
    value: a.value,
    pct: a.pct,
    color: TYPE_COLOR[a.asset_type],
  }));

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            stroke="var(--background)"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip currency={currency} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((entry) => (
          <span
            key={entry.name}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
            <span className="tabular-nums">{entry.pct.toFixed(1)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// (Fase 2: PositionsBars foi removido — redundante com a tabela de /holdings.)
