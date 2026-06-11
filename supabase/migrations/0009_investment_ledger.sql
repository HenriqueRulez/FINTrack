-- Migration 0009: drop dead income/expense tables, create investment ledger.
-- Dropa public.transactions e public.categories (módulo income/expense antigo,
-- zero queries em src/app/api/). As políticas RLS dessas tabelas (0002) saem em
-- cascata com o DROP TABLE. O seed do 0003 fica inerte mas sem erro (0003 corre
-- antes do 0009). Drop order respeita a FK transactions.category_id -> categories.

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

-- ─── Seed: 13 transações do mock (mock-data.ts) para o owner ──────────────────
-- Continuidade visual da página /transactions. ticker "—" -> NULL.
-- mock `cur` -> coluna `currency`. qty/price/label NULL quando aplicável.
INSERT INTO public.transactions
  (user_id, date, ticker, type, qty, price, currency, fx, fee, total, label)
SELECT u.id, v.date, v.ticker, v.type, v.qty, v.price, v.currency, v.fx, v.fee, v.total, v.label
FROM auth.users u
CROSS JOIN (
  VALUES
    ('2026-04-02'::date, 'VWCE',    'buy',  15::numeric,   12.00::numeric,   'EUR', 1.0000::numeric, 0.00::numeric, 180.00::numeric,    NULL::text),
    ('2026-02-05'::date, 'AMAT',    'buy',  12::numeric,   556.00::numeric,  'GBP', 1.0000::numeric, 0.00::numeric, 6672.00::numeric,   NULL),
    ('2025-12-10'::date, 'PPLT',    'buy',  123::numeric,  1233.00::numeric, 'USD', 1.1628::numeric, 0.00::numeric, 151659.00::numeric, NULL),
    ('2026-04-22'::date, 'CSPX',    'buy',  14::numeric,   480.20::numeric,  'EUR', 1.0000::numeric, 1.20::numeric, 6723.80::numeric,   NULL),
    ('2026-03-18'::date, 'MSFT',    'buy',  5::numeric,    320.00::numeric,  'USD', 1.0871::numeric, 0.50::numeric, 1740.86::numeric,   NULL),
    ('2026-03-30'::date, 'TSLA',    'sell', 4::numeric,    245.00::numeric,  'USD', 1.0871::numeric, 0.50::numeric, 1065.86::numeric,   NULL),
    ('2026-03-12'::date, 'GLD',     'sell', 6::numeric,    198.20::numeric,  'USD', 1.0871::numeric, 0.50::numeric, 1293.41::numeric,   NULL),
    ('2026-01-15'::date, NULL,      'cash', NULL::numeric, NULL::numeric,    'EUR', 1.0000::numeric, 0.00::numeric, 5000.00::numeric,   'Deposit · IBKR'),
    ('2026-02-28'::date, NULL,      'cash', NULL::numeric, NULL::numeric,    'EUR', 1.0000::numeric, 0.00::numeric, -1200.00::numeric,  'Withdrawal'),
    ('2026-02-04'::date, 'EUR→USD', 'conv', 1000::numeric, 1.087::numeric,   'USD', 1.0871::numeric, 1.50::numeric, 1087.00::numeric,   'EUR → USD'),
    ('2026-03-01'::date, 'CSPX',    'div',  NULL::numeric, NULL::numeric,    'EUR', 1.0000::numeric, 0.00::numeric, 24.40::numeric,     NULL),
    ('2026-04-01'::date, 'VWCE',    'div',  NULL::numeric, NULL::numeric,    'EUR', 1.0000::numeric, 0.00::numeric, 12.80::numeric,     NULL),
    ('2026-03-31'::date, NULL,      'int',  NULL::numeric, NULL::numeric,    'EUR', 1.0000::numeric, 0.00::numeric, 8.16::numeric,      'Cash interest')
) AS v(date, ticker, type, qty, price, currency, fx, fee, total, label)
WHERE u.email = 'owner@fintrack.local';
