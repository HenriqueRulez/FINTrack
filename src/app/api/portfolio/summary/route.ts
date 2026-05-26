import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { Tables } from "@/types/database";
import type { KpiItem } from "@/components/dashboard/KpiGrid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortfolioSummary {
  totalValue: number;
  deltaAbsolute: number;
  deltaPercent: number;
  kpis: KpiItem[];
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

// ---------------------------------------------------------------------------
// GET /api/portfolio/summary
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  void request;
  const supabase = await createClient();

  // 1. Auth — always first
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const rl = rateLimit(`portfolio:summary:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Fetch positions — no body/query params needed; RLS enforces user_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: positions, error: dbError } = await (supabase as any)
    .from("portfolio_positions")
    .select("*")
    .eq("user_id", user.id) as {
      data: Tables<"portfolio_positions">[] | null;
      error: { message: string } | null;
    };

  if (dbError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // 4. Calculate summary — empty portfolio returns zeros
  if (!positions || positions.length === 0) {
    const emptySummary: PortfolioSummary = {
      totalValue: 0,
      deltaAbsolute: 0,
      deltaPercent: 0,
      kpis: buildKpis(0, 0, 0, 0),
    };
    return NextResponse.json({ data: emptySummary }, { status: 200 });
  }

  let totalValue = 0;
  let totalCost = 0;

  for (const p of positions) {
    const price = p.current_price ?? p.avg_price;
    totalValue += p.quantity * price;
    totalCost += p.quantity * p.avg_price;
  }

  const deltaAbsolute = totalValue - totalCost;
  const deltaPercent = totalCost > 0 ? (deltaAbsolute / totalCost) * 100 : 0;
  const openPositions = positions.length;

  // Day P&L — placeholder (no intraday data in current schema)
  const dayPnl = 0;

  const summary: PortfolioSummary = {
    totalValue,
    deltaAbsolute,
    deltaPercent,
    kpis: buildKpis(totalCost, openPositions, dayPnl, deltaAbsolute),
  };

  return NextResponse.json({ data: summary }, { status: 200 });
}

function buildKpis(
  investedCapital: number,
  openPositions: number,
  dayPnl: number,
  _deltaAbsolute: number
): KpiItem[] {
  return [
    {
      label: "Invested capital",
      value: formatEur(investedCapital),
      sub: "cost basis",
      sentiment: "neutral",
    },
    {
      label: "Cash reserve",
      value: formatEur(0),
      sub: "available",
      sentiment: "neutral",
    },
    {
      label: "Open positions",
      value: String(openPositions),
      sub: "active holdings",
      sentiment: "neutral",
    },
    {
      label: "Day P&L",
      value: formatEur(dayPnl),
      sub: "today vs yesterday",
      sentiment: dayPnl > 0 ? "gain" : dayPnl < 0 ? "loss" : "neutral",
    },
  ];
}
