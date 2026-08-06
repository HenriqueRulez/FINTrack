-- Migration 0013: price_cache — cache persistente de cotações Yahoo Finance
-- (M-03 do AUDIT_MELHORIAS.md, autorizado pelo dono).
--
-- Contexto: src/lib/yahoo-finance/client.ts já tem cache EM MEMÓRIA (15 min TTL)
-- para quotes/FX, mas esse cache morre a cada reinício/cold-start do processo
-- Node. price_cache é a camada persistente por baixo desse cache: sobrevive a
-- reinícios e é partilhada entre todas as instâncias do servidor, reduzindo
-- chamadas repetidas ao Yahoo Finance (objectivo declarado: evitar billing/
-- rate-limit/ban).
--
-- Dados armazenados: cotação (LivePrice sem fxToEur) por ticker. `name` é
-- guardado porque vem grátis na mesma chamada quote() do Yahoo
-- (src/lib/yahoo-finance/client.ts:170-195) — sem persisti-lo, um cache-hit de
-- preço não seria suficiente para reconstruir um LivePrice completo.
--
-- NÃO inclui fx_to_eur: câmbio é por MOEDA, não por ticker (AAPL e MSFT
-- partilham USD→EUR); guardá-lo aqui, chaveado por ticker, duplicaria o mesmo
-- valor em N linhas. getFxToEur já tem cache próprio em memória, dedupido por
-- moeda antes de chegar a prices.ts (src/lib/portfolio/prices.ts:17-27).
--
-- Dados de mercado (preço/nome da AAPL) são PÚBLICOS, não pertencem a um
-- utilizador — sem user_id, sem posse por linha. RLS continua ligado (regra do
-- projecto) com policies restritas explicitamente TO authenticated.

CREATE TABLE public.price_cache (
  ticker      TEXT           PRIMARY KEY CHECK (char_length(ticker) BETWEEN 1 AND 20),
  price       NUMERIC(20, 8) NOT NULL CHECK (price > 0),
  currency    TEXT           NOT NULL CHECK (char_length(currency) BETWEEN 3 AND 5),
  name        TEXT           NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  fetched_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.price_cache IS
  'Cache persistente de cotações Yahoo Finance (preço + nome), partilhado entre todos os utilizadores. Dados de mercado públicos, sem user_id. Backing store por baixo do cache em memória de src/lib/yahoo-finance/client.ts. fetched_at determina staleness (TTL aplicado em código, não aqui).';

ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_cache_select_authenticated" ON public.price_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "price_cache_insert_authenticated" ON public.price_cache
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "price_cache_update_authenticated" ON public.price_cache
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "price_cache_delete_authenticated" ON public.price_cache
  FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_price_cache_fetched_at ON public.price_cache (fetched_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_cache TO authenticated;
