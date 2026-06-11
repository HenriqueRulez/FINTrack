-- Migration 0011: Fase 2 do sandbox Fable 5 — ledger de transacções.
-- /transactions passa a ser a única source of truth; holdings/performance/
-- dashboard são derivados. As f5_positions existentes são convertidas em
-- transacções BUY (decisão do utilizador) e a tabela é removida.
-- Mesma decisão de RLS da 0010: activo com políticas permissivas (sem auth).

-- ─── f5_assets — metadados por ticker (1 linha por ticker) ───────────────────
-- asset_type/name vivem aqui (não por transacção) para garantir exactamente
-- uma classificação por ticker nas agregações de holdings/performance.
CREATE TABLE public.f5_assets (
  ticker      TEXT        PRIMARY KEY CHECK (char_length(ticker) BETWEEN 1 AND 20),
  asset_type  TEXT        NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto')),
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── f5_transactions — ledger BUY/SELL (source of truth) ─────────────────────
-- fx_to_eur: taxa moeda→EUR capturada na criação (pivot EUR fixo — mudar a
-- moeda base nas settings nunca invalida valores guardados).
CREATE TABLE public.f5_transactions (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE           NOT NULL,
  ticker      TEXT           NOT NULL REFERENCES public.f5_assets(ticker) ON UPDATE CASCADE,
  type        TEXT           NOT NULL CHECK (type IN ('buy', 'sell')),
  qty         NUMERIC(20, 8) NOT NULL CHECK (qty > 0),
  price       NUMERIC(20, 8) NOT NULL CHECK (price >= 0),
  currency    TEXT           NOT NULL DEFAULT 'USD' CHECK (currency IN ('EUR', 'USD', 'BRL')),
  fee         NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  fx_to_eur   NUMERIC(20, 8) NOT NULL DEFAULT 1 CHECK (fx_to_eur > 0),
  notes       TEXT           CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX f5_transactions_ticker_date_idx
  ON public.f5_transactions (ticker, date, created_at);
CREATE INDEX f5_transactions_date_idx
  ON public.f5_transactions (date);

-- ─── Conversão das posições existentes em transacções BUY ────────────────────
INSERT INTO public.f5_assets (ticker, asset_type, name, created_at)
SELECT ticker, asset_type, name, created_at
FROM public.f5_positions;

-- fx_to_eur aproveitado dos pares FX já persistidos em f5_price_cache
-- (ex.: "USDEUR=X"); fallback 1 se o par não estiver em cache.
INSERT INTO public.f5_transactions
  (date, ticker, type, qty, price, currency, fee, fx_to_eur, notes, created_at)
SELECT
  p.created_at::date,
  p.ticker,
  'buy',
  p.quantity,
  p.avg_price,
  p.currency,
  0,
  CASE WHEN p.currency = 'EUR' THEN 1
       ELSE COALESCE(
         (SELECT c.price FROM public.f5_price_cache c
          WHERE c.ticker = p.currency || 'EUR=X'),
         1
       )
  END,
  p.notes,
  p.created_at
FROM public.f5_positions p;

DROP TABLE public.f5_positions;

-- ─── RLS: activo com políticas permissivas (público de propósito) ────────────
ALTER TABLE public.f5_assets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.f5_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "f5_assets_all" ON public.f5_assets
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "f5_transactions_all" ON public.f5_transactions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
