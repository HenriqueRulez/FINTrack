-- ─── Alarga o CHECK constraint de currency na tabela portfolio_positions ───────
-- Substitui CHECK (currency IN ('BRL', 'USD')) por CHECK (currency IN ('BRL', 'USD', 'EUR'))
-- para suportar activos denominados em euros.

ALTER TABLE public.portfolio_positions
  DROP CONSTRAINT IF EXISTS portfolio_positions_currency_check;

ALTER TABLE public.portfolio_positions
  ADD CONSTRAINT portfolio_positions_currency_check
    CHECK (currency IN ('BRL', 'USD', 'EUR'));
