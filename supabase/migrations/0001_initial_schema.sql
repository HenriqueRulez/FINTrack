-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Extends auth.users with app-specific data. ON DELETE CASCADE keeps DB clean.
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  currency    TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Categories ──────────────────────────────────────────────────────────────
-- user_id NULL = system category (visible to all users)
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color       TEXT NOT NULL DEFAULT '#6B7280',
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_type ON public.categories(type);

-- ─── Transactions ─────────────────────────────────────────────────────────────
-- NUMERIC(15,2) prevents floating-point errors in financial calculations.
CREATE TABLE public.transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount       NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description  TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  date         DATE NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD')),
  notes        TEXT CHECK (char_length(notes) <= 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);

-- ─── Portfolio Positions ──────────────────────────────────────────────────────
-- current_price is nullable — populated by Yahoo Finance API call
CREATE TABLE public.portfolio_positions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker        TEXT NOT NULL CHECK (char_length(ticker) BETWEEN 1 AND 10),
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  asset_type    TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf', 'fii', 'crypto', 'other')),
  quantity      NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  avg_price     NUMERIC(15, 4) NOT NULL CHECK (avg_price > 0),
  current_price NUMERIC(15, 4),
  currency      TEXT NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD')),
  exchange      TEXT CHECK (char_length(exchange) <= 20),
  notes         TEXT CHECK (char_length(notes) <= 2000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_user_id ON public.portfolio_positions(user_id);

-- ─── AI Insights ─────────────────────────────────────────────────────────────
-- Caches Claude analysis results — avoids re-calling the API on page refresh
CREATE TABLE public.ai_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('spending', 'portfolio', 'general')),
  content       TEXT NOT NULL,
  model         TEXT NOT NULL,
  input_tokens  INT,
  output_tokens INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insights_user_id ON public.ai_insights(user_id);
CREATE INDEX idx_insights_user_created ON public.ai_insights(user_id, created_at DESC);

-- ─── Auto-create profile on signup ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
