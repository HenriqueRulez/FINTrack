import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { LoginSchema } from "@/lib/validations/auth";

// POST /api/auth/login
// Login single-user por passphrase. O email do dono vive numa env server-only
// (AUTH_OWNER_EMAIL) — nunca vai para o bundle do browser. A sessão é escrita
// em cookies pelo server client (fluxo SSR). Rate limit por IP porque a rota
// é pública (o utilizador ainda não está autenticado).
export async function POST(request: NextRequest) {
  // 1. Rate limit — 10 tentativas por minuto por IP (rota pública, sem sessão)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(`auth-login:${ip}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 2. Validação Zod do body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 422 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // 3. Autenticação — email server-only, nunca exposto ao cliente
  const email = process.env.AUTH_OWNER_EMAIL || "owner@fintrack.local";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.passphrase,
  });

  if (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sucesso — a sessão já foi escrita nos cookies pelo server client.
  // Nunca devolver o email na resposta.
  return NextResponse.json({ ok: true }, { status: 200 });
}
