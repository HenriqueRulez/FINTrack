// Sandbox Fable 5 — sem auth por decisão explícita do utilizador
// (CLAUDE.md §Instruções para Fable 5); rate limit por IP substitui o passo
// de auth. PATCH/DELETE revalidam o ledger em memória antes de persistir —
// editar/apagar uma compra que invalidaria vendas posteriores é rejeitado.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { F5TransactionUpdateSchema } from "@/lib/validations/fable5";

const IdSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const rl = rateLimit(`f5:write:${clientIp(request)}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await context.params;
  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 422 });
  }

  const body = await request.json().catch(() => null);
  const parsed = F5TransactionUpdateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.success ? undefined : parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  const supabase = await createClient();

  const { data: existing } = (await f5Table(supabase, "f5_transactions")
    .select("*")
    .eq("id", parsedId.data)
    .maybeSingle()) as { data: F5Transaction | null };
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const merged: F5Transaction = {
    ...existing,
    ...parsed.data,
    notes: parsed.data.notes !== undefined ? (parsed.data.notes ?? null) : existing.notes,
    updated_at: new Date().toISOString(),
  };

  // Ticker novo → exige asset_type + validação Yahoo + criar asset
  if (merged.ticker !== existing.ticker) {
    const { data: asset } = (await f5Table(supabase, "f5_assets")
      .select("*")
      .eq("ticker", merged.ticker)
      .maybeSingle()) as { data: F5Asset | null };
    if (!asset) {
      if (!parsed.data.asset_type) {
        return NextResponse.json(
          { error: "asset_type é obrigatório para um ticker novo" },
          { status: 422 }
        );
      }
      const quote = await getQuote(merged.ticker);
      if (!quote) {
        return NextResponse.json(
          { error: "Ticker não encontrado no Yahoo Finance" },
          { status: 422 }
        );
      }
      const { error: assetError } = await f5Table(supabase, "f5_assets").insert(
        {
          ticker: merged.ticker,
          asset_type: parsed.data.asset_type,
          name: quote.name,
        }
      );
      if (assetError) {
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    }
  }

  // Recapturar FX se a moeda ou a data mudaram
  if (
    merged.currency !== existing.currency ||
    merged.date !== existing.date
  ) {
    merged.fx_to_eur = await captureFxToEur(
      supabase,
      merged.currency,
      merged.date
    );
  }

  // Validar o ledger dos tickers afectados com a edição aplicada em memória
  const tickers = [...new Set([existing.ticker, merged.ticker])];
  const { data: affectedTxs, error: loadError } = (await f5Table(
    supabase,
    "f5_transactions"
  )
    .select("*")
    .in("ticker", tickers)) as {
    data: F5Transaction[] | null;
    error: { message: string } | null;
  };
  if (loadError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const candidateLedger = (affectedTxs ?? []).map((t) =>
    t.id === merged.id ? merged : t
  );
  const errors = validateLedger(candidateLedger);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: `Edição inválida: ${formatLedgerError(errors[0])}` },
      { status: 422 }
    );
  }

  const { data, error } = (await f5Table(supabase, "f5_transactions")
    .update({
      date: merged.date,
      ticker: merged.ticker,
      type: merged.type,
      qty: merged.qty,
      price: merged.price,
      currency: merged.currency,
      fee: merged.fee,
      fx_to_eur: merged.fx_to_eur,
      notes: merged.notes,
      updated_at: merged.updated_at,
    })
    .eq("id", parsedId.data)
    .select()
    .single()) as {
    data: F5Transaction | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const rl = rateLimit(`f5:write:${clientIp(request)}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await context.params;
  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 422 });
  }

  const supabase = await createClient();

  const { data: existing } = (await f5Table(supabase, "f5_transactions")
    .select("*")
    .eq("id", parsedId.data)
    .maybeSingle()) as { data: F5Transaction | null };
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Apagar uma compra pode invalidar vendas posteriores — revalidar o ticker
  const { data: tickerTxs, error: loadError } = (await f5Table(
    supabase,
    "f5_transactions"
  )
    .select("*")
    .eq("ticker", existing.ticker)) as {
    data: F5Transaction[] | null;
    error: { message: string } | null;
  };
  if (loadError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const remaining = (tickerTxs ?? []).filter((t) => t.id !== existing.id);
  const errors = validateLedger(remaining);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: `Remoção inválida: ${formatLedgerError(errors[0])}` },
      { status: 422 }
    );
  }

  const { error } = await f5Table(supabase, "f5_transactions")
    .delete()
    .eq("id", parsedId.data);
  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json({ data: { id: existing.id } }, { status: 200 });
}
