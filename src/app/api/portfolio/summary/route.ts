import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { derivePortfolio, type TransactionRow } from "@/lib/portfolio/derive";
import { yahooPriceProvider } from "@/lib/portfolio/prices";
import { computeDayPnlEur } from "@/lib/portfolio/day-pnl";

// Colunas do ledger (selecção explícita, não select("*")).
const LEDGER_COLUMNS = "id, date, ticker, type, qty, price, fx, fee, created_at";

// ---------------------------------------------------------------------------
// Types — contrato de resposta (campos monetários em EUR)
// ---------------------------------------------------------------------------

export interface PortfolioSummary {
  totalValueEur: number;
  deltaAbsoluteEur: number;
  deltaPercent: number;
  investedCapitalEur: number;
  openPositions: number;
  unrealizedEur: number;
  realizedEur: number;
  dayPnlEur: number | null; // null quando não há prevClose para nenhuma activa
}

// ---------------------------------------------------------------------------
// GET /api/portfolio/summary
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  void request;
  const supabase = await createClient();

  // 1. Auth — sempre primeiro
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

  // 3. Ledger do utilizador (user_id da sessão)
  const { data, error: dbError } = await supabase
    .from("transactions")
    .select(LEDGER_COLUMNS)
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const rows: TransactionRow[] = data ?? [];

  // 4. Deriva holdings + sumário (preços live convertidos a EUR)
  let derived;
  try {
    derived = await derivePortfolio(rows, yahooPriceProvider);
  } catch {
    return NextResponse.json({ error: "Price provider error" }, { status: 502 });
  }
  const { holdings, summary } = derived;

  // 5. Day P&L — variação face ao close anterior (helper partilhado; A-03: null
  // quando nenhuma activa tem close anterior, nunca 0 disfarçado de dado real).
  const dayPnlEur = await computeDayPnlEur(holdings);

  const result: PortfolioSummary = {
    totalValueEur: summary.totalValueEur,
    deltaAbsoluteEur: summary.unrealizedEur,
    deltaPercent: summary.unrealizedPct,
    investedCapitalEur: summary.totalCostEur,
    openPositions: summary.openPositions,
    unrealizedEur: summary.unrealizedEur,
    realizedEur: summary.realizedEur,
    dayPnlEur,
  };

  return NextResponse.json({ data: result }, { status: 200 });
}
