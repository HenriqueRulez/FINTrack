import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { ChartQuerySchema } from "@/lib/validations/portfolio";
import { getHistory } from "@/lib/yahoo-finance/client";
import type { Tables } from "@/types/database";
import type { ChartPoint } from "@/components/dashboard/PortfolioChart";

// ---------------------------------------------------------------------------
// Timeframe helpers
// ---------------------------------------------------------------------------

function getStartDate(tf: string): Date | null {
  const now = new Date();
  switch (tf) {
    case "1D":
      return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    case "1W":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1M":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "3M":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "YTD":
      return new Date(now.getFullYear(), 0, 1);
    case "1Y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "ALL":
      return null; // no filter
    default:
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
}

// ---------------------------------------------------------------------------
// GET /api/portfolio/chart
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
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
  const rl = rateLimit(`portfolio:chart:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validate query param `tf`
  const { searchParams } = new URL(request.url);
  const rawTf = searchParams.get("tf") ?? undefined;
  const parsed = ChartQuerySchema.safeParse({ tf: rawTf });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { tf } = parsed.data;

  // 4. Fetch positions
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

  if (!positions || positions.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  // 5. Fetch historical prices for all positions (getHistory has 1h cache)
  const historiesRaw = await Promise.all(
    positions.map(async (p) => ({
      position: p,
      history: await getHistory(p.ticker),
    }))
  );

  // 6. Aggregate by date: sum close*quantity for portfolio; sum avg_price*quantity for invested
  const dateMap = new Map<string, { portfolio: number; invested: number }>();

  for (const { position, history } of historiesRaw) {
    const investedContrib = position.avg_price * position.quantity;

    for (const point of history) {
      const existing = dateMap.get(point.date) ?? { portfolio: 0, invested: 0 };
      existing.portfolio += point.close * position.quantity;
      existing.invested += investedContrib;
      dateMap.set(point.date, existing);
    }
  }

  // 7. Filter by timeframe
  const startDate = getStartDate(tf);
  const chartPoints: ChartPoint[] = Array.from(dateMap.entries())
    .filter(([date]) => {
      if (!startDate) return true;
      return new Date(date) >= startDate;
    })
    .map(([date, values]) => ({
      date,
      portfolio: Math.round(values.portfolio * 100) / 100,
      invested: Math.round(values.invested * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ data: chartPoints }, { status: 200 });
}
