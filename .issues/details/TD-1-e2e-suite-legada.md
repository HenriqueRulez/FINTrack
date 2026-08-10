# TD-1: Reconciliar suite E2E legada (G-05) — specs mutuamente destrutivos

## Descrição

Os ~11 specs E2E legados partilham a base Supabase Cloud real e são mutuamente destrutivos: `csv-import.spec.ts` (`beforeAll` → `wipeLedger`) apaga todas as transacções do utilizador de teste e importa a fixture (8 linhas), enquanto `transactions-ledger.spec.ts` exige um seed fixo de 13 linhas que o csv-import destrói. A suite completa também excede 10 min (Yahoo real + espera de 61s do rate limit no wipe). Consequência: só o smoke público corre no CI (job `e2e-smoke`, C4 escopo A); o resto é regressão exclusivamente local e frágil.

Contexto registado no TODO.md (bloco C3/C4, 2026-08-08): a reconciliação só faz sentido com um banco de teste isolado — o projecto é Cloud-only, sem Supabase local nem Docker, e a opção "projecto Cloud de teste + secrets no CI" foi rejeitada por custo/manutenção.

## Acceptance Criteria

- [x] Os specs E2E legados correm em qualquer ordem sem se destruírem mutuamente (isolamento de estado por spec)
- [x] A suite completa termina abaixo do timeout (sem esperas de rate limit embutidas)
- [x] Decisão documentada sobre o destino no CI: **regressão local** (ver Resolução)

## Notas técnicas

- Pré-requisito real: estratégia de banco de teste (projecto Cloud de teste, seed/teardown por spec, ou outra) — decisão do utilizador, não default
- Referências: `tests/e2e/csv-import.spec.ts`, `tests/e2e/transactions-ledger.spec.ts`, `playwright.smoke*.config.ts`

## Resolução (FIN-2, 2026-08-10)

**Estratégia escolhida (decisão do utilizador):** isolamento por teste dentro do projecto Cloud actual. Opção B (projecto Supabase de teste + secrets no CI) e Opção C (Supabase local via Docker) foram rejeitadas — não há Docker e os secrets no CI já tinham sido vetados.

**Isolamento entregue** (relatório: `.claude/reports/fin-2-e2e-isolation.md`):
- Cada spec estabelece o seu baseline no `beforeAll` e limpa no `afterAll` via `tests/support/ledger.ts` (bulk seed/wipe pelo token do próprio user de teste, RLS a limitar às linhas dele). Sem API do Next, sem rate limit, sem espera de 61s (AC2).
- `transactions-ledger`/`redesign`/`fix-select-all` semeiam `LEDGER_SEED_13`; `csv-import` e `holdings`/`performance` partem de baseline vazio. Conflito wipe-vs-13 reconciliado (AC1).
- Os specs de logout correm o `signOut()` numa sessão **isolada** (`tests/support/auth-session.ts`) e re-semeiam o storageState partilhado no `afterAll`. O `signOut()` de produção fica scope global (segurança intacta).

**AC3 — destino no CI (decisão do utilizador):** a suite `@authed` é **regressão LOCAL documentada**, NÃO corre no CI. O CI mantém só o smoke público (`smoke.spec.ts`, sem login, env dummy).
- Correr a regressão local: `npm run test:e2e` (suite completa, inclui `@authed`).
- Correr só o smoke público (o que o CI corre): `npm run test:e2e:smoke:public`.

**Fora de escopo (novo item):** ~20 falhas remanescentes na suite completa são UI drift pré-existente + flakiness (Yahoo/timing), provadas em isolação, não destruição cross-spec. Rastreado em **TD-11/FIN-13**.

**Facto de config a resolver:** `SUPABASE_SERVICE_ROLE_KEY` em `.env.local` está inválida para este projecto (PostgREST devolve 401). Não bloqueou (usou-se o token do user de teste), mas qualquer tooling local que dependa de service role vai falhar.
