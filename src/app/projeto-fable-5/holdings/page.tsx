// Sandbox Fable 5 — /holdings: estado actual do portfólio, derivado do
// ledger de transacções (read-only; escrita só em /transactions).

import { getF5Overview } from "@/lib/fable5/overview";
import { HoldingsView } from "@/components/fable5/holdings/holdings-view";

export const dynamic = "force-dynamic";

export default async function Fable5HoldingsPage() {
  const overview = await getF5Overview();
  return <HoldingsView overview={overview} />;
}
