-- Migration 0009: drop dead income/expense tables, create investment ledger.
-- Dropa public.transactions e public.categories (módulo income/expense antigo,
-- zero queries em src/app/api/). As políticas RLS dessas tabelas (0002) saem em
-- cascata com o DROP TABLE. Drop order respeita a FK
-- transactions.category_id -> categories.

DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.categories;

CREATE TABLE public.transactions (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE           NOT NULL,
  ticker      TEXT           CHECK (ticker IS NULL OR char_length(ticker) BETWEEN 1 AND 20),
  type        TEXT           NOT NULL CHECK (type IN ('buy', 'sell', 'cash', 'conv', 'div', 'int')),
  qty         NUMERIC(20, 8),
  price       NUMERIC(15, 4),
  currency    TEXT           NOT NULL CHECK (currency IN ('EUR', 'USD', 'GBP')),
  fx          NUMERIC(15, 6) NOT NULL DEFAULT 1,
  fee         NUMERIC(15, 4) NOT NULL DEFAULT 0,
  total       NUMERIC(15, 4) NOT NULL,
  label       TEXT           CHECK (label IS NULL OR char_length(label) <= 200),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_transactions_user_id   ON public.transactions (user_id);
CREATE INDEX idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX idx_transactions_ticker    ON public.transactions (ticker);

-- Nota: o seed de 13 transações mock que existia aqui foi removido na migração
-- para o Supabase Cloud — dados fictícios não entram no banco de produção
-- (achado F-04 de AUDIT_MELHORIAS.md). O ledger nasce vazio.
