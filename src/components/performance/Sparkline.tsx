"use client";

import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Sparkline — deterministic SVG sparkline generated from a seed
// ---------------------------------------------------------------------------

interface SparklineProps {
  seed: number;
  dir30: number;  // -1 to +1
  pct30: number;  // displayed delta percentage
}

function generateSpark(seed: number, dir30: number): number[] {
  let s = seed;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const n = 30;
  const points: number[] = [];
  let v = 0;
  const drift = dir30 * 0.35;
  for (let i = 0; i < n; i++) {
    v += drift + (rng() - 0.5) * 1.4;
    points.push(v);
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = (max - min) || 1;
  return points.map((p) => (p - min) / range);
}

export function Sparkline({ seed, dir30, pct30 }: SparklineProps) {
  const data = useMemo(() => generateSpark(seed, dir30), [seed, dir30]);

  const W = 96;
  const H = 28;
  const P = 2;
  const positive = dir30 >= 0;
  const color = positive ? "var(--gain)" : "var(--loss)";

  const pts = data.map((d, i) => [
    P + (i / (data.length - 1)) * (W - P * 2),
    P + (1 - d) * (H - P * 2),
  ]);

  let path = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cx = (p0[0] + p1[0]) / 2;
    path += ` C ${cx} ${p0[1]}, ${cx} ${p1[1]}, ${p1[0]} ${p1[1]}`;
  }
  const fillPath = `${path} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const lastPt = pts[pts.length - 1];
  const gradId = `sp-fade-${seed}`;

  return (
    <div className="inline-flex items-center justify-end gap-2 min-w-[130px]">
      <svg
        width="96"
        height="28"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-24 h-7 block shrink-0"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradId})`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastPt[0]} cy={lastPt[1]} r="2.2" fill={color} />
      </svg>
      <span
        className={[
          "text-[12px] tabular-nums tracking-tight min-w-[48px] text-right shrink-0",
          positive ? "text-[var(--gain)]" : "text-[var(--loss)]",
        ].join(" ")}
      >
        {pct30 >= 0 ? "+" : "−"}
        {Math.abs(pct30).toFixed(1)}%
      </span>
    </div>
  );
}
