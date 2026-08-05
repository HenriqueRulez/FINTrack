import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  TransactionUpdateSchema,
  computeTotal,
} from "@/lib/validations/transactions";
import { getFxOnDate } from "@/lib/yahoo-finance/client";
import { ledgerErrorFor } from "@/lib/portfolio/write-guard";
import type { TransactionRow as LedgerRow } from "@/lib/portfolio/derive";
import type { Tables, TablesUpdate } from "@/types/database";

const SELECT_COLUMNS =
  "id, date, ticker, type, qty, price, currency, fx, fee, total, label";

// Linha completa necessária para merge + validação de ledger.
const FULL_COLUMNS =
  "id, date, ticker, type, qty, price, currency, fx, fee, total, label, created_at";

type FullRow = Pick<
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
  | "created_at"
>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

// Mapeia uma linha completa para a forma que o guard de ledger consome.
function toLedgerRow(r: FullRow): LedgerRow {
  return {
    id: r.id,
    date: r.date,
    ticker: r.ticker,
    type: r.type,
    qty: r.qty,
    price: r.price,
    fx: r.fx,
    fee: r.fee,
    created_at: r.created_at,
  };
}

// PATCH /api/transactions/[id] — actualiza uma transação buy/sell.
// Recaptura fx se a data/moeda mudarem; recomputa total; valida oversell.
export async function PATCH(request: NextRequest, ctx: Ctx) {
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

  // 3. id do path
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // 4. Validação Zod (parcial)
  const body = await request.json().catch(() => null);
  const parsed = TransactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const patch = parsed.data;

  // 5. Carrega todas as linhas do user (para merge + validação de ledger)
  const { data: rows, error: rowsErr } = await supabase
    .from("transactions")
    .select(FULL_COLUMNS)
    .eq("user_id", user.id);
  if (rowsErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const all = (rows ?? []) as FullRow[];
  const current = all.find((r) => r.id === id);
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 6. Valores resultantes (patch sobre o existente). current.type é `string`;
  // o guard runtime prova buy/sell, logo o cast a seguir é seguro (excluir dois
  // literais de `string` não estreita para a união, daí o cast explícito).
  const rawType = patch.type ?? current.type;
  if (rawType !== "buy" && rawType !== "sell") {
    return NextResponse.json(
      { error: "Só transações buy/sell são suportadas nesta rota" },
      { status: 422 }
    );
  }
  const txType: "buy" | "sell" = rawType as "buy" | "sell";
  const merged = {
    date: patch.date ?? current.date,
    ticker: patch.ticker ?? current.ticker ?? "",
    type: txType,
    qty: patch.qty ?? current.qty ?? 0,
    price: patch.price ?? current.price ?? 0,
    currency: patch.currency ?? current.currency,
    fee: patch.fee ?? current.fee,
    label: patch.label !== undefined ? patch.label : current.label,
  };

  // 7. fx: recaptura só se data ou moeda mudaram; senão preserva o capturado.
  let fx = current.fx;
  if (patch.date !== undefined || patch.currency !== undefined) {
    const captured = await getFxOnDate(merged.currency, merged.date);
    if (captured === null) {
      return NextResponse.json(
        {
          error: `Não foi possível capturar o câmbio ${merged.currency}→EUR em ${merged.date}`,
        },
        { status: 502 }
      );
    }
    fx = captured;
  }

  // 8. Total recomputado no servidor
  const total = computeTotal(merged.type, merged.qty, merged.price, merged.fee);

  // 9. Guard de oversell: valida o ledger com a linha-alvo substituída.
  const candidateSet: LedgerRow[] = all.map((r) =>
    r.id === id
      ? {
          id: r.id,
          date: merged.date,
          ticker: merged.ticker,
          type: merged.type,
          qty: merged.qty,
          price: merged.price,
          fx,
          fee: merged.fee,
          created_at: r.created_at,
        }
      : toLedgerRow(r)
  );
  const ledgerError = ledgerErrorFor(candidateSet);
  if (ledgerError) {
    return NextResponse.json({ error: ledgerError }, { status: 422 });
  }

  // 10. Update — user_id sempre da sessão
  const updatePayload: TablesUpdate<"transactions"> = {
    date: merged.date,
    ticker: merged.ticker,
    type: merged.type,
    qty: merged.qty,
    price: merged.price,
    currency: merged.currency,
    fx,
    fee: merged.fee,
    total,
    label: merged.label ?? null,
    updated_at: new Date().toISOString(),
  };

  // Cast necessário: postgrest-js v2 infere `never` no payload de update sem o
  // marcador __InternalSupabase na Database type (database.ts mantido à mão).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updErr } = await (supabase as any)
    .from("transactions")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(SELECT_COLUMNS)
    .single();

  if (updErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ data: updated }, { status: 200 });
}

// DELETE /api/transactions/[id] — remove uma transação, bloqueando se apagar uma
// compra que suporta uma venda posterior (oversell resultante).
export async function DELETE(request: NextRequest, ctx: Ctx) {
  void request;
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

  // 3. id do path
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // 4. Carrega todas as linhas para validar o ledger resultante
  const { data: rows, error: rowsErr } = await supabase
    .from("transactions")
    .select(FULL_COLUMNS)
    .eq("user_id", user.id);
  if (rowsErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const all = (rows ?? []) as FullRow[];
  if (!all.some((r) => r.id === id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 5. Guard: ledger sem a linha removida não pode ter oversell
  const remaining = all.filter((r) => r.id !== id).map(toLedgerRow);
  const ledgerError = ledgerErrorFor(remaining);
  if (ledgerError) {
    return NextResponse.json(
      { error: `Não pode apagar: ${ledgerError}` },
      { status: 422 }
    );
  }

  // 6. Delete — user_id sempre da sessão
  const { error: delErr } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (delErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ data: { id } }, { status: 200 });
}
