-- 0012_drop_portfolio_positions.sql
-- Etapa 3 do AUDIT (F-03): o ledger `transactions` é a fonte única de verdade.
-- A tabela `portfolio_positions` (estado derivado, redundante e capaz de divergir
-- do ledger) deixou de ter leituras — todas as rotas/páginas do portfólio passaram
-- a derivar de `transactions` via src/lib/portfolio/derive.ts.
-- CASCADE remove policies RLS, grants e quaisquer dependências associadas.

DROP TABLE IF EXISTS public.portfolio_positions CASCADE;
