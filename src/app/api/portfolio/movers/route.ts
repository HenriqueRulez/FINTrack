import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getQuote, getHistory } from "@/lib/yahoo-finance/client";
import type { Tables } from "@/types/database";
import type { MoverItem } from "@/components/dashboard/TopMoversSection";

// ---------------------------------------------------------------------------
// GET /api/portfolio/movers
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

  // 2. Rate limit — separate key as specified
  const rl = rateLimit(`portfolio:movers:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Fetch positions
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

  // 4. Fetch current quotes and history for each position in parallel
  const enriched = await Promise.all(
    positions.map(async (p) => {
      const [quote, history] = await Promise.all([
        getQuote(p.ticker),
        getHistory(p.ticker),
      ]);

      const currentPrice = quote?.price ?? p.current_price ?? p.avg_price;
      const changePercent =
        p.avg_price > 0
          ? ((currentPrice - p.avg_price) / p.avg_price) * 100
          : 0;

      // Last 7 close prices for the sparkline
      const sparkline = history
        .slice(-7)
        .map((h) => h.close);

      const mover: MoverItem = {
        ticker: p.ticker,
        name: quote?.name ?? p.name,
        price: Math.round(currentPrice * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        sparkline: sparkline.length >= 2 ? sparkline : undefined,
      };

      return mover;
    })
  );

  // 5. Sort by absolute changePercent descending — largest movers first
  const sorted = enriched
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5);

  return NextResponse.json({ data: sorted }, { status: 200 });
}
