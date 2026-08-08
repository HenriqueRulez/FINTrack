# TD-1: Reconciliar suite E2E legada (G-05) — specs mutuamente destrutivos

## Descrição

Os ~11 specs E2E legados partilham a base Supabase Cloud real e são mutuamente destrutivos: `csv-import.spec.ts` (`beforeAll` → `wipeLedger`) apaga todas as transacções do utilizador de teste e importa a fixture (8 linhas), enquanto `transactions-ledger.spec.ts` exige um seed fixo de 13 linhas que o csv-import destrói. A suite completa também excede 10 min (Yahoo real + espera de 61s do rate limit no wipe). Consequência: só o smoke público corre no CI (job `e2e-smoke`, C4 escopo A); o resto é regressão exclusivamente local e frágil.

Contexto registado no TODO.md (bloco C3/C4, 2026-08-08): a reconciliação só faz sentido com um banco de teste isolado — o projecto é Cloud-only, sem Supabase local nem Docker, e a opção "projecto Cloud de teste + secrets no CI" foi rejeitada por custo/manutenção.

## Acceptance Criteria

- [ ] Os specs E2E legados correm em qualquer ordem sem se destruírem mutuamente (isolamento de estado por spec)
- [ ] A suite completa termina abaixo do timeout (sem esperas de rate limit embutidas)
- [ ] Decisão documentada sobre o destino no CI: entram (com que banco) ou ficam formalmente como regressão local sob `/regression`

## Notas técnicas

- Pré-requisito real: estratégia de banco de teste (projecto Cloud de teste, seed/teardown por spec, ou outra) — decisão do utilizador, não default
- Referências: `tests/e2e/csv-import.spec.ts`, `tests/e2e/transactions-ledger.spec.ts`, `playwright.smoke*.config.ts`
