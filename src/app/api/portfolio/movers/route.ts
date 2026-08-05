import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getHistory } from "@/lib/yahoo-finance/client";
import { derivePortfolio, type TransactionRow } from "@/lib/portfolio/derive";
import { yahooPriceProvider } from "@/lib/portfolio/prices";
import type { MoverItem } from "@/components/dashboard/TopMoversSection";

// Colunas do ledger (selecção explícita, não select("*")).
const LEDGER_COLUMNS = "id, date, ticker, type, qty, price, fx, fee, created_at";

// ---------------------------------------------------------------------------
// GET /api/portfolio/movers — top 5 posições ACTIVAS por |variação|
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
  const rl = rateLimit(`portfolio:movers:${user.id}`, 30, 60_000);
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

  const active = holdings.filter(
    (h) => h.status === "active" && h.currentPriceEur !== null
  );
  if (active.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  // 5. Enriquece com sparkline (últimos 7 closes — só forma visual)
  const enriched: MoverItem[] = await Promise.all(
    active.map(async (h) => {
      const history = await getHistory(h.ticker);
      const sparkline = history.slice(-7).map((p) => p.close);
      return {
        ticker: h.ticker,
        name: h.name,
        price: h.currentPriceEur as number,
        changePercent: Math.round(h.unrealizedPct * 100) / 100,
        sparkline: sparkline.length >= 2 ? sparkline : undefined,
      };
    })
  );

  // 6. Top 5 por |variação|
  const sorted = enriched
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 5);

  return NextResponse.json({ data: sorted }, { status: 200 });
}
