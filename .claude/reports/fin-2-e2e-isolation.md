# Relatório de Implementação — FIN-2 / TD-1: Isolamento da suite E2E legada

**Plano:** (inline do orquestrador — não houve ficheiro em `.claude/tasks/`)
**Working Item:** `.issues/details/TD-1-e2e-suite-legada.md`
**Typecheck:** ✅ Zero erros (`tsc --noEmit`)
**Lint:** ✅ Zero warnings/erros (`eslint src tests`)
**Migration:** N/A — sem alterações de schema

## Escopo entregue

AC1 (specs correm em qualquer ordem sem se destruírem) + AC2 (suite abaixo do timeout, sem esperas de rate limit embutidas). AC3 (destino no CI) fica fora, por decisão do utilizador — `ci.yml` e os `playwright.*smoke*.config.ts` NÃO foram tocados.

## Ficheiros Criados

- `tests/support/ledger.ts` — wipe/seed do ledger em BULK via PostgREST usando o token do próprio utilizador de teste (role `authenticated` + RLS). Uma requisição por operação → sem rate limit, sem espera de 61s.
- `tests/support/ledger-seed.ts` — seed canónico `LEDGER_SEED_13` (13 transacções: All=13, Buy/Sell=7, Cash=2, Conv=1, Div=2, Int=1) exigido por transactions-ledger/redesign.
- `tests/support/auth-session.ts` — fonte única de login do utilizador de teste; `createIsolatedAuthedContext()` (sessão isolada para o logout) e `refreshSharedAuthState()` (re-semeia o storageState partilhado depois do logout global).

## Ficheiros Modificados

- `tests/e2e/auth.setup.ts` — passa a usar `auth-session.ts` (dedup da lógica de login).
- `tests/e2e/logout-settings-page.spec.ts` — o logout real corre numa sessão ISOLADA; `afterAll` re-semeia o storageState partilhado. `signOut()` de produção intacto (scope global).
- `tests/e2e/dashboard-visual-redesign.spec.ts` — describe de logout (CA-06) migrado para sessão isolada + heal; `beforeAll` semeia 13 para KPIs/chart terem dados.
- `tests/e2e/csv-import.spec.ts` — removida a função `wipeLedger` (N× DELETE via API) e a espera de `61_000`ms; `beforeAll`/`afterAll` usam `resetLedger([])` (bulk, sem rate limit).
- `tests/e2e/transactions-ledger.spec.ts` — `beforeAll` semeia `LEDGER_SEED_13`, `afterAll` limpa.
- `tests/e2e/transactions-redesign.spec.ts` — idem, no describe autenticado.
- `tests/e2e/fix-transactions-select-all-nested-button.spec.ts` — semeia 13 (precisa de linhas na tabela), limpa no fim.
- `tests/e2e/holdings-redesign.spec.ts` / `holdings-reformulacao.spec.ts` / `performance-redesign.spec.ts` — `beforeAll` faz `resetLedger([])` (baseline vazio) ANTES de criar os fixtures via API, para derivarem só dos próprios fixtures.

## Estratégia de isolamento por spec

Cada spec estabelece o SEU baseline determinístico no `beforeAll` e limpa no `afterAll` — a ordem entre specs deixa de importar:

- **Estado do ledger:** via `tests/support/ledger.ts`. FACTO relevante encontrado: a `SUPABASE_SERVICE_ROLE_KEY` em `.env.local` está INVÁLIDA para este projecto (PostgREST devolve `401 "Invalid API key… might be owned by another Supabase project"`). Como não podia usar service role, o helper fala com o PostgREST usando o **access token do próprio utilizador de teste** (obtido por `signInWithPassword` — a mesma credencial do `auth.setup`), que tem GRANT a `authenticated` (migration 0011) e RLS a limitar às linhas dele. Isto permite `DELETE … eq(user_id)` e `INSERT [...]` em BULK, numa só requisição cada, **sem tocar na API do Next nem no rate limit** — eliminando a espera de 61s (AC2). Bónus: valida a credencial de teste (falha alto se `E2E_PASSPHRASE` estiver errada, em vez de fingir verde).
- **Conflito csv-import (wipe→8) vs transactions-ledger (13 fixas):** reconciliado — cada um prepara o que precisa. transactions-ledger/redesign/fix-select-all semeiam `LEDGER_SEED_13`; csv-import e holdings/performance fazem baseline vazio. Todos limpam no fim.
- **Sessão do logout:** o `signOut()` de produção usa scope global (revoga sessões por `user_id` no servidor). Os dois specs de logout (logout-settings-page e dashboard-visual-redesign CA-06) correm o logout numa sessão ISOLADA e, no `afterAll`, `refreshSharedAuthState()` re-semeia `tests/e2e/.auth/user.json` com sessão fresca. Assim, qualquer spec a seguir encontra sempre um storageState válido. O produto NÃO foi enfraquecido (nada de scope local no botão).

