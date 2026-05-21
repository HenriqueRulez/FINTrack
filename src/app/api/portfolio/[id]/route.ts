import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { PositionSchema } from "@/lib/validations/portfolio";
import type { Tables, TablesUpdate } from "@/types/database";

const UuidSchema = z.string().uuid("ID inválido");

// PATCH /api/portfolio/[id] — actualiza uma posição existente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const rl = rateLimit(`portfolio:write:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3a. Validar UUID do parâmetro
  const { id } = await params;
  const idParsed = UuidSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 3b. Validação do body com schema parcial
  const body = await request.json().catch(() => null);
  const PartialSchema = PositionSchema.partial().refine(
    (val) => Object.keys(val).length > 0,
    { message: "Pelo menos um campo é necessário" }
  );
  const parsed = PartialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // 4. Update — filtrar por id AND user_id da sessão (RLS garante, mas filtro explícito é boa prática)
  // name e current_price são geridos automaticamente pelo servidor — ignorar mesmo que o cliente os envie
  const updatePayload: TablesUpdate<"portfolio_positions"> = {
    ...(parsed.data.ticker !== undefined && { ticker: parsed.data.ticker }),
    ...(parsed.data.asset_type !== undefined && { asset_type: parsed.data.asset_type }),
    ...(parsed.data.quantity !== undefined && { quantity: parsed.data.quantity }),
    ...(parsed.data.avg_price !== undefined && { avg_price: parsed.data.avg_price }),
    ...(parsed.data.currency !== undefined && { currency: parsed.data.currency }),
    ...(parsed.data.exchange !== undefined && { exchange: parsed.data.exchange }),
    ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
  };

  // Type cast necessário: postgrest-js v2 requer __InternalSupabase na Database type
  // para inferência completa do update(); o updatePayload é construído com TablesUpdate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("portfolio_positions")
    .update(updatePayload)
    .eq("id", idParsed.data)
    .eq("user_id", user.id)
    .select()
    .single() as { data: Tables<"portfolio_positions"> | null; error: { message: string } | null };

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

// DELETE /api/portfolio/[id] — remove uma posição
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const rl = rateLimit(`portfolio:write:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validar UUID
  const { id } = await params;
  const idParsed = UuidSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  // 4. Delete — filtrar por id AND user_id da sessão
  const { error } = await supabase
    .from("portfolio_positions")
    .delete()
    .eq("id", idParsed.data)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
