# FINTrack — Import CSV (Trading212) em /transactions

> CONCLUÍDO em 2026-08-06 via pipeline completa (PO → Designer → Frontend → SM → Engineer → QA → Security).
> Resultado: 75/75 unit tests + 12/12 E2E verdes; typecheck+lint zero; npm audit 0 vulnerabilidades; Security aprovado sem achados bloqueantes.
> Achados BAIXO registados em SECURITY_FINDINGS.md: B-16 (auto-confirm db push), B-17 (json buffer antes do cap), B-18 (supabase as any).
> Dívida de teste (fora do escopo): QA limpou o ledger do user e2e → agrava G-05 (transactions-ledger.spec desatualizado).
>
> Plano aprovado em 2026-08-06. Execução via pipeline de agentes (regra do projeto).
> Backlog anterior removido a pedido do dono — recuperável no histórico git deste ficheiro.

## Contexto

O ledger `transactions` é a única source of truth do portfólio, mas hoje só aceita entradas manuais (buy/sell) uma a uma. O objetivo é importar o export CSV do broker e popular o ledger de forma fiel, idempotente e sem chamadas externas desnecessárias. O botão "Import" já existe como stub sem handler (`src/components/transactions/TxPageHead.tsx:92`).

## Decisões fechadas com o dono (2026-08-06) — não rediscutir

1. **Só Trading212 no v1.** O `positions_export/degiro.csv` é um snapshot de posições (sem datas/trades) — não serve para um ledger; DEGIRO entra numa iteração futura via export de transações próprio.
2. **Tipos importados:** Market/Limit buy → `buy`; Market/Limit sell → `sell`; Deposit → `cash`; Dividend → `div`. Restantes actions são ignoradas e reportadas.
3. **Merge idempotente:** coluna nova `external_id` (ID do broker) + unique index; reimportar nunca duplica. Linhas Dividend do T212 **não têm ID** → external_id sintético determinístico.
4. **UX:** upload → preview server-side (novas/duplicadas/ignoradas/erro) → confirmação grava.
5. **Parser RFC4180 próprio** (zero dependências novas).
6. **Schema:** + `external_id`, `source`, `isin`, `withholding_tax`. SEM coluna charge_amount (derivável: total + fee no depósito).
7. **fx do ficheiro** (exchange rate que o broker aplicou), não Yahoo — fidelidade + zero calls externas no import.

## Factos do código que condicionam o design (validados 2026-08-06)

- Sem lib CSV, sem código de upload no projeto; sem UNIQUE constraint em `transactions`.
- API atual: Zod só aceita `type buy/sell` (`src/lib/validations/transactions.ts`); DB aceita `buy/sell/cash/conv/div/int` (migration 0009).
- POST manual chama `getFxOnDate` (Yahoo) por transação e corre `ledgerErrorFor` por linha — inaceitável em massa; o import corre o guard UMA vez sobre (existente + lote).
- `database.ts` é mantido à mão; writes usam `(supabase as any)`.
- **fx é multiplicativo, "EUR por 1 unidade da moeda"** (`grossEur = qty * price * fx`, `src/lib/portfolio/ledger.ts:98`). T212 alterna a direção do exchange rate entre tipos de linha (buys ~1.16 USD-por-EUR → inverter; dividends ~0.86 EUR-por-USD → directo) — o mapper escolhe a direção que satisfaz `qty*price*fx ≈ Total EUR` da linha; senão, linha marcada erro.
- **UI já renderiza cash/div sem alterações** (`TYPE_TABS`, `TypeBadge`, `TxTable` — cash mostra `label` no lugar do ticker; div sempre positivo). TxModal continua só buy/sell — correcto, não mexer.
- **Sinal do total:** depósito positivo, dividendo positivo (líquido de withholding). Nenhum cálculo consome `total` de cash/div — display-only.
- **Oversell guard seguro com cash/div:** `mapRowsToLedgerTx` filtra non-buy/sell (`derive.ts:95`). Replicar o pattern existing+candidatas do POST (`route.ts:116-140`).
- **Batch insert:** payload `TablesInsert<"transactions">[]` + `(supabase as any).from("transactions").insert(array).select(...)` sem `.single()`.
- **Body size:** Route Handlers não têm limite do framework; cap fica no Zod (~2MB).
- Ledger usa custo médio; `created_at` igual para o lote inteiro é aceitável (ordem intra-dia só importa via regra buy-before-sell).
- GRANTs: tabela já tem GRANT a `authenticated` (0011); colunas novas herdam.

## Tarefas — pipeline `csv-import`

### 1. Migration `supabase/migrations/0014_import_support.sql`

- [x] `ALTER TABLE public.transactions ADD COLUMN external_id TEXT, ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','trading212')), ADD COLUMN isin TEXT CHECK (isin IS NULL OR char_length(isin) = 12), ADD COLUMN withholding_tax NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (withholding_tax >= 0);`
- [x] `CREATE UNIQUE INDEX idx_transactions_user_external ON public.transactions (user_id, external_id) WHERE external_id IS NOT NULL;`
- [x] Aplicar com `npx supabase db push`; actualizar `src/types/database.ts` à mão (Row/Insert/Update).

