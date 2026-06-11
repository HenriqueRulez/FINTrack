// Sandbox Fable 5 — sem auth por decisão explícita do utilizador
// (CLAUDE.md §Instruções para Fable 5); as regras "auth primeiro" do projecto
// raiz não se aplicam aqui. Rate limit por IP substitui o passo de auth.
// Fase 2: devolve o overview derivado do ledger de transacções.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getF5Overview } from "@/lib/fable5/overview";
import { F5PortfolioQuerySchema } from "@/lib/validations/fable5";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`f5:portfolio:${ip}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = F5PortfolioQuerySchema.safeParse({
    force: request.nextUrl.searchParams.get("force") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const overview = await getF5Overview({ force: parsed.data.force });
    return NextResponse.json({ data: overview }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
