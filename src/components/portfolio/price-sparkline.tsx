"use client";

import * as React from "react";
import { LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryPoint {
  date: string;
  close: number;
}

interface PriceSparklineProps {
  ticker: string;
  isGain: boolean | null; // true = teal (var(--chart-1)), false = vermelho (var(--loss)), null = primary
}

type SparklineState = "loading" | "success" | "error";

export function PriceSparkline({ ticker, isGain }: PriceSparklineProps) {
  const [state, setState] = React.useState<SparklineState>("loading");
  const [points, setPoints] = React.useState<HistoryPoint[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    setState("loading");
    setPoints([]);

    fetch(`/api/portfolio/history?ticker=${encodeURIComponent(ticker)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { data: HistoryPoint[] };
        if (cancelled) return;
        if (!body.data || body.data.length < 2) {
          setState("error");
        } else {
          setPoints(body.data);
          setState("success");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (state === "loading") {
    return <Skeleton className="h-8 w-20 animate-pulse" />;
  }

  if (state === "error") {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const stroke =
    isGain === true
      ? "var(--chart-1)"
      : isGain === false
      ? "var(--loss)"
      : "var(--primary)";

  return (
    <LineChart width={80} height={32} data={points}>
      <Line
        type="monotone"
        dataKey="close"
        dot={false}
        strokeWidth={1.5}
        stroke={stroke}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
