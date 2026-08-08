# Relatório de Segurança — logout-settings-page (TD-3 / FIN-4)

**Engineer Report:** _inexistente_ — a pipeline desta feature parou na Fase 1 (só há `design-` e `frontend-` reports); nunca correram SM/Engineer. O código está implementado e em `main`. Auditado directamente sobre o escopo fornecido pelo orquestrador.
**Working Item:** `.issues/details/TD-3-verificacao-logout-settings-page.md`
**SECURITY_FINDINGS.md:** actualizado ✅ (registada auditoria sem novos achados)

## Ficheiros Auditados

- `src/components/settings/logout-button.tsx` (Client Component)
- `src/app/(dashboard)/settings/page.tsx` (Server Component)
- Contexto de suporte: `src/lib/auth.ts` (`requireUser`), `src/lib/supabase/client.ts`

## Resultados das Verificações Automáticas

| Verificação                | Resultado                            |
| -------------------------- | ------------------------------------ |
| Secrets expostos em client | ✅ Nenhum (`grep ANTHROPIC_API_KEY\|SERVICE_ROLE_KEY src/app` → sem matches) |
| Imports server-only no Client Component | ✅ Nenhum (`grep anthropic\|yahoo-finance\|supabase/server logout-button.tsx` → sem matches) |
| Routes sem auth.getUser    | N/A — esta feature não adiciona API routes |
| Routes sem rateLimit       | N/A — esta feature não adiciona API routes |
| npm audit (job CI "Security audit") | ✅ `success` — run 31262237067 (https://github.com/HenriqueRulez/FINTrack/actions/runs/31262237067/job/93114751359) |

**Nota sobre o run do CI:** o run mais recente é da branch `fix/bug-1-email-hardcoded` (sha `971bbdb`), não de um commit isolado desta feature (que já está em `main`). Esta feature **não altera `package.json`/lockfile**, logo a árvore de dependências é a mesma e o resultado `success` (zero vulnerabilidades high/critical) aplica-se. Não existe run de CI dedicado ao commit da logout-settings-page; registado explicitamente em vez de assumido.

## Análise Manual

### `logout-button.tsx` (Client Component)

- `"use client"` presente. Imports: `useState`, `useRouter`, ícone `LogOut`, `createClient` de `@/lib/supabase/client`, `Button`. **Nenhum import server-only** (`@/lib/anthropic`, `@/lib/yahoo-finance`, `@/lib/supabase/server`). ✅
- Usa o client browser (`createClient` → `createBrowserClient` com só `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`). Sem secrets no bundle. ✅
- `supabase.auth.signOut()` do `@supabase/ssr` (browser client) limpa os cookies de sessão e o storage local; scope global por omissão revoga o refresh token no servidor. Após isso: `router.push("/passphrase")` + `router.refresh()` — o refresh re-executa middleware/server components, que passam a ver `getUser()` sem sessão. Termina a sessão de forma correcta. ✅
- Sem XSS sinks (`dangerouslySetInnerHTML` ausente); texto renderizado em JSX é auto-escapado. ✅
- Sem `console.log`/`console.error` a expor dados do utilizador. ✅

**Observação (informacional, não é achado de segurança):** o retorno de `signOut()` não é verificado — se a chamada falhar (rede), o handler redirecciona na mesma e `isPending` fica preso a `true`. É robustez/UX, não uma vulnerabilidade: a protecção de rotas é feita server-side por `getUser()` no middleware, e o app é single-user em dispositivo pessoal. Não registado em `SECURITY_FINDINGS.md`.

### `settings/page.tsx` (Server Component)

- Primeira operação é `await requireUser()`. `requireUser()` usa `supabase.auth.getUser()` (**não** `getSession()`) e faz `redirect("/passphrase")` se `error || !user`. Gate de autenticação correcto. ✅
- Mostra `user.email` e `user.id` (UUID) — dados da **própria conta** exibidos ao **próprio dono autenticado**. App single-user; não é vazamento de dados de terceiros. UUID não é segredo. Aceitável. ✅
- Componente server que renderiza texto estático; não passa nada server-only para o cliente. ✅
- Sem secrets, sem `NEXT_PUBLIC_` indevido, sem XSS. ✅

## Achados desta Feature

### CRÍTICO

_Nenhum._

### ALTO

_Nenhum._

### MÉDIO

_Nenhum._

### BAIXO / INFORMACIONAL

_Nenhum registado._ (Uma observação de robustez sobre `signOut()` sem verificação de erro — ver acima — não constitui achado de segurança.)

## Achados Resolvidos nesta Feature

_Nenhum._ A feature não toca em código de achados abertos (`rate-limit`, `yahoo-finance`, `import`, `price_cache`, `database.ts`).

## Estado de SECURITY_FINDINGS.md após actualização

| Categoria | Abertos | Resolvidos | Aceites |
| --------- | ------- | ---------- | ------- |
| Crítico   | 0       | 0          | 0       |
| Alto      | 0       | 0          | 0       |
| Médio     | 0       | 3          | 0       |
| Baixo     | 11      | 7          | 3       |
| **Total** | **11**  | **10**     | **3**   |

_Contagens inalteradas — auditoria sem novos achados nem resoluções._
