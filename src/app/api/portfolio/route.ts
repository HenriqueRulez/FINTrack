import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getQuotes } from "@/lib/yahoo-finance/client";
import type { Tables, TablesUpdate } from "@/types/database";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// GET /api/portfolio — lista todas as posições do utilizador autenticado
// Actualiza preços em lote para posições com cache expirado (> 15 min ou nunca actualizado)
export async function GET(request: NextRequest) {
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
  const rl = rateLimit(`portfolio:read:${user.id}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Query — type cast necessário: postgrest-js v2 requer __InternalSupabase na Database type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: positions, error } = await (supabase as any)
    .from("portfolio_positions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true }) as {
      data: Tables<"portfolio_positions">[] | null;
      error: { message: string } | null;
    };

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!positions || positions.length === 0) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  // 4. Identificar posições com cache expirado ou nunca actualizado
  const now = Date.now();
  const stalePositions = positions.filter((p) => {
    if (!p.price_updated_at) return true;
    return now - new Date(p.price_updated_at).getTime() > CACHE_TTL_MS;
  });

  if (stalePositions.length > 0) {
    // Agrupar tickers únicos — 1 chamada por ticker único
    const uniqueTickers = [...new Set(stalePositions.map((p) => p.ticker))];
    const quotes = await getQuotes(uniqueTickers);
    const updatedAt = new Date().toISOString();

    // Actualizar posições stale em paralelo
    await Promise.all(
      stalePositions.map(async (p) => {
        const quote = quotes[p.ticker];
        if (!quote) return;

        const updatePayload: TablesUpdate<"portfolio_positions"> = {
          current_price: quote.price,
          price_updated_at: updatedAt,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("portfolio_positions")
          .update(updatePayload)
          .eq("id", p.id)
          .eq("user_id", user.id);
      })
    );

    // Re-fetch posições actualizadas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedPositions, error: refetchError } = await (supabase as any)
      .from("portfolio_positions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }) as {
        data: Tables<"portfolio_positions">[] | null;
        error: { message: string } | null;
      };

    if (refetchError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ data: updatedPositions }, { status: 200 });
  }

  return NextResponse.json({ data: positions }, { status: 200 });
}
