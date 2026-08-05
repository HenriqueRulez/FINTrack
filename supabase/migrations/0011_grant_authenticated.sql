-- Migration 0011: concede privilégios de tabela à role `authenticated`.
--
-- Bug de infra descoberto no smoke test e2e do F-05 (2026-08-05): todas as
-- queries às tabelas de utilizador devolviam 500 com
--   42501 "permission denied for table transactions"
--   hint: GRANT SELECT ON public.transactions TO authenticated;
-- As tabelas foram criadas por migrations SQL puras (0001/0009), que — ao
-- contrário do Dashboard do Supabase — NÃO concedem automaticamente privilégios
-- às roles da API (`anon`, `authenticated`). Sem o GRANT de tabela, o RLS nunca
-- chega a ser avaliado: o Postgres barra logo por falta de privilégio.
--
-- O RLS (0002/0009) continua a ser a fronteira de segurança real: cada política
-- limita as linhas ao dono via (SELECT auth.uid()) = user_id. Este GRANT é só a
-- camada de privilégio por baixo do RLS. NÃO se concede nada a `anon` — a app
-- exige sessão autenticada.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_positions   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights           TO authenticated;
