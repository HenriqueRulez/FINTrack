import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import type { Tables } from "@/types/database";

// Colunas devolvidas ao cliente — selecção explícita (evita select("*"), B-07/B-10)
type TransactionRow = Pick<
  Tables<"transactions">,
  | "id"
  | "date"
  | "ticker"
  | "type"
  | "qty"
  | "price"
  | "currency"
  | "fx"
  | "fee"
  | "total"
  | "label"
>;

const SELECT_COLUMNS =
  "id, date, ticker, type, qty, price, currency, fx, fee, total, label";

// GET /api/transactions — lista o ledger de transações do utilizador autenticado
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
  const rl = rateLimit(`transactions:read:${user.id}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Query — user_id sempre da sessão; ordem por data desc
  const { data, error } = await supabase
    .from("transactions")
    .select(SELECT_COLUMNS)
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ data: (data ?? []) as TransactionRow[] }, {
    status: 200,
  });
}
