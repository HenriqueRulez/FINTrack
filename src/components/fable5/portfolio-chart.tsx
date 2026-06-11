"use client";

// "Portfolio over time" do sandbox Fable 5 — cópia adaptada de
// dashboard/PortfolioChart.tsx. Diferenças: sem mock (dados reais do ledger),
// timeframes filtram por DATAS reais (não por contagem de pontos), símbolo
// de moeda segue a base. Carregado sem SSR via charts-client.tsx.

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { F5ChartPoint } from "@/lib/fable5/chart";
import type { F5Currency } from "@/lib/fable5/types";

const CURRENCY_SYMBOL: Record<F5Currency, string> = {
  EUR: "€",
  USD: "$",
  BRL: "R$",
};

type Timeframe = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";
const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"];

const DAY_MS = 24 * 60 * 60 * 1000;

// Datas em hora LOCAL (consistente com localToday() do servidor)
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function cutoffFor(tf: Timeframe): string | null {
  const now = Date.now();
  switch (tf) {
    case "1D": return localDateStr(new Date(now - 1 * DAY_MS));
    case "1W": return localDateStr(new Date(now - 7 * DAY_MS));
    case "1M": return localDateStr(new Date(now - 30 * DAY_MS));
    case "3M": return localDateStr(new Date(now - 90 * DAY_MS));
    case "YTD": return `${new Date().getFullYear()}-01-01`;
    case "1Y": return localDateStr(new Date(now - 365 * DAY_MS));
    case "ALL": return null;
  }
}

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

interface TooltipPayload {
  value: number;
  name: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  symbol,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  symbol: string;
}) {
  if (!active || !payload?.length) return null;
  const portfolio = payload.find((p) => p.name === "portfolio");
  const invested = payload.find((p) => p.name === "invested");

  return (
    <div className="bg-popover border border-border/60 rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label ? formatDateLabel(label) : ""}
      </p>
      {portfolio && (
        <p className="text-base font-medium tabular-nums text-foreground">
          {symbol}
          {portfolio.value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
        </p>
      )}
      {invested && (
        <p className="text-xs text-muted-foreground tabular-nums">
          Invested: {symbol}
          {invested.value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  );
}

export function F5PortfolioChart({
  data,
  currency,
}: {
  data: F5ChartPoint[];
  currency: F5Currency;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>("3M");
  const symbol = CURRENCY_SYMBOL[currency];

  const filteredData = useMemo(() => {
    const cutoff = cutoffFor(timeframe);
    return cutoff === null ? data : data.filter((p) => p.date >= cutoff);
  }, [data, timeframe]);

  const allValues = filteredData.flatMap((d) => [d.portfolio, d.invested]);
  const minVal = allValues.length > 0 ? Math.min(...allValues) * 0.97 : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) * 1.03 : 1;
  const tickInterval = Math.ceil(filteredData.length / 6);

  return (
    <div className="bg-card border border-border/40 rounded-lg p-5">
      {/* Header */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="text-[22px] font-medium tracking-tight leading-none mb-2">
            Portfolio <span className="text-muted-foreground">over time</span>
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-[14px] h-[2px] bg-primary inline-block" aria-hidden="true" />
              <span className="text-[10px] text-muted-foreground">Portfolio value</span>
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
              <span className="text-[10px] text-muted-foreground">Total invested</span>
            </div>
            <span className="text-[10px] text-muted-foreground/60">
              {currency} · daily close
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
      {filteredData.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
          Sem dados neste período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={filteredData}
            margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="f5PortfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.4} />

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
              tickFormatter={formatDateLabel}
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
              tickFormatter={(v: number) => `${symbol}${(v / 1000).toFixed(0)}k`}
              width={52}
            />

            <Tooltip content={<CustomTooltip symbol={symbol} />} />

            <Area
              type="monotone"
              dataKey="portfolio"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#f5PortfolioGradient)"
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
          Derived from transactions ledger
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
          Source — Yahoo Finance daily history
        </span>
      </div>
    </div>
  );
}
