# Relatório de Segurança — transactions-redesign

**Engineer Report:** `.claude/reports/engineer-transactions-redesign.md`
**Fix Report:** `.claude/reports/fix-transactions-select-all-nested-button.md`
**Working Item:** FIN-3 / TD-2 (gate de segurança em atraso)
**SECURITY_FINDINGS.md:** actualizado ✅

## Contexto e Escopo

Feature entregue sem passar pelo gate de Security Review. Auditoria retroactiva
sobre os ficheiros tocados pela `transactions-redesign` (merge `cc69fd7`,
2026-05-29) e pelo fix posterior do botão aninhado no "Select All".

Facto verificado por `git log`: os componentes da feature entraram em `cc69fd7`
(2026-05-29). Os ficheiros `src/components/transactions/TxModal.tsx` (`2e476d2`,
2026-08-05) e `ImportModal.tsx` (`ae05ff3`, 2026-08-06) pertencem a features
posteriores (F-05 escrita de transacções, CSV Import) e **não** fazem parte
deste escopo — foram auditados nos seus próprios ciclos.

Natureza da feature: UI de leitura sobre **dados mock hardcoded**
(`mock-data.ts`). **Zero API routes, zero operações de banco, zero input de
utilizador enviado ao servidor.** A única superfície de segurança real é a
protecção da rota `/transactions` via middleware.

## Ficheiros Auditados

Componentes criados pela feature (Client Components / módulos):

- `src/components/transactions/mock-data.ts`
- `src/components/transactions/TypeBadge.tsx`
- `src/components/transactions/CheckBox.tsx` _(também tocado pelo fix)_
- `src/components/transactions/EmptyState.tsx`
- `src/components/transactions/FilterRow.tsx` _(também tocado pelo fix)_
- `src/components/transactions/TypeTabs.tsx`
- `src/components/transactions/TxTable.tsx`
- `src/components/transactions/TxFooter.tsx`
- `src/components/transactions/TxTweaksPanel.tsx`
- `src/components/transactions/TxPageHead.tsx`
- `src/components/transactions/TxCard.tsx`
- `src/components/transactions/TransactionsPage.tsx`
- `src/app/(dashboard)/transactions/page.tsx` (Server Component stub)

Ficheiros modificados:

- `src/lib/supabase/middleware.ts` — `/transactions` adicionado ao array `PROTECTED` (Engineer)
- `src/app/globals.css` — directivas `@source not` para excluir dirs não-código do scan Tailwind v4 (Engineer, fix build 500)
- `src/components/layout/sidebar.tsx` — item "Transactions" activado (badge hardcoded `13`)

## Resultados das Verificações Automáticas

| Verificação                | Resultado                            |
| -------------------------- | ------------------------------------ |
| Secrets expostos em client | ✅ Nenhum (`grep ANTHROPIC_API_KEY\|SERVICE_ROLE_KEY` em `src/app` = vazio) |
| Routes sem auth.getUser    | ✅ Todas protegidas (`grep -rL auth.getUser` = vazio); feature não tem routes |
| Routes sem rateLimit       | ✅ Todas com rate limit (`grep -rL rateLimit` = vazio); feature não tem routes |
| npm audit (job CI "Security audit") | ✅ `success` — run **31253940019** (headSha `2807206`), https://github.com/HenriqueRulez/FINTrack/actions/runs/31253940019/job/93094383196 |

### Verificações manuais adicionais (client boundary)

- Server-only imports (`lib/anthropic`, `lib/yahoo-finance`, `lib/supabase/server`) nos componentes da feature: **nenhum**.
- `process.env` / secrets hardcoded nos componentes: **nenhum**.
- Sinks de XSS (`dangerouslySetInnerHTML`, `innerHTML`, `eval`): **nenhum**.
- `console.*` / `alert()` que exponham dados: **nenhum** no código actual (o `alert()` demo mencionado no relatório do Frontend foi substituído por modais reais numa feature posterior).
- Middleware: `supabase.auth.getUser()` (não `getSession()`), match por fronteira de segmento, `redirect` para `/passphrase` se `!user` — correcto (`middleware.ts:31,35-42`).

### Nota sobre a referência do CI

O run auditado é o último de `ci.yml` (branch `docs/artefact-naming-id-slug`,
push em 2026-08-08). O código da `transactions-redesign` já está em `main` desde
2026-05-29, portanto está coberto por este run. Job "Security audit" =
`success` = zero vulnerabilidades high/critical.

## Achados desta Feature

### CRÍTICO

_Nenhum._

### ALTO

_Nenhum._

### MÉDIO

_Nenhum._

### BAIXO / INFORMACIONAL

_Nenhum._

**Registo explícito: a auditoria da `transactions-redesign` (incluindo o fix do
"Select All") encontrou ZERO achados novos.** Justificação: superfície de
ataque mínima — UI de leitura sobre dados mock, sem API, sem DB, sem input ao
servidor, sem secrets, sem imports server-only em Client Components, sem sinks
de XSS. A protecção de rota está correcta.

## Achados Resolvidos nesta Feature

_Nenhum resolvido pela transactions-redesign._

Nota de higiene do ledger (não atribuída a esta feature): durante a auditoria
verificou-se que **B-12** (match por prefixo puro no middleware) já estava
corrigido no código pelo commit `7413266` (AUDIT M-02, 2026-08-05) e continuava
listado como "Aberto". Movido para "Resolvidos" com atribuição correcta ao
commit de origem — **não** creditado à transactions-redesign.

| ID anterior | Descrição | Resolvido por |
| ----------- | --------- | ------------- |
| B-12 | Middleware usava `startsWith(r)` (prefixo puro) | Commit `7413266` (AUDIT M-02, 2026-08-05); correcção de entrada obsoleta verificada nesta auditoria |

## Estado de SECURITY_FINDINGS.md após actualização

| Categoria | Abertos | Resolvidos | Aceites |
| --------- | ------- | ---------- | ------- |
| Crítico   | 0       | 0          | 0       |
| Alto      | 0       | 0          | 0       |
| Médio     | 1       | 2          | 0       |
| Baixo     | 11      | 7          | 3       |
| **Total** | **12**  | **9**      | **3**   |
