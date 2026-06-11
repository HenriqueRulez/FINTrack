// Sandbox Fable 5 — /performance: resultados de trading derivados do ledger.
// withSparklines liga o histórico real de 30 dias (só nesta página).

import { getF5Overview } from "@/lib/fable5/overview";
import { PerformanceView } from "@/components/fable5/performance/performance-view";

export const dynamic = "force-dynamic";

export default async function Fable5PerformancePage() {
  const overview = await getF5Overview({ withSparklines: true });
  return <PerformanceView overview={overview} />;
}
