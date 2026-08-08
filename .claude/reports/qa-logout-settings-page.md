# QA Report — Logout na Página de Configurações

**Working Item:** `.issues/details/TD-3-verificacao-logout-settings-page.md`
**Relatório do Engineer:** _inexistente_ — pipeline parou na Fase 1 (só `design-logout-settings-page.md` e `frontend-logout-settings-page.md`). Código já implementado e em `main`; verificado directamente sobre o escopo fornecido pelo orquestrador.
**Testes Playwright criados:** `tests/e2e/logout-settings-page.spec.ts`
**Status Geral:** ⚠️ PARCIAL

## Gate Determinístico (fonte: relatório do Engineer + CI)

| Verificação    | Fonte                                        | Status                                                                              |
| -------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Typecheck/Lint | `frontend-logout-settings-page.md`            | ✅ "Typecheck: Zero erros" / "Lint: Zero erros" (não há relatório de Engineer)       |
| Migration      | N/A                                            | N/A — feature não toca schema                                                        |
| CI (main)      | `gh run list` (verificado factualmente)        | ✅ Últimos 3 runs em `main`: "Auto-merge" success (2026-08-08T14:34, 2026-08-08T13:19) e "CI" success — sem flags de falha reportadas |

## Verificação Visual — Chrome Extension

**Servidor dev:** ✅ Online durante a verificação (arrancado por mim via `npm run dev`, teardown feito no fim — porto 3000 confirmado offline após `taskkill`)
**Chrome Extension:** ❌ Indisponível — `tabs_context_mcp` retornou: "Browser extension is not connected. Please ensure the Claude browser extension is installed and running..."

Todos os CAs desta feature são visuais/funcionais e dependem de verificação real de UI. Sem a extensão, não há evidência visual directa — apenas evidência funcional via Playwright (browser real, headless). Por protocolo, isto limita o status máximo a **PARCIAL**, mesmo com todos os CAs a passar funcionalmente.

| CA   | Tipo   | Verificação          | Evidência              | Status       |
| ---- | ------ | --------------------- | ----------------------- | ------------ |
| CA1  | Visual | Botão visível na página | não verificado por Chrome Ext | ⚠️ CHROME_SKIP |
| CA2  | Funcional | (coberto por Playwright, ver abaixo) | — | — |
| CA3  | Visual | Separação de cards     | não verificado por Chrome Ext | ⚠️ CHROME_SKIP |
| CA4  | Visual | Estado pending do botão | não verificado por Chrome Ext | ⚠️ CHROME_SKIP |

Registado em `.issues/bugs.md` (BUG-3).

## Testes E2E — Playwright

Executados em duas rondas por causa de um achado de metodologia (ver "Problemas Encontrados"): a 1ª ronda com CA2 e CA4 em testes separados falhou por efeito colateral do `signOut(scope=global)` revogar a sessão partilhada; a 2ª ronda (reportada abaixo) combina CA2+CA4 num único teste real de logout, evitando o efeito colateral.

| Teste                                                                                   | Ficheiro                                | Resultado |
| ----------------------------------------------------------------------------------------- | ---------------------------------------- | --------- |
| CA1: botão Terminar sessão visível na página de Configurações                             | `tests/e2e/logout-settings-page.spec.ts` | ✅ PASS   |
| CA3: botão de logout está num card separado das informações de perfil                     | `tests/e2e/logout-settings-page.spec.ts` | ✅ PASS   |
| CA2 + CA4: logout mostra estado pending, termina sessão e bloqueia rotas protegidas       | `tests/e2e/logout-settings-page.spec.ts` | ✅ PASS   |
| smoke › redireciona para passphrase se não autenticado                                    | `tests/e2e/smoke.spec.ts`                | ✅ PASS   |
| smoke › passphrase page renderiza correctamente                                           | `tests/e2e/smoke.spec.ts`                | ✅ PASS   |
| smoke › dashboard carrega após autenticação (@authed)                                     | `tests/e2e/smoke.spec.ts`                | ⚠️ Ver nota — falha só quando corrido **depois** do teste de logout na mesma invocação |

```
Execução combinada (tests/e2e/logout-settings-page.spec.ts + tests/e2e/smoke.spec.ts):
Running 7 tests using 1 worker
  ✓  1 [setup] › autenticar utilizador de teste (1.3s)
  ✓  2 [chromium] › CA1: botão Terminar sessão visível na página de Configurações (647ms)
  ✓  3 [chromium] › CA3: botão de logout está num card separado das informações de perfil (549ms)
  ✓  4 [chromium] › CA2 + CA4: logout mostra estado pending, termina sessão e bloqueia rotas protegidas (2.2s)
  ✓  5 [chromium] › smoke › redireciona para passphrase se não autenticado (392ms)
  ✓  6 [chromium] › smoke › passphrase page renderiza correctamente (420ms)
  ✘  7 [chromium] › smoke › dashboard carrega após autenticação @authed (5.5s)
     Error: expect(page).toHaveURL(/dashboard/) failed
     Received string: "http://localhost:3000/passphrase"
  6 passed, 1 failed

Execução de smoke.spec.ts ISOLADO (prova de que não é regressão):
Running 4 tests using 1 worker
  ✓  1 [setup] › autenticar utilizador de teste (1.2s)
  ✓  2 [chromium] › redireciona para passphrase se não autenticado (443ms)
  ✓  3 [chromium] › passphrase page renderiza correctamente (481ms)
  ✓  4 [chromium] › dashboard carrega após autenticação @authed (915ms)
  4 passed (5.0s)
```

