import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { ImportRequestSchema } from "@/lib/validations/import";
import { parseCsv } from "@/lib/import/csv";
import {
  mapTrading212,
  candidateToDisplay,
  Trading212FormatError,
  type ImportCandidate,
  type MapResult,
} from "@/lib/import/trading212";
import { ledgerErrorFor } from "@/lib/portfolio/write-guard";
import type { TransactionRow as LedgerRow } from "@/lib/portfolio/derive";
import type { TablesInsert } from "@/types/database";

// Estado de cada linha na pré-visualização (contrato fixo — a UI depende disto).
type RowStatus = "new" | "duplicate" | "ignored" | "error";

interface ResponseRow {
  status: RowStatus;
  reason?: string;
  date: string;
  type: "buy" | "sell" | "cash" | "div" | null;
  ticker: string | null;
  label: string | null;
  qty: number | null;
  price: number | null;
  currency: string | null;
  total: number | null;
}

interface Summary {
  total: number;
  new: number;
  duplicate: number;
  ignored: number;
  error: number;
}

// Colunas do ledger necessárias ao guard de oversell (inclui created_at).
const LEDGER_COLUMNS = "id, date, ticker, type, qty, price, fx, fee, created_at";

// POST /api/transactions/import — importa o export CSV do Trading212.
// dryRun (default): classifica cada linha (new/duplicate/ignored/error) sem
// gravar. dryRun=false: grava apenas as linhas novas, em lote.
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth — sempre primeiro
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit — chave própria (volume alto por pedido), não partilha
  // transactions:write.
  const rl = rateLimit(`transactions:import:${user.id}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validação Zod (inclui o cap de ~2MB) antes de qualquer acesso à BD
  const body = await request.json().catch(() => null);
  const parsed = ImportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { csv, dryRun } = parsed.data;

  // 4. Parse + mapeamento
  let mapped: MapResult[];
  try {
    mapped = mapTrading212(parseCsv(csv));
  } catch (e) {
    const message =
      e instanceof Trading212FormatError ? e.message : "CSV inválido ou ilegível.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // 5. Uma única query aos external_ids já existentes do utilizador → duplicados
  const { data: existingExt, error: extErr } = await supabase
    .from("transactions")
    .select("external_id")
    .eq("user_id", user.id)
    .not("external_id", "is", null);
  if (extErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const existingSet = new Set(
    ((existingExt ?? []) as { external_id: string | null }[])
      .map((r) => r.external_id)
      .filter((v): v is string => v !== null)
  );

  // Constrói as linhas de resposta na ordem do ficheiro; classifica novas vs
  // duplicadas (dedupe também dentro do próprio ficheiro).
  const rows: ResponseRow[] = [];
  const newCandidates: ImportCandidate[] = [];
  const seenInFile = new Set<string>();
  const summary: Summary = { total: mapped.length, new: 0, duplicate: 0, ignored: 0, error: 0 };

  for (const m of mapped) {
    if (m.status === "ignored") {
      rows.push({ status: "ignored", reason: m.reason, ...m.display });
      summary.ignored++;
      continue;
    }
    if (m.status === "error") {
      rows.push({ status: "error", reason: m.reason, ...m.display });
      summary.error++;
      continue;
    }
    const c = m.candidate;
    const isDuplicate = existingSet.has(c.external_id) || seenInFile.has(c.external_id);
    seenInFile.add(c.external_id);
    const display = candidateToDisplay(c);
    if (isDuplicate) {
      rows.push({ status: "duplicate", ...display });
      summary.duplicate++;
    } else {
      rows.push({ status: "new", ...display });
      summary.new++;
      newCandidates.push(c);
    }
  }

  // 6. Guard de oversell UMA vez: ledger existente + apenas as candidatas novas
  // buy/sell (as duplicadas já estão no ledger existente).
  const { data: existingLedger, error: ledErr } = await supabase
    .from("transactions")
    .select(LEDGER_COLUMNS)
    .eq("user_id", user.id);
  if (ledErr) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  const newLedgerRows: LedgerRow[] = newCandidates
    .filter((c) => c.type === "buy" || c.type === "sell")
    .map((c, i) => ({
      id: `import-${i}`,
      date: c.date,
      ticker: c.ticker,
      type: c.type,
      qty: c.qty,
      price: c.price,
      fx: c.fx,
      fee: c.fee,
      created_at: new Date(Date.UTC(2000, 0, 1) + i).toISOString(),
    }));
  const ledgerError = ledgerErrorFor([
    ...((existingLedger ?? []) as LedgerRow[]),
    ...newLedgerRows,
  ]);
  if (ledgerError) {
    return NextResponse.json({ error: ledgerError }, { status: 422 });
  }

  // 7. Pré-visualização: nada é gravado
  if (dryRun) {
    return NextResponse.json({ summary, rows }, { status: 200 });
  }

  // 8. Confirmação: grava apenas as novas, em lote, na ordem cronológica.
  if (newCandidates.length === 0) {
    return NextResponse.json(
      { inserted: 0, duplicate: summary.duplicate, summary },
      { status: 200 }
    );
  }

  const ordered = [...newCandidates].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
  const payload: TablesInsert<"transactions">[] = ordered.map((c) => ({
    user_id: user.id,
    date: c.date,
    ticker: c.ticker,
    type: c.type,
    qty: c.qty,
    price: c.price,
    currency: c.currency,
    fx: c.fx,
    fee: c.fee,
    total: c.total,
    label: c.label,
    external_id: c.external_id,
    source: "trading212",
    isin: c.isin,
    withholding_tax: c.withholding_tax,
  }));

  const { data: inserted, error: insErr } = await supabase
    .from("transactions")
    .insert(payload)
    .select("id");

  if (insErr) {
    // Conflito no índice único (corrida entre preview e commit, ou reimport
    // concorrente): o insert em lote é atómico, logo nada foi gravado nesta
    // chamada. Tratar como duplicado, não como 500 — o reimport é idempotente.
    if (insErr.code === "23505") {
      const finalSummary: Summary = {
        ...summary,
        new: 0,
        duplicate: summary.duplicate + newCandidates.length,
      };
      return NextResponse.json(
        { inserted: 0, duplicate: finalSummary.duplicate, summary: finalSummary },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const insertedCount = (inserted ?? []).length;
  const finalSummary: Summary = {
    ...summary,
    new: insertedCount,
    duplicate: summary.duplicate + (newCandidates.length - insertedCount),
  };
  return NextResponse.json(
    { inserted: insertedCount, duplicate: finalSummary.duplicate, summary: finalSummary },
    { status: 200 }
  );
}
