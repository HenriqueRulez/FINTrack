import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  TransactionCreateSchema,
  computeTotal,
} from "@/lib/validations/transactions";
import { getFxOnDate } from "@/lib/yahoo-finance/client";
import { ledgerErrorFor } from "@/lib/portfolio/write-guard";
import type { TransactionRow as LedgerRow } from "@/lib/portfolio/derive";
import type { Tables, TablesInsert } from "@/types/database";

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

// Colunas necessárias à validação de ledger (oversell) — inclui created_at.
const LEDGER_COLUMNS = "id, date, ticker, type, qty, price, fx, fee, created_at";

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

// POST /api/transactions — cria uma transação buy/sell no ledger.
// fx capturado à data (server), total recomputado (server), oversell rejeitado.
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const rl = rateLimit(`transactions:write:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validação Zod
  const body = await request.json().catch(() => null);
  const parsed = TransactionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { date, ticker, type, qty, price, currency, fee, label } = parsed.data;

  // 4. Captura do câmbio moeda→EUR à data do trade (F-01). Sem câmbio fiável não
  // se persiste — número silenciosamente errado é pior que erro visível (A-03).
  const fx = await getFxOnDate(currency, date);
  if (fx === null) {
    return NextResponse.json(
      { error: `Não foi possível capturar o câmbio ${currency}→EUR em ${date}` },
      { status: 502 }
    );
  }

  // 5. Total recomputado no servidor (nunca do cliente — A-01)
  const total = computeTotal(type, qty, price, fee);

  // 6. Guard de oversell: valida o ledger com a nova transação incluída.
  const { data: existing, error: exErr } = await supabase
    .from("transactions")
    .select(LEDGER_COLUMNS)
    .eq("user_id", user.id);
  if (exErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const candidate: LedgerRow = {
    id: "candidate",
    date,
    ticker,
    type,
    qty,
    price,
    fx,
    fee,
    created_at: new Date().toISOString(),
  };
  const ledgerError = ledgerErrorFor([
    ...((existing ?? []) as LedgerRow[]),
    candidate,
  ]);
  if (ledgerError) {
    return NextResponse.json({ error: ledgerError }, { status: 422 });
  }

  // 7. Insert — user_id sempre da sessão
  const insertPayload: TablesInsert<"transactions"> = {
    user_id: user.id,
    date,
    ticker,
    type,
    qty,
    price,
    currency,
    fx,
    fee,
    total,
    label: label ?? null,
  };

  const { data: created, error: insErr } = await supabase
    .from("transactions")
    .insert(insertPayload)
    .select(SELECT_COLUMNS)
    .single();

  if (insErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ data: created as TransactionRow }, { status: 201 });
}
