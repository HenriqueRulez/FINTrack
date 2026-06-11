// Sandbox Fable 5 — leitura das definições (singleton f5_settings, id=1).
// Server-only: usado por API routes e Server Components.

import { f5Table, type F5Settings } from "./types";

export const F5_DEFAULT_SETTINGS: F5Settings = {
  base_currency: "EUR",
  refresh_interval_minutes: 15,
};

export async function getF5Settings(supabase: unknown): Promise<F5Settings> {
  const { data } = (await f5Table(supabase, "f5_settings")
    .select("base_currency, refresh_interval_minutes")
    .eq("id", 1)
    .maybeSingle()) as { data: F5Settings | null };

  return data ?? F5_DEFAULT_SETTINGS;
}
