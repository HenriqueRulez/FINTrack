import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { HoldingsQuerySchema } from "@/lib/validations/portfolio";
import { derivePortfolio, type TransactionRow } from "@/lib/portfolio/derive";
import { yahooPriceProvider } from "@/lib/portfolio/prices";

// Colunas do ledger necessárias à derivação (selecção explícita, não select("*")).
const LEDGER_COLUMNS = "id, date, ticker, type, qty, price, fx, fee, created_at";

// ---------------------------------------------------------------------------
// Types — contrato de resposta (todos os campos monetários em EUR)
// ---------------------------------------------------------------------------

export interface HoldingRow {
  ticker: string;
  name: string;
  assetType: "stock" | "etf" | "crypto" | "other";
  chartVar: string;
  shares: number;
  currency: string;
  avgCostEur: number;
  costBasisEur: number;
  currentPriceEur: number | null;
  marketValueEur: number;
  unrealizedEur: number;
  unrealizedPct: number;
  realizedEur: number;
  pctOfPortfolio: number;
  status: "active" | "closed";
  priceMissing: boolean;
}

export interface HoldingKpis {
  totalValueEur: number;
  holdingsValueEur: number;
  unrealizedEur: number;
  realizedEur: number;
  totalPlEur: number;
  activeCount: number;
  soldCount: number;
  hasPriceGaps: boolean;
}

export interface HoldingsResponse {
  data: {
    positions: HoldingRow[];
    kpis: HoldingKpis;
  };
}

// ---------------------------------------------------------------------------
// GET /api/portfolio/holdings?showSold=true|false
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
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
  const rl = rateLimit(`portfolio:holdings:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validação Zod (só showSold é relevante; currency/sort eram do mock antigo)
  const { searchParams } = new URL(request.url);
  const parsed = HoldingsQuerySchema.safeParse({
    showSold: searchParams.get("showSold") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { showSold } = parsed.data;

  // 4. Ledger do utilizador — fonte única de verdade (user_id da sessão)
  const { data, error: dbError } = await supabase
    .from("transactions")
    .select(LEDGER_COLUMNS)
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const rows: TransactionRow[] = data ?? [];

  // 5. Deriva holdings + sumário (preços live convertidos a EUR)
  let portfolio;
  try {
    portfolio = await derivePortfolio(rows, yahooPriceProvider);
  } catch {
    return NextResponse.json({ error: "Price provider error" }, { status: 502 });
  }
  const { holdings, summary } = portfolio;

  // 6. Mapeia DerivedHolding → HoldingRow (subconjunto directo)
  const allRows: HoldingRow[] = holdings.map((h) => ({
    ticker: h.ticker,
    name: h.name,
    assetType: h.assetType,
    chartVar: h.chartVar,
    shares: h.shares,
    currency: h.currency,
    avgCostEur: h.avgCostEur,
    costBasisEur: h.costBasisEur,
    currentPriceEur: h.currentPriceEur,
    marketValueEur: h.marketValueEur,
    unrealizedEur: h.unrealizedEur,
    unrealizedPct: h.unrealizedPct,
    realizedEur: h.realizedEur,
    pctOfPortfolio: h.pctOfPortfolio,
    status: h.status,
    priceMissing: h.priceMissing,
  }));

  // showSold=false ⇒ lista só activas; KPIs reflectem SEMPRE o conjunto todo.
  const positions = showSold
    ? allRows
    : allRows.filter((h) => h.status === "active");

  const soldCount = allRows.filter((h) => h.status === "closed").length;

  const kpis: HoldingKpis = {
    totalValueEur: summary.totalValueEur,
    holdingsValueEur: summary.totalValueEur,
    unrealizedEur: summary.unrealizedEur,
    realizedEur: summary.realizedEur,
    totalPlEur: summary.unrealizedEur + summary.realizedEur,
    activeCount: summary.openPositions,
    soldCount,
    hasPriceGaps: summary.hasPriceGaps,
  };

  const response: HoldingsResponse = { data: { positions, kpis } };
  return NextResponse.json(response, { status: 200 });
}
