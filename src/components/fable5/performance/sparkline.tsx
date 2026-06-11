"use client";

// Sparkline dos últimos 30 dias — ao contrário do raiz (gerador por seed),
// recebe os closes REAIS do Yahoo (via overview withSparklines).

export function Sparkline({
  points,
  pct30,
}: {
  points: number[];
  pct30: number | null;
}) {
  if (points.length < 2) {
    return <span className="text-muted-foreground text-[13px]">—</span>;
  }

  const W = 80;
  const H = 22;
  const PAD = 2;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (p - min) / range) * (H - PAD * 2);
    return { x, y };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  const up = points[points.length - 1] >= points[0];
  const color = up ? "var(--gain)" : "var(--loss)";
  const last = coords[coords.length - 1];
  const gradientId = `f5spark-${up ? "up" : "down"}`;

  const pctLabel =
    pct30 !== null
      ? `${pct30 >= 0 ? "+" : "−"}${Math.abs(pct30).toFixed(1)}%`
      : "";

  return (
    <span className="inline-flex items-center gap-2 justify-end">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={`${path} L${last.x.toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
        <circle cx={last.x} cy={last.y} r="2" fill={color} />
      </svg>
      <span
        className={`text-[11px] tabular-nums ${
          pct30 !== null && pct30 < 0
            ? "text-[var(--loss)]"
            : "text-[var(--gain)]"
        }`}
      >
        {pctLabel}
      </span>
    </span>
  );
}
