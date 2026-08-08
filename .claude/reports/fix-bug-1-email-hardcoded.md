# Relatório de Implementação — Fix BUG-1 / FIN-8 (email hardcoded no bundle)

**Plano:** N/A — bug-fix directo do orquestrador
**Working Item:** `.issues/details/BUG-1-email-hardcoded-passphrase.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings/erros
**Migration:** N/A — sem alterações de schema

## Ficheiros Criados

- `src/lib/validations/auth.ts` — schema Zod `LoginSchema` (`{ passphrase: string min 1 }`) + type `LoginInput`
- `src/app/api/auth/login/route.ts` — rota `POST /api/auth/login`: rate limit por IP → Zod safeParse → `signInWithPassword` via server client; email lido de env server-only

## Ficheiros Modificados

- `src/app/(auth)/passphrase/page.tsx` — removido o email hardcoded, o import e a instância do client Supabase browser; `handleSubmit` passa a fazer `fetch("/api/auth/login", ...)`. Markup/classes/textos preservados exactamente. Estados `error`/`loading` e `router.push("/dashboard")` + `router.refresh()` mantidos.
- `.env.example` — documentada `AUTH_OWNER_EMAIL` (server-only, sem `NEXT_PUBLIC_`)
- `.env.local` — adicionada `AUTH_OWNER_EMAIL=owner@fintrack.local` para dev
- `SECURITY_FINDINGS.md` — M-01 movido de Abertos para Resolvidos (atribuído a BUG-1/FIN-8, 2026-08-08); contadores do resumo actualizados (Médio: 1→0 abertos, 2→3 resolvidos; Total: 12→11 abertos, 9→10 resolvidos)

## Tarefas Implementadas

- [x] T1 — Rota `POST /api/auth/login` server-side com ordem de segurança FINTrack
- [x] T2 — `passphrase/page.tsx` passa a chamar a rota via fetch, sem email nem client Supabase
- [x] T3 — `AUTH_OWNER_EMAIL` em `.env.example` e `.env.local`
- [x] T4 — M-01 marcado Resolvido em `SECURITY_FINDINGS.md`

## Decisões

- **Localização da rota:** `src/app/api/auth/login/route.ts` (não `api/auth/route.ts`) — namespace explícito para futuras rotas de auth (ex.: logout).
- **Ordem de segurança adaptada:** a ordem canónica é `getUser → rateLimit → Zod → BD`. Aqui a rota é **pública** (o utilizador ainda não tem sessão — o `getUser()` seria sempre nulo e não faz sentido como gate). Substituí o passo 1 por rate limit **por IP** (`x-forwarded-for` → `x-real-ip` → `"unknown"`), limite 10/min, para travar brute-force de passphrase. Seguem-se Zod safeParse (422) e o `signInWithPassword`.
- **Email server-only:** `process.env.AUTH_OWNER_EMAIL || "owner@fintrack.local"`. O literal só existe no código do servidor (route handler), logo não vai para o bundle do browser. O fallback evita quebrar dev se a env faltar.
- **Cookies da sessão:** o `createClient` de `src/lib/supabase/server.ts` escreve os cookies via `cookieStore.set` — em Route Handlers isto é permitido (ao contrário de Server Components), portanto `signInWithPassword` na rota persiste a sessão SSR. O `router.refresh()` no cliente força o middleware a reavaliar a sessão.
- **Respostas:** 200 `{ ok: true }` em sucesso (email nunca devolvido); 401 `{ error: "Unauthorized" }` em credenciais inválidas; 422 em JSON inválido ou Zod falhado; 429 em rate limit.

## Self-check (resultados factuais)

- `npm run typecheck` → **zero erros**
- `npm run lint` → **zero warnings/erros**
- `grep -rn "owner@fintrack" src/` → única ocorrência em `src/app/api/auth/login/route.ts:39` (fallback server-only). **Nenhum Client Component** contém o email. Confirmado.

## Notas para o QA

- O login continua single-user: email fixo (via env) + passphrase por `signInWithPassword`. Fluxo funcional inalterado do ponto de vista do utilizador.
- A rota é pública por natureza (pré-sessão); o gate é rate limit por IP (10/min), não `getUser`. Um teste de brute-force pode observar 429 após 10 tentativas no mesmo minuto/IP.
- Achado aceite A-01 (mensagem "Palavra-passe incorrecta" revela existência do utilizador) mantém-se por design single-user — a rota devolve 401 genérico, e o Client Component continua a mostrar o mesmo texto.
- Não corri o smoke E2E (AC "smoke E2E verde") — fora do meu escopo de Engineer; deixo a verificação funcional no browser para o QA.
