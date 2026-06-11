// Sandbox Fable 5 — sem auth por decisão explícita do utilizador
// (CLAUDE.md §Instruções para Fable 5); as regras "auth primeiro" do projecto
// raiz não se aplicam aqui. Rate limit por IP substitui o passo de auth.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getF5Settings } from "@/lib/fable5/settings";
import { f5Table } from "@/lib/fable5/types";
import { F5SettingsSchema } from "@/lib/validations/fable5";

export interface F5CacheStats {
  cached_tickers: number;
  oldest_fetched_at: string | null;
}

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`f5:settings:read:${ip}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const settings = await getF5Settings(supabase);

  const { data: cacheRows } = (await f5Table(supabase, "f5_price_cache")
    .select("fetched_at")
    .order("fetched_at", { ascending: true })) as {
    data: Array<{ fetched_at: string }> | null;
  };

  const cache: F5CacheStats = {
    cached_tickers: cacheRows?.length ?? 0,
    oldest_fetched_at: cacheRows?.[0]?.fetched_at ?? null,
  };

  return NextResponse.json({ data: { settings, cache } }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`f5:write:${ip}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = F5SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const supabase = await createClient();

  const { data, error } = (await f5Table(supabase, "f5_settings")
    .upsert(
      { id: 1, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select("base_currency, refresh_interval_minutes")
    .single()) as {
    data: { base_currency: string; refresh_interval_minutes: number } | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}
