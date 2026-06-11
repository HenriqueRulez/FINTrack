// Sandbox Fable 5 — sem auth por decisão explícita do utilizador
// (CLAUDE.md §Instruções para Fable 5); rate limit por IP substitui o passo
// de auth. O ledger é a source of truth: toda a mutação é validada em
// memória (validateLedger) antes de persistir — vendas nunca podem exceder
// a quantidade detida à data.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getQuote } from "@/lib/yahoo-finance/client";
import { formatLedgerError, validateLedger } from "@/lib/fable5/ledger";
import { getFxOnDate } from "@/lib/fable5/history";
import { getPricesFor } from "@/lib/fable5/prices";
import {
  f5Table,
  type F5Asset,
  type F5Transaction,
} from "@/lib/fable5/types";
import {
  F5BulkDeleteSchema,
  F5TransactionSchema,
} from "@/lib/validations/fable5";

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

// Taxa moeda→EUR à data da transacção (close histórico com carry-forward);
// fallback = taxa actual do cache de preços; último recurso = 1.
async function captureFxToEur(
  supabase: unknown,
  currency: string,
  date: string
): Promise<number> {
  if (currency === "EUR") return 1;
  const pair = `${currency}EUR=X`;
  const historical = await getFxOnDate(pair, date);
  if (historical !== null) return historical;
  const current = await getPricesFor(supabase, [pair], { staleMinutes: 60 });
  return current[pair]?.price ?? 1;
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(`f5:tx:read:${clientIp(request)}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const [txRes, assetRes] = await Promise.all([
    f5Table(supabase, "f5_transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }) as Promise<{
      data: F5Transaction[] | null;
      error: { message: string } | null;
    }>,
    f5Table(supabase, "f5_assets").select("*") as Promise<{
      data: F5Asset[] | null;
      error: { message: string } | null;
    }>,
  ]);
  if (txRes.error || assetRes.error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const assets = Object.fromEntries(
    (assetRes.data ?? []).map((a) => [a.ticker, a])
  );
  return NextResponse.json(
    { data: txRes.data ?? [], assets },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(`f5:write:${clientIp(request)}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = F5TransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const input = parsed.data;

  const supabase = await createClient();

  // Asset: existente ou novo (novo exige asset_type + validação Yahoo)
  const { data: asset } = (await f5Table(supabase, "f5_assets")
    .select("*")
    .eq("ticker", input.ticker)
    .maybeSingle()) as { data: F5Asset | null };

  if (!asset) {
    if (!input.asset_type) {
      return NextResponse.json(
        { error: "asset_type é obrigatório para um ticker novo" },
        { status: 422 }
      );
    }
    const quote = await getQuote(input.ticker);
    if (!quote) {
      return NextResponse.json(
        { error: "Ticker não encontrado no Yahoo Finance" },
        { status: 422 }
      );
    }
    const { error: assetError } = await f5Table(supabase, "f5_assets").insert({
      ticker: input.ticker,
      asset_type: input.asset_type,
      name: quote.name,
    });
    if (assetError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    // Semear o cache persistente com a cotação validada
    await f5Table(supabase, "f5_price_cache").upsert(
      {
        ticker: input.ticker,
        price: quote.price,
        currency: quote.currency,
        name: quote.name,
        fetched_at: new Date(quote.fetchedAt).toISOString(),
      },
      { onConflict: "ticker" }
    );
  }

  const fx_to_eur = await captureFxToEur(supabase, input.currency, input.date);

  // Validação do ledger com a transacção candidata em memória
  const { data: tickerTxs } = (await f5Table(supabase, "f5_transactions")
    .select("*")
    .eq("ticker", input.ticker)) as { data: F5Transaction[] | null };

  const candidate: F5Transaction = {
    id: "candidate",
    date: input.date,
    ticker: input.ticker,
    type: input.type,
    qty: input.qty,
    price: input.price,
    currency: input.currency,
    fee: input.fee,
    fx_to_eur,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const errors = validateLedger([...(tickerTxs ?? []), candidate]);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: formatLedgerError(errors[0]) },
      { status: 422 }
    );
  }

  const { data, error } = (await f5Table(supabase, "f5_transactions")
    .insert({
      date: input.date,
      ticker: input.ticker,
      type: input.type,
      qty: input.qty,
      price: input.price,
      currency: input.currency,
      fee: input.fee,
      fx_to_eur,
      notes: input.notes ?? null,
    })
    .select()
    .single()) as {
    data: F5Transaction | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}

// Bulk delete (edit mode da tabela): body { ids: [...] }.
// Revalida o ledger completo — apagar compras pode invalidar vendas.
export async function DELETE(request: NextRequest) {
  const rl = rateLimit(`f5:write:${clientIp(request)}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = F5BulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const ids = new Set(parsed.data.ids);

  const supabase = await createClient();
  const { data: allTxs, error: loadError } = (await f5Table(
    supabase,
    "f5_transactions"
  ).select("*")) as {
    data: F5Transaction[] | null;
    error: { message: string } | null;
  };
  if (loadError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const remaining = (allTxs ?? []).filter((t) => !ids.has(t.id));
  const errors = validateLedger(remaining);
  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: `Remoção inválida: ${formatLedgerError(errors[0])}`,
      },
      { status: 422 }
    );
  }

  const { error } = await f5Table(supabase, "f5_transactions")
    .delete()
    .in("id", [...ids]);
  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json({ data: { deleted: ids.size } }, { status: 200 });
}
