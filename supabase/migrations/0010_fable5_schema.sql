-- Migration 0010: schema do sandbox "Projeto Fable 5" (CLAUDE.md §Instruções para Fable 5).
-- Tabelas prefixadas f5_* para identificação e remoção fáceis (DROP TABLE f5_*).
-- Sem auth por decisão explícita do utilizador: o sandbox /projeto-fable-5 é
-- público, as rotas usam o client anon. RLS fica ACTIVO com políticas
-- permissivas (USING true) para documentar a intenção — não é esquecimento.
-- Sem FKs para tabelas existentes nem para auth.users; não conflitua com 0009.

-- ─── f5_positions — posições directas (stocks/ETFs/criptos) ──────────────────
-- NUMERIC(20,8) em quantity E avg_price: criptos exigem 8 casas decimais.
-- UNIQUE(ticker): modelo agregado por ticker — duplicados gerariam ambiguidade.
CREATE TABLE public.f5_positions (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      TEXT           NOT NULL CHECK (char_length(ticker) BETWEEN 1 AND 20),
  asset_type  TEXT           NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto')),
  name        TEXT,
  quantity    NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  avg_price   NUMERIC(20, 8) NOT NULL CHECK (avg_price >= 0),
  currency    TEXT           NOT NULL DEFAULT 'USD' CHECK (currency IN ('EUR', 'USD', 'BRL')),
  notes       TEXT           CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT f5_positions_ticker_unique UNIQUE (ticker)
);

-- ─── f5_price_cache — cache persistente de cotações Yahoo ────────────────────
-- Camada 2 de cache (a camada 1 é em memória no client yahoo-finance):
-- sobrevive a restarts do dev server e evita re-chamar o Yahoo após hot reload.
CREATE TABLE public.f5_price_cache (
  ticker      TEXT           PRIMARY KEY,
  price       NUMERIC(20, 8) NOT NULL,
  currency    TEXT           NOT NULL,
  name        TEXT,
  fetched_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── f5_settings — singleton (uma linha, id forçado a 1) ─────────────────────
CREATE TABLE public.f5_settings (
  id                       SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  base_currency            TEXT        NOT NULL DEFAULT 'EUR' CHECK (base_currency IN ('EUR', 'USD', 'BRL')),
  refresh_interval_minutes INTEGER     NOT NULL DEFAULT 15 CHECK (refresh_interval_minutes BETWEEN 5 AND 1440),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.f5_settings (id) VALUES (1);

-- ─── RLS: activo com políticas permissivas (público de propósito) ────────────
ALTER TABLE public.f5_positions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.f5_price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.f5_settings    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "f5_positions_all" ON public.f5_positions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "f5_price_cache_all" ON public.f5_price_cache
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "f5_settings_all" ON public.f5_settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
