# Relatório de Segurança — CSV Import (Trading212)

**Working Item:** `.claude/working-items/csv-import.md`
**SECURITY_FINDINGS.md:** actualizado ✅
**Veredicto:** APROVADO — sem achados bloqueantes (0 CRÍTICO / 0 ALTO / 0 MÉDIO). 3 achados BAIXO/INFORMACIONAL registados.

> Nota: não existe `engineer-csv-import.md` em `.claude/reports/` (o Engineer não deixou relatório com esse nome). A auditoria correu sobre os 6 ficheiros da feature enumerados pelo orquestrador + suporte (`write-guard.ts`, `derive.ts`, `ledger.ts`, `0011`), não sobre um relatório de Engineer.

## Ficheiros Auditados

- `src/app/api/transactions/import/route.ts` (endpoint POST)
- `src/lib/import/csv.ts` (parser RFC4180)
- `src/lib/import/trading212.ts` (mapper)
- `src/lib/validations/import.ts` (ImportRequestSchema)
- `supabase/migrations/0014_import_support.sql`
- `src/components/transactions/ImportModal.tsx`

## Resultados das Verificações Automáticas

| Verificação                | Resultado                                              |
| -------------------------- | ----------------------------------------------------- |
| Secrets expostos em client | ✅ Nenhum                                              |
| Routes sem auth.getUser    | ✅ Todas protegidas (incl. `import/route.ts`)          |
| Routes sem rateLimit       | ✅ Todas com rate limit (incl. `import/route.ts`)      |
| npm audit (high+critical)  | ✅ Zero — `found 0 vulnerabilities`                    |
| npm audit (full, low+)     | ✅ Zero — B-01 (postcss/next) já não reportado         |

## Cobertura dos Vectores Pedidos

### 1. Upload handling / DoS por payload

- **Cap de ~2MB:** aplicado em `ImportRequestSchema` (`.max(2*1024*1024)`) e client-side (`MAX_FILE_BYTES`). Efectivo a limitar o trabalho do `parseCsv` e o payload de BD.
- **Ineficácia parcial:** o `.max` do Zod corre **depois** de `request.json()` já ter bufferizado o corpo inteiro em memória. Route Handlers do Next 15 não impõem limite de body por omissão → o cap não limita a memória do parse do JSON em si. Mitigado por auth (single-user) + rate limit 10/min. Registado como **B-17** (BAIXO).
- **Input adversarial no parser:** `parseCsv` é single-pass O(n), sem regex com backtracking, sem ReDoS. Aspas não fechadas → um campo grande (limitado por n); muitas colunas → array de até n campos; muitos newlines → muitas linhas. Memória O(n), toda limitada pelo cap. O mapper faz trabalho constante por linha; a única regex (`/^\d{4}-\d{2}-\d{2}$/`) corre sobre um slice de 10 chars. **Sem explosão de memória/CPU.**

### 2. Injection via campos do CSV

- **SQL injection:** valores controlados pelo atacante (ticker, external_id, isin, label, currency) entram por `.insert(payload)` do supabase-js → PostgREST, **parametrizado**, sem concatenação de string. Sem risco.
- **CSV formula injection (`=`,`+`,`-`,`@`):** avaliado — **não aplicável**. Os valores são renderizados em React (auto-escape, sem `dangerouslySetInnerHTML`) e gravados na BD; **não** são re-exportados para CSV/Excel em nenhum ponto desta feature. O gatilho de formula injection (célula reinterpretada por uma folha de cálculo) não existe aqui. Reavaliar se surgir uma feature de export que reemita estes campos.
- **XSS:** mensagens de erro do mapper (`Trading212FormatError`, `reason`) podem ecoar valores do próprio CSV, mas são dados do próprio utilizador autenticado devolvidos a ele mesmo e renderizados escapados. Sem vector.

### 3. Auth / Autorização

