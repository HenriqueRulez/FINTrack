import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { ChartQuerySchema } from "@/lib/validations/portfolio";
import { buildPortfolioChart } from "@/lib/portfolio/chart-data";
import type { TransactionRow } from "@/lib/portfolio/derive";

// Colunas do ledger (selecção explícita, não select("*")).
const LEDGER_COLUMNS = "id, date, ticker, type, qty, price, fx, fee, created_at";

// ---------------------------------------------------------------------------
// GET /api/portfolio/chart?tf=1D|1W|1M|3M|YTD|1Y|ALL  — A-02
// I/O só; a matemática diária (carry-forward, invested a partir da 1ª compra)
// vive em chart-series.ts, orquestrada por buildPortfolioChart.
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
  const rl = rateLimit(`portfolio:chart:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validação Zod do tf
  const { searchParams } = new URL(request.url);
  const parsed = ChartQuerySchema.safeParse({
    tf: searchParams.get("tf") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { tf } = parsed.data;

  // 4. Ledger do utilizador (user_id da sessão)
  const { data, error: dbError } = await supabase
    .from("transactions")
    .select(LEDGER_COLUMNS)
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const rows: TransactionRow[] = data ?? [];

  // 5. Série diária (I/O + matemática pura via helper partilhado)
  let series;
  try {
    series = await buildPortfolioChart(rows, tf);
  } catch {
    return NextResponse.json({ error: "Price provider error" }, { status: 502 });
  }

  return NextResponse.json({ data: series }, { status: 200 });
}
