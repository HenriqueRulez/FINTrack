// Sandbox Fable 5 — /transactions: o ledger (source of truth).
// Server Component carrega transacções + assets directamente do banco;
// a vista client trata de filtros/sort/CRUD e faz router.refresh() após
// cada mutação.

import { createClient } from "@/lib/supabase/server";
import { f5Table, type F5Asset, type F5Transaction } from "@/lib/fable5/types";
import { TransactionsView } from "@/components/fable5/transactions/transactions-view";

export const dynamic = "force-dynamic";

export default async function Fable5TransactionsPage() {
  const supabase = await createClient();

  const [txRes, assetRes] = await Promise.all([
    f5Table(supabase, "f5_transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }) as Promise<{
      data: F5Transaction[] | null;
    }>,
    f5Table(supabase, "f5_assets").select("*") as Promise<{
      data: F5Asset[] | null;
    }>,
  ]);

  const assets = Object.fromEntries(
    (assetRes.data ?? []).map((a) => [a.ticker, a])
  );

  return (
    <TransactionsView transactions={txRes.data ?? []} assets={assets} />
  );
}
