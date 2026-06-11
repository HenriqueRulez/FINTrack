// Sandbox Fable 5 — layout Fase 2: sidebar à esquerda + topbar, como o raiz.
// Path público de propósito (fora da lista PROTECTED do middleware).

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { f5Table } from "@/lib/fable5/types";
import { F5Sidebar } from "@/components/fable5/sidebar";
import { F5Topbar } from "@/components/fable5/topbar";

export const metadata: Metadata = {
  title: "FINTrack — Fable 5",
  description: "Sandbox de portfólio stocks/ETFs/criptos do Projeto Fable 5",
};

export default async function Fable5Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Contagem para o badge da sidebar + sync da topbar; as mutações fazem
  // router.refresh(), que re-renderiza o layout — nunca ficam obsoletos.
  const [txRes, priceRes] = await Promise.all([
    f5Table(supabase, "f5_transactions").select("id", {
      count: "exact",
      head: true,
    }) as Promise<{ count: number | null }>,
    f5Table(supabase, "f5_price_cache")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1) as Promise<{ data: Array<{ fetched_at: string }> | null }>,
  ]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-screen bg-background relative">
      <div className="terminal-grid" aria-hidden="true" />

      <F5Sidebar txCount={txRes.count ?? 0} />

      <div className="flex flex-col min-h-screen relative z-[1]">
        <F5Topbar pricesFetchedAt={priceRes.data?.[0]?.fetched_at ?? null} />
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
