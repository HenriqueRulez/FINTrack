// Sandbox Fable 5 — sem auth por decisão explícita do utilizador
// (CLAUDE.md §Instruções para Fable 5); rate limit por IP substitui o passo
// de auth. Gestão de metadados de assets: corrigir a classe (stock/etf/crypto)
// de um ticker existente e remover assets órfãos (sem transacções).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { f5Table, type F5Asset } from "@/lib/fable5/types";
import { F5AssetUpdateSchema } from "@/lib/validations/fable5";

const TickerSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Z0-9.\-=]+$/i, "Ticker inválido")
  .transform((t) => t.toUpperCase());

type RouteContext = { params: Promise<{ ticker: string }> };

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const rl = rateLimit(`f5:write:${clientIp(request)}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { ticker } = await context.params;
  const parsedTicker = TickerSchema.safeParse(decodeURIComponent(ticker));
  if (!parsedTicker.success) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 422 });
  }

  const body = await request.json().catch(() => null);
  const parsed = F5AssetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const supabase = await createClient();
  const { data, error } = (await f5Table(supabase, "f5_assets")
    .update({ asset_type: parsed.data.asset_type })
    .eq("ticker", parsedTicker.data)
    .select()
    .maybeSingle()) as {
    data: F5Asset | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const rl = rateLimit(`f5:write:${clientIp(request)}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { ticker } = await context.params;
  const parsedTicker = TickerSchema.safeParse(decodeURIComponent(ticker));
  if (!parsedTicker.success) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 422 });
  }

  const supabase = await createClient();

  // Só assets órfãos podem ser removidos (a FK de f5_transactions também
  // bloquearia, mas o 409 explícito dá uma mensagem clara).
  const { count } = (await f5Table(supabase, "f5_transactions")
    .select("id", { count: "exact", head: true })
    .eq("ticker", parsedTicker.data)) as { count: number | null };

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `${parsedTicker.data} tem ${count} transacção(ões) — remova-as primeiro`,
      },
      { status: 409 }
    );
  }

  const { data, error } = (await f5Table(supabase, "f5_assets")
    .delete()
    .eq("ticker", parsedTicker.data)
    .select("ticker")
    .maybeSingle()) as {
    data: { ticker: string } | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data }, { status: 200 });
}
