import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Semeador/limpador de estado do ledger para os specs E2E. Fala DIRECTAMENTE com
// o PostgREST do Supabase usando o access token do PRÓPRIO utilizador de teste
// (role `authenticated`, com GRANT via migration 0011 + RLS a limitar às linhas
// dele). Isto permite wipe e seed em BULK (uma só requisição cada), IGNORANDO a
// API do Next — e com ela o rate limit "transactions:write" (30/60s) que forçava
// a espera de ~61s no wipe antigo (csv-import). Cada spec estabelece o SEU
// baseline determinístico no beforeAll sem depender de um seed global que outro
// spec apaga, e sem esperas.
//
// Nota factual (2026-08-10): a SUPABASE_SERVICE_ROLE_KEY presente em .env.local é
// INVÁLIDA para este projecto (PostgREST devolve 401 "Invalid API key"), por isso
// NÃO se usa service role aqui — usa-se o token do utilizador de teste, que é
// suficiente (RLS scoping) e valida a credencial de teste ao mesmo tempo.
//
// Só corre localmente: os specs @authed não correm no CI (smoke público, sem
// secrets — decisão AC3 fica com o utilizador).

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

let sessionPromise: Promise<{ sb: SupabaseClient; uid: string }> | null = null;

// Autentica o utilizador de teste (signInWithPassword) UMA vez por processo e
// devolve o cliente já com sessão + o user_id. Duplica como verificação da
// credencial: se E2E_EMAIL/E2E_PASSPHRASE estiverem erradas, falha alto aqui.
async function session(): Promise<{ sb: SupabaseClient; uid: string }> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSPHRASE;
    if (!SUPABASE_URL || !ANON_KEY) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY em falta — " +
          "necessários para semear o ledger E2E. Defina-os em .env.local."
      );
    }
    if (!email || !password) {
      throw new Error(
        "E2E_EMAIL e/ou E2E_PASSPHRASE não definidas (ver .env.test/.env.test.local)."
      );
    }
    const sb = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      throw new Error(
        `Login do utilizador de teste falhou (seed do ledger): ${error?.message ?? "sem user"}`
      );
    }
    return { sb, uid: data.user.id };
  })();
  return sessionPromise;
}

export async function getTestUserId(): Promise<string> {
  return (await session()).uid;
}

export interface LedgerSeedRow {
  date: string; // ISO 'YYYY-MM-DD'
  ticker: string | null;
  type: "buy" | "sell" | "cash" | "conv" | "div" | "int";
  qty: number | null;
  price: number | null;
  currency: "EUR" | "USD" | "GBP";
  fx: number;
  fee: number;
  total: number;
  label: string | null;
}

// Apaga TODAS as transacções do utilizador de teste numa única operação DELETE
// (RLS + filtro por user_id) — sem N pedidos, sem rate limit, sem espera.
export async function wipeLedger(): Promise<number> {
  const { sb, uid } = await session();
  const { data, error } = await sb
    .from("transactions")
    .delete()
    .eq("user_id", uid)
    .select("id");
  if (error) throw new Error(`wipeLedger falhou: ${error.message}`);
  return data?.length ?? 0;
}

// Insere as linhas indicadas (com user_id do utilizador de teste) numa só operação.
export async function seedLedger(rows: LedgerSeedRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { sb, uid } = await session();
  const payload = rows.map((r) => ({ ...r, user_id: uid, source: "manual" as const }));
  const { error } = await sb.from("transactions").insert(payload);
  if (error) throw new Error(`seedLedger falhou: ${error.message}`);
}

// Baseline determinístico por spec: limpa e (opcionalmente) semeia. Sem argumento
// deixa o ledger vazio.
export async function resetLedger(rows: LedgerSeedRow[] = []): Promise<void> {
  await wipeLedger();
  await seedLedger(rows);
}
