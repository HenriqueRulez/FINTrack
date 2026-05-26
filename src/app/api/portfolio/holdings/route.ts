import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { HoldingsQuerySchema } from "@/lib/validations/portfolio";
import type { Tables } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HoldingRow {
  id: string;
  ticker: string;
  name: string;
  asset_type: string;
  chart_var: string | null;
  shares: number;
  currency: string;
  avg_price: number;
  cost_basis: number;
  current_price: number;
  market_value: number;
  gain_loss: number;
  gain_loss_pct: number;
  pct: number; // % of total active holdings value
  sold: boolean;
}

export interface HoldingKpis {
  total_holdings_value: number;
  unrealized_pl: number;
  realized_pl: number;
  total_pl: number;
  active_count: number;
  sold_count: number;
}

export interface HoldingsResponse {
  data: {
    positions: HoldingRow[];
    kpis: HoldingKpis;
  };
}

// ---------------------------------------------------------------------------
// GET /api/portfolio/holdings
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
  const rl = rateLimit(`portfolio:holdings:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validate query params with Zod
  const { searchParams } = new URL(request.url);
  const rawParams = {
    currency: searchParams.get("currency") ?? undefined,
    showSold: searchParams.get("showSold") ?? undefined,
    sortCol: searchParams.get("sortCol") ?? undefined,
    sortDir: searchParams.get("sortDir") ?? undefined,
  };

  const parsed = HoldingsQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { showSold } = parsed.data;

  // 4. Query DB — user_id always from session (RLS enforces it too)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (supabase as any)
    .from("portfolio_positions")
    .select("*")
    .eq("user_id", user.id);

  // Filter sold positions unless showSold is requested
  if (!showSold) {
    query.eq("sold", false);
  }

  const { data: positions, error: dbError } = await query as {
    data: Tables<"portfolio_positions">[] | null;
    error: { message: string } | null;
  };

  if (dbError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!positions || positions.length === 0) {
    const emptyResponse: HoldingsResponse = {
      data: {
        positions: [],
        kpis: {
          total_holdings_value: 0,
          unrealized_pl: 0,
          realized_pl: 0,
          total_pl: 0,
          active_count: 0,
          sold_count: 0,
        },
      },
    };
    return NextResponse.json(emptyResponse, { status: 200 });
  }

  // 5. Separate active from sold positions for KPI calculation
  const activePositions = positions.filter((p) => !p.sold);
  const soldPositions = positions.filter((p) => p.sold);

  // Total market value of active positions (for Portfolio % calculation)
  const totalActiveValue = activePositions.reduce((sum, p) => {
    const price = p.current_price ?? p.avg_price;
    return sum + p.quantity * price;
  }, 0);

  // Unrealized P&L — active positions only
  const unrealizedPl = activePositions.reduce((sum, p) => {
    const price = p.current_price ?? p.avg_price;
    const marketValue = p.quantity * price;
    const costBasis = p.quantity * p.avg_price;
    return sum + (marketValue - costBasis);
  }, 0);

  // Realized P&L — sold positions (difference at their recorded avg_price and current_price)
  // In Phase 1 schema, sold positions don't have a separate "sell price" field.
  // We use current_price as a proxy for the sell price (or avg_price if null).
  const realizedPl = soldPositions.reduce((sum, p) => {
    const sellPrice = p.current_price ?? p.avg_price;
    const costBasis = p.quantity * p.avg_price;
    const saleValue = p.quantity * sellPrice;
    return sum + (saleValue - costBasis);
  }, 0);

  // 6. Build HoldingRow for each position
  const holdingRows: HoldingRow[] = positions.map((p) => {
    const price = p.current_price ?? p.avg_price;
    const marketValue = p.quantity * price;
    const costBasis = p.quantity * p.avg_price;
    const gainLoss = marketValue - costBasis;
    const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
    const pct = totalActiveValue > 0 && !p.sold
      ? (marketValue / totalActiveValue) * 100
      : 0;

    return {
      id: p.id,
      ticker: p.ticker,
      name: p.name,
      asset_type: p.asset_type,
      chart_var: p.chart_var,
      shares: p.quantity,
      currency: p.currency,
      avg_price: p.avg_price,
      cost_basis: costBasis,
      current_price: price,
      market_value: marketValue,
      gain_loss: gainLoss,
      gain_loss_pct: gainLossPct,
      pct,
      sold: p.sold,
    };
  });

  // 7. KPIs
  const kpis: HoldingKpis = {
    total_holdings_value: totalActiveValue,
    unrealized_pl: unrealizedPl,
    realized_pl: realizedPl,
    total_pl: unrealizedPl + realizedPl,
    active_count: activePositions.length,
    sold_count: soldPositions.length,
  };

  const response: HoldingsResponse = {
    data: {
      positions: holdingRows,
      kpis,
    },
  };

  return NextResponse.json(response, { status: 200 });
}
