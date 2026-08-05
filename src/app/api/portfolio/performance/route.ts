import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { derivePortfolio, type TransactionRow } from "@/lib/portfolio/derive";
import { yahooPriceProvider } from "@/lib/portfolio/prices";

// Colunas do ledger (selecção explícita, não select("*")).
const LEDGER_COLUMNS = "id, date, ticker, type, qty, price, fx, fee, created_at";

// ---------------------------------------------------------------------------
// Types — contrato de resposta (campos monetários em EUR). Uma linha por ticker,
// agregando TODAS as entradas desse ticker no ledger (activas + fechadas).
// ---------------------------------------------------------------------------

export interface TradeRow {
  ticker: string;
  name: string;
  chartVar: string;
  assetType: "stock" | "etf" | "crypto" | "other";
  status: "active" | "closed";
  holdDays: number;
  investedEur: number; // costBasisEur (0 se fechada)
  realizedEur: number;
  unrealizedEur: number;
  totalEur: number; // realizedEur + unrealizedEur
  roi: number; // totalEur / investedEur × 100 (0 se investedEur == 0)
}

export interface PerformanceStats {
  winRate: number; // % de trades com totalEur > 0
  realizedPct: number; // |Σrealized| / (|Σreal| + |Σunreal|) × 100
  unrealizedPct: number; // |Σunrealized| / (|Σreal| + |Σunreal|) × 100
  avgHoldAll: number; // média de holdDays das activas (arredondada)
  avgHoldWin: number; // idem, activas com totalEur > 0
  avgHoldLose: number; // idem, activas com totalEur < 0
  activeCount: number;
  closedCount: number;
}

export interface PerformanceResponse {
  data: {
    trades: TradeRow[];
    stats: PerformanceStats;
  };
}

function roundAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

// ---------------------------------------------------------------------------
// GET /api/portfolio/performance
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
  const rl = rateLimit(`portfolio:performance:${user.id}`, 30, 60_000);
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

  // 4. Deriva holdings (preços live convertidos a EUR)
  let holdings;
  try {
    holdings = (await derivePortfolio(rows, yahooPriceProvider)).holdings;
  } catch {
    return NextResponse.json({ error: "Price provider error" }, { status: 502 });
  }

  // 5. Uma TradeRow por ticker (activas + fechadas)
  const trades: TradeRow[] = holdings.map((h) => {
    const investedEur = h.costBasisEur; // já 0 quando fechada
    const totalEur = h.realizedEur + h.unrealizedEur;
    const roi = investedEur > 0 ? (totalEur / investedEur) * 100 : 0;
    return {
      ticker: h.ticker,
      name: h.name,
      chartVar: h.chartVar,
      assetType: h.assetType,
      status: h.status,
      holdDays: h.holdDays,
      investedEur,
      realizedEur: h.realizedEur,
      unrealizedEur: h.unrealizedEur,
      totalEur,
      roi,
    };
  });

  // 6. Estatísticas agregadas
  const active = trades.filter((t) => t.status === "active");
  const closed = trades.filter((t) => t.status === "closed");

  const winners = trades.filter((t) => t.totalEur > 0);
  const winRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0;

  const sumRealized = trades.reduce((s, t) => s + Math.abs(t.realizedEur), 0);
  const sumUnrealized = trades.reduce((s, t) => s + Math.abs(t.unrealizedEur), 0);
  const splitDenom = sumRealized + sumUnrealized;
  const realizedPct = splitDenom > 0 ? (sumRealized / splitDenom) * 100 : 0;
  const unrealizedPct = splitDenom > 0 ? (sumUnrealized / splitDenom) * 100 : 0;

  const stats: PerformanceStats = {
    winRate,
    realizedPct,
    unrealizedPct,
    avgHoldAll: roundAvg(active.map((t) => t.holdDays)),
    avgHoldWin: roundAvg(active.filter((t) => t.totalEur > 0).map((t) => t.holdDays)),
    avgHoldLose: roundAvg(active.filter((t) => t.totalEur < 0).map((t) => t.holdDays)),
    activeCount: active.length,
    closedCount: closed.length,
  };

  const response: PerformanceResponse = { data: { trades, stats } };
  return NextResponse.json(response, { status: 200 });
}