- `supabase.auth.getUser()` é a 1ª operação; 401 imediato se `!user`. ✅
- `user_id` vem **sempre** de `user.id` (linha 181), nunca do body. ✅
- Ambas as queries de leitura filtram `.eq("user_id", user.id)` + RLS de `transactions`. ✅
- **Migração 0014:** só `ADD COLUMN` + `CREATE UNIQUE INDEX` numa tabela que já tem RLS — não requer novo `ENABLE ROW LEVEL SECURITY`. As colunas novas herdam o GRANT a `authenticated` da tabela (a `0011`); em Postgres um GRANT de tabela cobre colunas adicionadas depois — **correcto**, sem `42501`. CHECKs presentes (`source IN (...)`, `char_length(isin)=12`, `withholding_tax >= 0`).

### 4. Idempotência / Corrida

- Índice único **parcial** `(user_id, external_id) WHERE external_id IS NOT NULL` — garante que reimportar não duplica e não colide com entradas manuais (external_id NULL). ✅
- Dedup em duas camadas: pré-query dos `external_id` existentes + `seenInFile` (dedup dentro do próprio ficheiro). ✅
- Corrida preview↔commit / commits concorrentes: `23505` é apanhado e tratado como duplicado (200, não 500). O batch insert é atómico (nada gravado em conflito), logo reportar os candidatos como duplicados é factualmente correcto. ✅

## Achados desta Feature

### CRÍTICO

_Nenhum._

### ALTO

_Nenhum._

### MÉDIO

_Nenhum._

### BAIXO / INFORMACIONAL

| ID   | Arquivo | Problema | Impacto | Correcção Sugerida |
| ---- | ------- | -------- | ------- | ------------------ |
| B-16 | Processo — `0014` aplicada ao Cloud via `yes \| npx supabase db push` | Auto-confirma o prompt interactivo, saltando a confirmação humana da aplicação de DDL a produção | DESTA migração: baixo (aditiva, reversível, metadata-only, não toca dados). Risco real de governança: o mesmo hábito numa migração destrutiva/ambiente errado remove o último gate humano antes de dano irreversível | Não reutilizar o auto-confirm para migrações não-aditivas; rever `supabase db diff`/dry-run e confirmar manualmente (ou gate de review em CI) |
| B-17 | `src/lib/validations/import.ts:15`, `import/route.ts:67` | Cap de ~2MB corre depois de `request.json()` bufferizar o corpo inteiro; não limita a memória do parse do JSON | DoS por payload grande. Mitigado: auth single-user + rate limit 10/min; parser O(n) sem ReDoS | Ler/limitar o body por streaming ou impor `Content-Length` máximo antes de `request.json()` |
| B-18 | `import/route.ts:201` | `(supabase as any)` no batch insert (higiene de tipos) | Nenhum bypass — `user_id` da sessão + RLS + insert parametrizado. Mesma causa-raiz do B-13/B-15 | Regenerar `database.ts` via Supabase CLI (marcador `__InternalSupabase`) e remover o cast |

## Achados Resolvidos nesta Feature

| ID anterior | Descrição | Resolvido por |
| ----------- | --------- | ------------- |
| B-01 | `postcss@8.4.31` transitivo do Next.js (GHSA-qx2v-qp2m-jg93) | Patch do Next.js — `npm audit` (full) reporta 0 vulnerabilidades; verificado nesta auditoria (2026-08-06) |

## Notas de Correcção Correcta (sem achado)

- **Oversell guard:** o `created_at` sintético (`Date.UTC(2000,0,1)+i`) dado às candidatas novas fica antes de qualquer `created_at` real, mas `sortLedger` ordena por `(date, buy-antes-de-sell, created_at)` — o desempate por tipo domina, logo o oversell same-date continua correcto. É lógica de integridade (não segurança) e está bem.
- Sem `console.*` na route; respostas de erro genéricas (`"Database error"`), sem stack traces nem detalhes internos da BD.

## Estado de SECURITY_FINDINGS.md após actualização

| Categoria | Abertos | Resolvidos | Aceites |
| --------- | ------- | ---------- | ------- |
| Crítico   | 0       | 0          | 0       |
| Alto      | 0       | 0          | 0       |
| Médio     | 1       | 2          | 0       |
| Baixo     | 12      | 6          | 3       |
| **Total** | **13**  | **8**      | **3**   |
