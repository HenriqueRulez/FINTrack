// Sandbox Fable 5 — sem auth por decisão explícita do utilizador
// (CLAUDE.md §Instruções para Fable 5); rate limit por IP substitui o passo
// de auth. Devolve a série completa desde a 1ª transacção — os timeframes
// são filtrados no cliente (mudar timeframe não re-chama o Yahoo).

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getF5ChartSeries } from "@/lib/fable5/chart";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`f5:chart:${ip}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const series = await getF5ChartSeries();
    return NextResponse.json({ data: series }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
