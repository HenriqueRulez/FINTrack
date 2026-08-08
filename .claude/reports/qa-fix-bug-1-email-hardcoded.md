# QA Report — Fix BUG-1 / FIN-8 (email hardcoded no bundle)

**Working Item:** `.issues/details/BUG-1-email-hardcoded-passphrase.md`
**Relatório do Engineer:** `.claude/reports/fix-bug-1-email-hardcoded.md`
**Testes Playwright criados:** `tests/e2e/fix-email-hardcoded-passphrase.spec.ts`
**Status Geral:** ⚠️ PARCIAL

## Gate Determinístico (fonte: flags do Engineer + CI — o QA não executa)

| Verificação    | Fonte                 | Status                                   |
| -------------- | --------------------- | ----------------------------------------- |
| Typecheck/Lint | Relatório do Engineer | ✅ sem flags — "zero erros" / "zero warnings" |
| Migration      | Relatório do Engineer | N/A — sem alterações de schema            |
| Unit tests     | CI (a cada push)      | Validados pelo CI — não corridos pelo QA  |

## Verificação Visual — Chrome Extension

**Servidor dev:** ✅ Online (http://localhost:3000) — arrancado e parado pelo QA (owned)
**Chrome Extension:** ⚠️ INDISPONÍVEL — `tabs_context_mcp` retornou "Browser extension is not connected" em duas tentativas. Nenhuma verificação visual/interactiva no browser real foi possível.

Compensação: os CAs 1-3 são fluxos funcionais/auth, não puramente visuais — foram verificados via Playwright (browser real headless) e via chamadas HTTP directas à rota, com evidência factual reproduzida abaixo. Ainda assim, por regra do protocolo QA, a ausência da Chrome Extension limita o status máximo a **PARCIAL**.

| CA   | Tipo | Verificação | Evidência | Status |
| ---- | ---- | ----------- | --------- | ------ |
| CA1-4 | Visual/interactivo (Chrome) | Não corrido — extensão indisponível | — | ⚠️ CHROME_SKIP |

## Testes E2E — Playwright

| Teste                                                                 | Ficheiro                                       | Resultado |
| ---------------------------------------------------------------------- | ----------------------------------------------- | --------- |
| passphrase incorrecta mantém em /passphrase e mostra erro              | `tests/e2e/fix-email-hardcoded-passphrase.spec.ts` | ✅ PASS |
| resposta de /api/auth/login nunca inclui o email do dono                | `tests/e2e/fix-email-hardcoded-passphrase.spec.ts` | ✅ PASS |
| HTML servido em /passphrase não contém o email do dono                  | `tests/e2e/fix-email-hardcoded-passphrase.spec.ts` | ✅ PASS |
| smoke › redireciona para passphrase se não autenticado                 | `tests/e2e/smoke.spec.ts`                        | ✅ PASS |
| smoke › passphrase page renderiza correctamente                        | `tests/e2e/smoke.spec.ts`                        | ✅ PASS |
| smoke › dashboard carrega após autenticação (@authed)                  | `tests/e2e/smoke.spec.ts`                        | ✅ PASS |

```
Running 7 tests using 1 worker

  ✓  1 [setup] › tests\e2e\auth.setup.ts:15:6 › autenticar utilizador de teste (3.3s)
  ✓  2 [chromium] › fix-email-hardcoded-passphrase.spec.ts › passphrase incorrecta mantém em /passphrase e mostra erro (764ms)
  ✓  3 [chromium] › fix-email-hardcoded-passphrase.spec.ts › resposta de /api/auth/login nunca inclui o email do dono (271ms)
  ✓  4 [chromium] › fix-email-hardcoded-passphrase.spec.ts › HTML servido em /passphrase não contém o email do dono (586ms)
  ✓  5 [chromium] › smoke.spec.ts › redireciona para passphrase se não autenticado (410ms)
  ✓  6 [chromium] › smoke.spec.ts › passphrase page renderiza correctamente (541ms)
  ✓  7 [chromium] › smoke.spec.ts › dashboard carrega após autenticação @authed (867ms)

  7 passed (10.8s)
```

## Nota metodológica — credencial de teste para CA1

`E2E_EMAIL` (`.env.test`) e `E2E_PASSPHRASE` (`.env.test.local`) autenticam uma **conta de teste dedicada** (`e2e@fintrack.local`), **diferente** da conta real usada pelo formulário (`AUTH_OWNER_EMAIL` = `owner@fintrack.local`). Isto está documentado explicitamente em `tests/e2e/auth.setup.ts:7-13`: o login E2E normal faz `signInWithPassword` directo via `@supabase/ssr`, **contornando a UI/rota**, precisamente porque o formulário tem o email fixo no servidor e só serve a conta real.

Não tenho a passphrase real de `owner@fintrack.local` — não existe em nenhum ficheiro de ambiente do projecto (correctamente: seria um segredo do único utilizador humano da app).

Para verificar CA1 (login válido → sessão → acesso a `/dashboard`) com prova factual em vez de assumir, apontei temporariamente `AUTH_OWNER_EMAIL=e2e@fintrack.local` em `.env.local`, reiniciei o dev server, e exerci o caminho de sucesso real da rota `POST /api/auth/login` com a credencial E2E válida via `curl`:

- `POST /api/auth/login` com passphrase correcta → `200 {"ok":true}` + cookie `sb-...-auth-token` definido
- `GET /dashboard` com esse cookie → `200 OK` (sem redirect)

De seguida revertisse `.env.local` para `AUTH_OWNER_EMAIL=owner@fintrack.local` (valor original, confirmado por `git status --short .env.local` sem diff — ficheiro fora do git) e reiniciei o servidor. Repeti a verificação de login inválido (`401 {"error":"Unauthorized"}`) e a ausência do email no bundle **com a configuração original restaurada**.

Esta é evidência funcional real do caminho de sucesso da rota (mesma lógica de código, mesmo mecanismo de cookies via `createClient` server-side), mas **não é** uma verificação de UI no browser real (bloqueada pela indisponibilidade da Chrome Extension) nem usa a credencial real do dono da app (que não existe em nenhum ficheiro acessível ao QA).

## Verificações de Segurança

| Verificação                       | Ficheiro                              | Status |
| ---------------------------------- | -------------------------------------- | ------ |
| auth.getUser() primeiro            | `src/app/api/auth/login/route.ts`      | N/A — rota pública de login pré-sessão; `getUser()` seria sempre nulo. Desvio documentado e justificado no relatório do Engineer, substituído por rate limit por IP como gate. Aceite. |
| Retorna 401 se sem utilizador       | `src/app/api/auth/login/route.ts`      | ✅ confirmado por curl: passphrase errada → `401 {"error":"Unauthorized"}` |
| Rate limit aplicado                | `src/app/api/auth/login/route.ts`      | ✅ `rateLimit()` é o primeiro passo (linha 17), antes de Zod e antes de `signInWithPassword` |
| Zod safeParse antes do banco        | `src/app/api/auth/login/route.ts`      | ✅ `LoginSchema.safeParse` (linha 30) corre antes de `signInWithPassword` (linha 41) |
| user_id da sessão (nunca do body)  | `src/app/api/auth/login/route.ts`      | N/A — rota de login, não recebe nem escreve `user_id` |
| Client Component sem lib server-only | `src/app/(auth)/passphrase/page.tsx` | ✅ confirmado por leitura: sem imports de `src/lib/anthropic`, `src/lib/yahoo-finance`, nem de nenhum client Supabase — só `fetch("/api/auth/login")` |

## Critérios de Aceite

| CA  | Descrição                                              | Ferramenta        | Status  | Evidência |
| --- | -------------------------------------------------------- | ------------------ | ------- | --------- |
| CA1 | Login válido autentica e redirecciona para /dashboard, sessão persiste | curl (rota real, credencial E2E temporariamente aliasada — ver nota metodológica) | ✅ PASS (com ressalva) | `POST /api/auth/login` → `200 {"ok":true}` + cookie; `GET /dashboard` com cookie → `200`. Não verificado no browser real (Chrome indisponível) nem com a passphrase real do dono (inexistente nos ficheiros do QA). |
| CA2 | Passphrase errada mantém em /passphrase e mostra "Palavra-passe incorrecta." | Playwright + curl | ✅ PASS | Teste `passphrase incorrecta mantém em /passphrase e mostra erro` PASS; curl confirma `401 {"error":"Unauthorized"}` no servidor com a config original (`AUTH_OWNER_EMAIL=owner@fintrack.local`) |
| CA3 | Rota protegida sem sessão redirecciona para /passphrase | Playwright + curl | ✅ PASS | `smoke.spec.ts › redireciona para passphrase se não autenticado` PASS; curl a `/dashboard` sem cookies → `307` com `location: /passphrase` |
| CA4 | Email não aparece no bundle/HTML servido ao browser | curl + Grep sobre HTML/JS descarregados | ✅ PASS | `fintrack.local` ausente de: HTML de `/passphrase`, HTML de `/`, todos os chunks JS não-`node_modules` servidos pela página (`_1anvha4._.js`, `turbopack-_08bm286._.js`, `_07_hyoe._.js`, `_03pc92s._.js`), e ambas as respostas JSON da rota (`{"ok":true}` / `{"error":"Unauthorized"}`). Único local com o literal `owner@fintrack.local`: `src/app/api/auth/login/route.ts:39` (server-only), confirmado também por `grep` do Engineer no self-check. |

## Problemas Encontrados

- **MÉDIO** — Chrome Extension indisponível durante este ciclo QA (`Browser extension is not connected`, confirmado em duas tentativas). Nenhum CA foi verificado interactivamente num browser real com a extensão; a verificação funcional foi feita via Playwright (browser headless real) e chamadas HTTP directas, mas isto não substitui integralmente o protocolo Chrome Extension exigido. Regista-se conforme protocolo: status geral limitado a PARCIAL, e adiciona-se item em `.issues/bugs.md`.
- **BAIXO / nota, não bloqueante** — CA1 não foi verificado com a credencial real de `owner@fintrack.local` (não existe em nenhum ficheiro acessível), nem no browser real. A verificação usada (alias temporário `AUTH_OWNER_EMAIL=e2e@fintrack.local` + curl, revertido de seguida) prova a lógica do caminho de sucesso, mas não é equivalente a um teste UI completo com a conta real. Recomenda-se, se possível, criar uma segunda variável de ambiente `E2E_OWNER_PASSPHRASE`-like só para CI/QA local que aponte para a conta real de forma controlada, ou aceitar este método como prática padrão documentada.

Item registado em `.issues/bugs.md` conforme protocolo:

```
| BUG-2 | Verificação visual pendente — fix-bug-1-email-hardcoded: CAs não verificados via Chrome Extension [CA1, CA2, CA3, CA4]; resolver com /verify-feature fix-bug-1-email-hardcoded com Chrome Extension activa | Média | Aberto | auth | - |
```
