# Relatório de Implementação — Holdings Page Redesign

**Plano:** `.claude/tasks/holdings-redesign.md`
**Working Item:** `.claude/working-items/holdings-redesign.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings/erros
**Migration:** ✅ Aplicada: `0008_portfolio_sold_chart_var.sql`

## Ficheiros Criados
- `supabase/migrations/0008_portfolio_sold_chart_var.sql` — migration que adiciona colunas `sold BOOLEAN NOT NULL DEFAULT FALSE` e `chart_var TEXT CHECK (...)` à tabela `portfolio_positions`, com índice em `sold`
- `src/app/api/portfolio/holdings/route.ts` — `GET /api/portfolio/holdings` com autenticação, rate limit, validação Zod, e cálculo de KPIs e métricas por posição

## Ficheiros Modificados
- `src/types/database.ts` — regenerado via `supabase gen types typescript --local`; inclui agora os campos `sold` e `chart_var` na tabela `portfolio_positions`
- `src/lib/supabase/middleware.ts` — adicionada rota `/holdings` à lista `PROTECTED` para garantir autenticação obrigatória
- `src/lib/validations/portfolio.ts` — adicionado `HoldingsQuerySchema` (com campos `currency`, `showSold`, `sortCol`, `sortDir`) e tipo `HoldingsQuery` exportado
- `src/components/holdings/HoldingsCard.tsx` — substituído stub `setTimeout` no `handleRefresh()` por chamada real a `fetch('/api/portfolio')`; erro silencioso com `finally` para parar o spin

## Tarefas Implementadas
- [x] T1 — Migration SQL: adicionar campos `sold` e `chart_var` à tabela `portfolio_positions`
- [x] T2 — Verificar e garantir protecção da rota `/holdings` no middleware
- [x] T3 — Wiring do botão Refresh ao endpoint existente `GET /api/portfolio`
- [x] T4 — Adicionar `HoldingsQuerySchema` ao ficheiro de validações
- [x] T5 — Criar `GET /api/portfolio/holdings` com dados reais do Supabase

## Notas para o QA

### T2 — Protecção da rota `/holdings`
A protecção é feita em `src/lib/supabase/middleware.ts` via `startsWith()` no array `PROTECTED`. A rota `/holdings` foi adicionada ao array. O middleware redirige para `/passphrase` se o utilizador não estiver autenticado. O QA deve confirmar que aceder a `/holdings` sem sessão ativa redirige correctamente para `/passphrase`.

### T3 — Botão Refresh
O botão Refresh agora chama `GET /api/portfolio` (autenticado) no click. Como os dados visuais da página são ainda mock (Phase 1), o utilizador não verá alteração nos valores — apenas o ícone de spin durante o pedido. O spin para sempre no `finally`, mesmo em caso de erro de rede. O QA deve verificar que o botão faz spin e pára sem errar visualmente.

### T5 — `GET /api/portfolio/holdings`
A route retorna dados na moeda nativa de cada posição (campo `currency` da tabela). A conversão FX é responsabilidade do frontend. O campo `pct` (Portfolio %) é 0 para posições `sold: true`. O campo `sold_count` na resposta inclui posições vendidas — mas só aparecem no array `positions` se `?showSold=true` for passado. O QA pode testar via `curl` ou Postman (necessita de cookie de sessão). O frontend continua a usar `mock-data.ts` até à Fase 2.

### Sobre o schema Zod (`HoldingsQuerySchema`)
O `showSold` é coercido de string para boolean (`"true"` → `true`, qualquer outro valor → `false`). Todos os campos têm defaults — um GET sem query params retorna posições activas em EUR ordenadas por Market Value decrescente.
