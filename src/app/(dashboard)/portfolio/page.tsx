import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortfolioClient } from "@/components/portfolio/portfolio-client";
import type { Position } from "@/components/portfolio/position-table";

export default async function PortfolioPage() {
  const supabase = await createClient();

  // Garantir que o utilizador está autenticado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Buscar posições iniciais directamente via Supabase server client
  // Inclui current_price e price_updated_at para o cache de 15 minutos
  const { data: positions } = await supabase
    .from("portfolio_positions")
    .select("id, ticker, name, asset_type, quantity, avg_price, currency, current_price, price_updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return <PortfolioClient initialPositions={(positions as Position[]) ?? []} />;
}
