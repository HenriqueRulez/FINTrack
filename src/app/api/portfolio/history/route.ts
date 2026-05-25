import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { getHistory } from "@/lib/yahoo-finance/client";

const HistoryQuerySchema = z.object({
  ticker: z
    .string()
    .min(1, "Ticker é obrigatório")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[A-Z0-9.\-]+$/i, "Ticker inválido — use apenas letras, números, ponto e hífen"),
});

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

  // 2. Rate limit — 60 req/min por utilizador
  const rl = rateLimit(`portfolio:history:${user.id}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validação Zod do query param ticker
  const { searchParams } = new URL(request.url);
  const parsed = HistoryQuerySchema.safeParse({ ticker: searchParams.get("ticker") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // 4. Obter histórico (cache 1h implementado em getHistory())
  const data = await getHistory(parsed.data.ticker);

  // CA-10: retornar sempre 200, mesmo array vazio — a UI trata ausência de dados com "—"
  return NextResponse.json({ data }, { status: 200 });
}