**Explicação factual da falha condicional:** `logout-button.tsx` chama `supabase.auth.signOut()` sem `scope`, que por omissão do SDK Supabase é `scope=global` (confirmado via `page.on("request")`: `POST https://oxcrzaquvjljcyrtekcx.supabase.co/auth/v1/logout?scope=global`). Isto revoga o refresh token no servidor. O `auth.setup.ts` do projecto corre **uma vez por invocação** do Playwright e gera um único `storageState` partilhado por todos os testes dessa run. Quando o teste de logout corre antes do smoke `@authed` na mesma invocação, a sessão partilhada fica revogada no servidor e o smoke test subsequente falha a aceder a `/dashboard`. Isto **não é uma regressão da feature** — é a prova de que CA2 funciona correctamente (a sessão termina mesmo, globalmente, não só no browser local) colidindo com o desenho de `auth.setup.ts` (sessão única partilhada). Confirmado isolando `smoke.spec.ts` sozinho: 4/4 passam.

**Nota para o backlog:** o comando padrão do protocolo de QA (`npx playwright test tests/e2e/[slug].spec.ts tests/e2e/smoke.spec.ts`) vai continuar a mostrar este falso-negativo sempre que `logout-settings-page.spec.ts` correr antes de `smoke.spec.ts` na mesma invocação. Registado como bug de metodologia de testes (BUG-4), não como defeito de produto.

## Verificações de Segurança

Nenhuma API route criada ou modificada por esta feature (`signOut()` é chamado directamente do SDK Supabase no client, sem endpoint próprio) — tabela de rotas N/A.

| Verificação                                                    | Ficheiro                                       | Status |
| ---------------------------------------------------------------- | ----------------------------------------------- | ------ |
| Client Component (`logout-button.tsx`) não importa `src/lib/anthropic/` nem `src/lib/yahoo-finance/` | `src/components/settings/logout-button.tsx`     | ✅     |
| Client Component usa `src/lib/supabase/client.ts` (nunca `server.ts`) | `src/components/settings/logout-button.tsx`     | ✅ (`createClient` de `@/lib/supabase/client`) |
| Server Component usa `getUser()`, não `getSession()`, para proteger a rota | `src/app/(dashboard)/settings/page.tsx` (via `requireUser()` em `src/lib/auth.ts`) | ✅ |

Um relatório de Security Review dedicado (`security-logout-settings-page.md`) já existe no repositório (produzido em paralelo, fora do escopo desta verificação QA) — confirma as mesmas conclusões e zero achados novos.

## Critérios de Aceite

| CA  | Descrição                                                                                   | Ferramenta   | Status  | Evidência                                                                 |
| --- | --------------------------------------------------------------------------------------------- | ------------ | ------- | -------------------------------------------------------------------------- |
| CA1 | Botão "Terminar sessão" visível no conteúdo da página, sem depender da Navbar                 | Playwright   | ✅ PASS | Teste `CA1` — `getByRole("button", { name: "Terminar sessão" })` visível em `/settings` |
| CA2 | Clicar termina a sessão, redirecciona para `/passphrase`, e `/dashboard` volta a redireccionar | Playwright   | ✅ PASS | Teste `CA2 + CA4` — clique → `toHaveURL(/passphrase/)` → `goto("/dashboard")` → `toHaveURL(/passphrase/)` |
| CA3 | Botão visualmente separado das infos de perfil (card "Sessão" distinto)                        | Playwright   | ✅ PASS | Teste `CA3` — verificado via DOM que o card (`.closest(".rounded-xl")`) do botão não contém "E-mail" |
| CA4 | Durante o logout, botão desactivado / "A terminar sessão…", impedindo cliques múltiplos          | Playwright   | ✅ PASS | Teste `CA2 + CA4` — com `page.route` a atrasar `**/auth/v1/logout**` em 1s: botão com texto "A terminar sessão" visível e `toBeDisabled()` confirmados antes do redirect |

**Nota técnica sobre CA4 (achado menor de acessibilidade, não bloqueante):** o `<Button>` em `logout-button.tsx:26` tem `aria-label="Terminar sessão"` **estático** — não muda quando `isPending` é `true`. O texto visível muda correctamente para "A terminar sessão…" (confirmado), mas o **nome acessível** (o que um leitor de ecrã anuncia) permanece sempre "Terminar sessão", nunca reflectindo o estado de carregamento. Isto não invalida CA4 (que exige indicação visual, presente), mas é uma lacuna de acessibilidade a corrigir — sugiro remover o `aria-label` estático e deixar o `aria-busy` + texto dinâmico servirem de nome acessível, ou tornar o `aria-label` dinâmico também.

## Problemas Encontrados

- **BAIXO** `src/components/settings/logout-button.tsx:26` — `aria-label="Terminar sessão"` estático não reflecte o estado `isPending`; leitores de ecrã nunca anunciam "A terminar sessão…". Não bloqueia CA4 (indicação visual está presente e correcta), mas é dívida de acessibilidade.
- **MÉDIO (verificação, não produto)** Chrome Extension indisponível nesta sessão — todos os CAs visuais (CA1, CA3, CA4) foram confirmados apenas via DOM/Playwright, não via inspecção visual real no browser com extensão. Limita o status desta verificação a PARCIAL por protocolo. Registado em `.issues/bugs.md` (BUG-3).
- **INFORMACIONAL (metodologia de teste)** `logout-settings-page.spec.ts` executado antes de `smoke.spec.ts` na mesma invocação Playwright causa falso-negativo no teste `@authed` de `smoke.spec.ts`, porque `signOut()` usa `scope=global` e revoga a sessão partilhada gerada uma única vez por `auth.setup.ts`. Comportamento correcto da feature (a sessão termina mesmo, globalmente), mas colide com o desenho de sessão única partilhada dos testes. Registado em `.issues/bugs.md` (BUG-4).