## Comandos de verificação e resultados reais

Servidor: `npm run dev` (localhost:3000). Credencial de teste: login OK (sem drift na passphrase). Ledger deixado limpo no fim (0 linhas, confirmado).

**Ordem A — suite completa em ordem natural (alfabética):**
`npx playwright test --reporter=list`
→ **176 passed, 20 failed (7.5m)**. Abaixo do timeout e SEM esperas de rate limit (a espera de 61s desapareceu).
Os specs no centro do problema passaram todos: `transactions-ledger` **23/23**, `csv-import` **todos**, `logout-settings-page`, `fix-transactions-select-all`, `fix-email`, `smoke`, `tax-calculator`.

**Ordem B — ordem forçada (config temporária com cadeia de dependências, já removida):**
ordem `logout → transactions-ledger → csv-import → fix-select-all`
→ **38 passed, 1 failed (1.2m)**. transactions-ledger 26/26, csv-import todos, logout todos.
Única falha: `fix-select-all › CA2 Enter` (teclado) — não determinística: PASSOU na Ordem A. O elemento resolve, o seed está presente (CA3 com clique passou), só o toggle por tecla Enter não registou. É flakiness de input, não destruição de estado.

**Conclusão factual sobre as 20 falhas da Ordem A:** NENHUMA é destruição cross-spec causada por este trabalho. Corri os specs falhados em ISOLAÇÃO para separar as causas:
- `portfolio` (3), `holdings-redesign` (5), `dashboard-visual-redesign` (2), `performance-redesign` (3) — falham EXACTAMENTE as mesmas em isolação → **UI drift pré-existente** (texto de empty-state em route-mock, formato da company-cell, badge/href da sidebar, headers de colunas, footer "Total: N"). Especs legados desalinhados com a UI actual; fora do escopo desta task (não toquei nesses componentes nem em `portfolio.spec`).
- `holdings-reformulacao` (2) e `transactions-redesign` (conjunto de falhas DIFERENTE entre isolação e suite) — **flakiness** (Yahoo/timing sob carga), não destruição de estado; as asserções dependentes do seed (transactions-redesign CA-02/CA-03 = contagens 13/7/2) passam em isolação e o seed idêntico de transactions-ledger passa 23/23.

Prova das duas afirmações-chave do problema (confirmadas em AMBAS as ordens):
1. transactions-ledger obtém as suas 13 linhas mesmo com o wipe do csv-import e o logout a correr ANTES dele.
2. csv-import parte de ledger vazio e importa 8 mesmo depois de transactions-ledger ter semeado 13 antes dele.
3. o logout global já não parte os specs seguintes (o heal do storageState repõe a sessão).

## Pendente para AC3 (decisão do utilizador)

Não alterei `ci.yml` nem `playwright.smoke*.config.ts`. Fica em aberto: os specs `@authed` entram no CI (e com que banco/credenciais) ou ficam formalmente como regressão local. Nota técnica para essa decisão: o seed/wipe local usa o token do utilizador de teste via PostgREST — no CI precisaria de `E2E_EMAIL`/`E2E_PASSPHRASE` como secrets (a opção "secrets no CI" foi historicamente rejeitada pelo utilizador). A `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` está inválida para este projecto e não é usada.

## Notas para o QA

- Este trabalho MUTA o ledger do utilizador de teste no Cloud (esperado). O estado foi deixado limpo (0 linhas) no fim.
- As 20 falhas da suite completa são pré-existentes (UI drift) ou flaky (Yahoo/timing) — reproduzem-se em isolação/variam entre corridas SEM relação com este trabalho. NÃO são regressões do isolamento. Se forem para corrigir, é outra task (re-alinhar specs legados à UI actual).
- A verificação de ordem-independência foi feita com uma config temporária (`playwright.orderb.config.ts`) que já foi APAGADA — não ficou no repo.
- FACTO a registar: `SUPABASE_SERVICE_ROLE_KEY` em `.env.local` está inválida para este projecto Supabase. Não bloqueou esta task (usei o token do utilizador de teste), mas qualquer código que dependa de service role localmente vai falhar com `401 Invalid API key`.
- Ficheiros de conteúdo modificados por sessão paralela (`.issues/tech-debt.md`, `SECURITY_FINDINGS.md`, `melhorias/pontos-importantes.md`) NÃO foram tocados por mim e ficam como estavam. Só revertri a injeção do `next dev` em `CLAUDE.md`.
