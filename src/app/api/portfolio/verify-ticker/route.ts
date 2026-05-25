import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getQuote } from "@/lib/yahoo-finance/client";

const VerifySchema = z.object({
  ticker: z.string().min(1).max(20).trim(),
});

// GET /api/portfolio/verify-ticker?ticker=AAPL
// Verifica se um ticker existe no Yahoo Finance e retorna nome + preço actual.
// Autenticado, com rate limit de 20 verificações por minuto por utilizador.
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

  // 2. Rate limit — 20 verificações por minuto
  const rl = rateLimit(`verify-ticker:${user.id}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validação Zod do query param
  const tickerParam = request.nextUrl.searchParams.get("ticker");
  const parsed = VerifySchema.safeParse({ ticker: tickerParam });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // 4. Consulta Yahoo Finance (server-only — nunca importar em Client Components)
  const tickerUpper = parsed.data.ticker.toUpperCase();
  const quote = await getQuote(tickerUpper);

  if (!quote) {
    return NextResponse.json(
      {
        error:
          "Ticker não encontrado no Yahoo Finance. Verifique o símbolo e tente novamente.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json(
    {
      data: {
        ticker: tickerUpper,
        name: quote.name,
        price: quote.price,
        currency: quote.currency,
      },
    },
    { status: 200 }
  );
}
