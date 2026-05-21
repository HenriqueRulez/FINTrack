---
# Relatório de Implementação — Nome Automático e Preço com Cache

**Plano:** `.claude/tasks/nome-automatico-preco-cache.md`
**Working Item:** `.claude/working-items/nome-automatico-preco-cache.md`
**Typecheck:** ✅ Zero erros (`tsc --noEmit` — sem output, exit 0)
**Lint:** ✅ Zero warnings/erros (`eslint src` — sem output, exit 0)
**Migration:** ✅ Aplicada: `0007_portfolio_price_updated_at.sql`

## Ficheiros Criados
- `supabase/migrations/0007_portfolio_price_updated_at.sql` — adiciona coluna `price_updated_at TIMESTAMPTZ` nullable à tabela `portfolio_positions`

## Ficheiros Modificados
- `src/types/database.ts` — regenerado via `npx supabase gen types typescript --local`; inclui `price_updated_at: string | null` em Row/Insert/Update de `portfolio_positions`
- `src/lib/validations/portfolio.ts` — removidos campos `name` e `current_price` do `PositionSchema`; ambos passam a ser geridos exclusivamente pelo servidor
- `src/app/api/portfolio/route.ts` — POST: obtém nome e preço via `getQuote()` (1 chamada única) antes de inserir; 422 se ticker não encontrado. GET: identifica posições com `price_updated_at` nulo ou > 15 min, agrupa tickers únicos, chama `getQuotes()` em lote, actualiza banco e devolve posições actualizadas
- `src/app/api/portfolio/[id]/route.ts` — PATCH: removidos `name` e `current_price` do `updatePayload`; cliente não pode alterar esses campos
- `src/components/portfolio/position-form-dialog.tsx` — removidos campo "Nome" e estado `name`; `PositionFormData` actualizado para excluir `name`; `isFormValid` actualizado para não depender de `name`
- `src/components/portfolio/position-table.tsx` — interface `Position` actualizada com `current_price: number | null` e `price_updated_at: string | null`; adicionadas colunas "Preço Atual" (formata com 2 decimais ou "—") e "Total Gasto" (quantidade × preço médio, 2 decimais)
- `src/app/(dashboard)/portfolio/page.tsx` — select actualizado para incluir `current_price` e `price_updated_at` na query inicial
- `src/components/portfolio/portfolio-client.tsx` — adicionado `useEffect` no mount que chama `GET /api/portfolio` em background e actualiza o estado `positions` com os preços refrescados; erros são registados silenciosamente sem bloquear o utilizador; o render inicial (SSR) mantém-se inalterado

## Tarefas Implementadas
- [x] T1 — Migration `0007_portfolio_price_updated_at.sql` aplicada; tipos regenerados
- [x] T2 — `name` e `current_price` removidos do `PositionSchema`
- [x] T3 — POST chama `getQuote(ticker)` uma única vez; retorna nome, preço e currency; 422 se ticker inválido
- [x] T4 — GET identifica posições stale (NULL ou > 15 min), agrupa tickers únicos, `getQuotes()` em lote, actualiza banco, re-fetch e retorna posições actualizadas
- [x] T5 — PATCH ignora `name` e `current_price` do cliente; não incluídos no `updatePayload`
- [x] T6 — Campo "Nome" removido do formulário de adição e edição; `PositionFormData` sem `name`
- [x] T7 — `Position` type inclui `current_price` e `price_updated_at`; colunas "Preço Atual" e "Total Gasto" adicionadas à tabela (read-only)
- [x] T8 — `portfolio/page.tsx` fetch inclui novos campos; `portfolio-client.tsx` propaga via tipagem existente

## Notas para o QA
- O cache de 15 minutos é determinado por `price_updated_at` no banco (persistido), não apenas em memória. Posições existentes com `price_updated_at = NULL` são tratadas como stale e actualizadas na primeira visita à página.
- O in-memory cache no `yahoo-finance/client.ts` (15 min por ticker) opera em paralelo ao cache do banco. Num único request, se dois tickers diferentes estiverem stale, é feita 1 chamada ao Yahoo Finance por ticker único (via `getQuotes` que internamente chama `getQuote` por ticker).
- Se `getQuote` retornar `null` no POST (ticker inválido ou timeout), o endpoint responde 422 sem criar registo no banco. O utilizador deve verificar o símbolo.
- A coluna "Preço Atual" mostra "—" se `current_price` for null (posições antigas antes da migration que ainda não foram actualizadas pelo GET).
- O PATCH não re-fetcha o preço do Yahoo Finance — apenas actualiza os campos editáveis (ticker, tipo, quantidade, preço médio, moeda, exchange, notas). Se o ticker for alterado via PATCH, o preço fica desactualizado até o próximo GET que detecte `price_updated_at` > 15 min.
- O `editPosition` em `position-table.tsx` usa spread (`...position`) que inclui `current_price` e `price_updated_at`, mas o `PositionFormDialog` ignora esses campos pois não existem em `PositionFormData`.
---
