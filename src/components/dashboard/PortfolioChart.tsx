"use client";

import { useState, useMemo } from "react";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnimations } from "@/hooks/useAnimations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChartPoint {
  date: string;
  portfolio: number;
  invested: number;
}

export interface PortfolioChartProps {
  data?: ChartPoint[] | null;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Mock data — 90 daily points
// ---------------------------------------------------------------------------

function generateMockData(): ChartPoint[] {
  const points: ChartPoint[] = [];
  const today = new Date(2026, 4, 26); // 2026-05-26
  let portfolio = 18000;
  const invested = 15000;

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const drift = (Math.random() - 0.46) * 300;
    portfolio = Math.max(invested * 0.8, portfolio + drift);
    const dateStr = d.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
    });
    points.push({
      date: dateStr,
      portfolio: Math.round(portfolio * 100) / 100,
      invested: invested + i * 20,
    });
  }
  return points;
}

const MOCK_DATA = generateMockData();

// ---------------------------------------------------------------------------
// Timeframe selector
// ---------------------------------------------------------------------------

type Timeframe = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"];

const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
  YTD: 90,
  "1Y": 90,
  ALL: 90,
};

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayload {
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const portfolio = payload.find((p) => p.name === "portfolio");
  const invested = payload.find((p) => p.name === "invested");

  return (
    <div className="bg-popover border border-border/60 rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      {portfolio && (
        <p className="text-base font-medium tabular-nums text-foreground">
          €{portfolio.value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
        </p>
      )}
      {invested && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Invested: €{invested.value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

export function PortfolioChart({ data = null, isLoading = false }: PortfolioChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");
  const { enabled: animationsEnabled } = useAnimations();
  const riseClass = animationsEnabled ? "rise" : "";

  const rawData = data ?? MOCK_DATA;
  const days = TIMEFRAME_DAYS[timeframe];

  const filteredData = useMemo(
    () => rawData.slice(Math.max(0, rawData.length - days)),
    [rawData, days]
  );

  // Determine Y axis domain
  const allValues = filteredData.flatMap((d) => [d.portfolio, d.invested]);
  const minVal = Math.min(...allValues) * 0.97;
  const maxVal = Math.max(...allValues) * 1.03;

  // Show every Nth label to avoid crowding
  const tickInterval = Math.ceil(filteredData.length / 6);

  return (
    <div className={`bg-card border border-border/40 rounded-lg p-5 ${riseClass} d2`}>
      {/* Header */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="text-[22px] font-medium tracking-tight leading-none mb-2">
            Portfolio{" "}
            <span className="text-muted-foreground">over time</span>
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className="w-[14px] h-[2px] bg-primary inline-block"
                aria-hidden="true"
              />
              <span className="text-[10px] text-muted-foreground">
                Portfolio value
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-[14px] h-[2px] inline-block"
                style={{
                  background:
                    "repeating-linear-gradient(to right, var(--muted-foreground) 0 4px, transparent 4px 7px)",
                }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-muted-foreground">
                Total invested
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/60">
              EUR · daily close
            </span>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex gap-1 bg-muted/50 rounded-md p-1" role="group" aria-label="Seleccionar período">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={[
                "px-2 py-1 text-[11px] rounded-sm transition-colors",
                timeframe === tf
                  ? "bg-card text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
              aria-pressed={timeframe === tf}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-[320px] w-full animate-pulse rounded-md bg-muted" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={filteredData}
            margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
          >
            {/* SVG gradient definition — Recharts renders this as part of the SVG */}
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.4}
            />

            <XAxis
              dataKey="date"
              tick={{
                fontSize: 10,
                fill: "var(--muted-foreground)",
                fontFamily: "var(--font-ibm-plex-mono, monospace)",
              }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
            />

            <YAxis
              orientation="right"
              tick={{
                fontSize: 10,
                fill: "var(--muted-foreground)",
                fontFamily: "var(--font-ibm-plex-mono, monospace)",
              }}
              tickLine={false}
              axisLine={false}
              domain={[minVal, maxVal]}
              tickFormatter={(v: number) =>
                `€${(v / 1000).toFixed(0)}k`
              }
              width={48}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
            />

            <Line
              type="monotone"
              dataKey="invested"
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="4 3"
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Footer */}
      <div className="flex justify-between mt-3 pt-3 border-t border-border/40">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
          Updated continuously
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
          Source — broker statements &amp; live quotes
        </span>
      </div>
    </div>
  );
}