### 2. Parsing e mapeamento (server-only)

- [x] `src/lib/import/csv.ts` — parser RFC4180 puro (aspas, vírgulas e newlines em campos, CRLF), com unit tests.
- [x] `src/lib/import/trading212.ts` — mapper: detecta header T212, converte cada linha em candidato `{date, ticker, isin, type, qty, price, currency, fx, fee, withholding_tax, total, external_id, label}` ou `{error, rawLine}`.
  - qty arredondada a 8 casas (NUMERIC(20,8)); price/fee/total a 4.
  - fx normalizado para `fx_to_eur` multiplicativo: testa rate directo e 1/rate contra o Total EUR da linha.
  - fees: deposit fee (valor absoluto) → `fee` do cash row; currency conversion fee → `fee` do buy/sell; withholding tax → `withholding_tax` do div row (total do div = líquido, positivo).
  - Cash rows: `ticker` NULL, `label` descritivo (ex.: "Deposit Trading212").
  - external_id: ID da linha (EOF…/UUID); dividendos: `t212:div:<ISIN>:<timestamp>:<total>` (determinístico).
  - Moedas fora de EUR/USD/GBP → linha com erro (constraint do DB).

### 3. API `src/app/api/transactions/import/route.ts` (POST)

- [x] Pattern canónico completo: auth getUser → 401; rateLimit chave própria `transactions:import:${user.id}`, 10/60s (não partilhar `transactions:write`); Zod `ImportRequestSchema { csv: string max ~2MB, dryRun: boolean }` → 422.
- [x] Fluxo (igual em dryRun e commit, só o insert difere):
  1. Parse + map → candidatos e erros.
  2. Uma query: external_ids existentes do user → classifica duplicadas.
  3. Oversell guard: `ledgerErrorFor(existentes + novas)` UMA vez.
  4. dryRun: devolve `{summary, rows: [{...status: new|duplicate|ignored|error, reason}]}`.
  5. Commit: batch insert das novas (ordem cronológica do ficheiro), `user_id` da sessão; conflito no unique index (corrida) → tratado como duplicado, não 500.

### 4. Frontend

- [x] `src/components/transactions/ImportModal.tsx` — novo modal (spec do Designer conforme DESIGN.md): input file .csv, leitura como texto no cliente, POST dryRun → tabela de preview com badges de estado + contadores, botão confirmar → POST commit → `loadTransactions()` (`TransactionsPage.tsx:184`) + fecho.
- [x] `TxPageHead.tsx:92` — ligar `onImportClick` ao botão stub (montado em `TransactionsPage.tsx:332`).
- [x] Sem alterações à tabela/tabs: cash/div já renderizam (validado).

### 5. Validações Zod

- [x] `src/lib/validations/import.ts` — `ImportRequestSchema` (csv max ~2MB, dryRun boolean default true).
- [x] NÃO alterar `TransactionCreateSchema` (fluxo manual continua buy/sell only).

## O que NÃO entra

- Parser DEGIRO (v2, com export de transações do DEGIRO).
- Coluna charge_amount (derivável).
- Alteração do fluxo manual (POST atual intocado).
- Suporte a Withdrawal/Interest/conversões do T212 (ignoradas e reportadas no preview).

## Execução — pipeline de agentes

Feature slug: `csv-import`. Este plano é o input do PO.

- [x] 1. `po` → working item com CAs (deduplicação, preview, tipos, erros por linha, `positions_export/trading212.csv` como fixture de teste).
- [x] 2. `designer` → spec do ImportModal (DESIGN.md: dark, IBM Plex Mono, teal, badges gain/loss para estados).
- [x] 3. `frontend` → ImportModal + wiring do botão.
- [x] 4. `sm` → tasks para o Engineer (migration, parser, mapper, endpoint, database.ts).
- [x] 5. `engineer` → implementação + unit tests do parser/mapper.
- [x] 6. `qa` → Playwright: import do trading212.csv real, reimport (0 duplicadas), preview correto, typecheck+lint.
- [x] 7. `security-reviewer` → OWASP (upload handling, DoS por payload, injection via campos CSV) + npm audit + SECURITY_FINDINGS.md.

Todos por nome via `subagent_type`, sempre `run_in_background: true`, encadeados por notificações.

## Verificação

- [x] Unit tests parser/mapper em `tests/unit/` (`npx playwright test -c playwright.unit.config.ts`). Fixture = `positions_export/trading212.csv` real: 56 linhas de dados → 38 buys, 5 sells, 5 deposits (cash), 8 dividends (div), 0 erros; fx normalizado (buys USD: fx = 1/1.16…; dividends USD: fx = 0.86… directo); external_id sintético estável nos dividendos.
- [x] `npm run typecheck` + `npm run lint` zero erros.
- [x] E2E (`npm run test:e2e`): importar o ficheiro real no browser → preview mostra contagens certas → commit → tabela reflecte (tabs cash/div incluídos); reimportar → tudo duplicado, 0 inseridas; dashboard/holdings/performance derivam do ledger novo sem erro.
- [x] Verificar no Supabase que o unique index rejeita insert duplicado directo.
