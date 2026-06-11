// Sandbox Fable 5 — Definições: moeda base, intervalo de refresh e estado do
// cache de preços. Sem autenticação por decisão explícita do utilizador.

import { createClient } from "@/lib/supabase/server";
import { getF5Settings } from "@/lib/fable5/settings";
import { f5Table, type F5Asset } from "@/lib/fable5/types";
import { F5SettingsForm } from "@/components/fable5/settings-form";
import {
  AssetsManager,
  type AssetWithCount,
} from "@/components/fable5/assets-manager";

export const dynamic = "force-dynamic";

export default async function Fable5SettingsPage() {
  const supabase = await createClient();
  const settings = await getF5Settings(supabase);

  const [cacheRes, assetRes, txRes] = await Promise.all([
    f5Table(supabase, "f5_price_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: true }) as Promise<{
      data: Array<{ fetched_at: string }> | null;
    }>,
    f5Table(supabase, "f5_assets").select("*").order("ticker") as Promise<{
      data: F5Asset[] | null;
    }>,
    f5Table(supabase, "f5_transactions").select("ticker") as Promise<{
      data: Array<{ ticker: string }> | null;
    }>,
  ]);
  const cacheRows = cacheRes.data;

  const txCounts = new Map<string, number>();
  for (const t of txRes.data ?? []) {
    txCounts.set(t.ticker, (txCounts.get(t.ticker) ?? 0) + 1);
  }
  const assets: AssetWithCount[] = (assetRes.data ?? []).map((a) => ({
    ...a,
    txCount: txCounts.get(a.ticker) ?? 0,
  }));

  const cachedTickers = cacheRows?.length ?? 0;
  const oldest = cacheRows?.[0]?.fetched_at
    ? new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(cacheRows[0].fetched_at))
    : "—";

  return (
    <>
      <section>
        <h1 className="text-2xl font-medium">Definições</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuração do sandbox Fable 5.
        </p>
      </section>

      <F5SettingsForm settings={settings} />

      <section className="max-w-md rounded-lg border border-border/40 bg-card p-5">
        <h2 className="text-sm uppercase tracking-wide text-muted-foreground">
          Assets
        </h2>
        <div className="mt-3">
          <AssetsManager assets={assets} />
        </div>
      </section>

      <section className="max-w-md rounded-lg border border-border/40 bg-card p-5">
        <h2 className="text-sm uppercase tracking-wide text-muted-foreground">
          Cache de preços
        </h2>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tickers em cache</dt>
            <dd className="tabular-nums">{cachedTickers}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Cotação mais antiga</dt>
            <dd className="tabular-nums">{oldest}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          O cache persiste no Postgres (tabela f5_price_cache) e sobrevive a
          restarts do servidor — só tickers fora da janela voltam ao Yahoo.
        </p>
      </section>

      <p className="max-w-md text-xs text-muted-foreground">
        Nota: este sandbox não tem autenticação — o path /projeto-fable-5 é
        público de propósito, por decisão registada no CLAUDE.md.
      </p>
    </>
  );
}
