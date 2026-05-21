-- ─── Row Level Security Policies ─────────────────────────────────────────────
-- Pattern: (SELECT auth.uid()) instead of auth.uid() directly.
-- PostgreSQL can cache the SELECT result for the whole query instead of
-- evaluating it per-row, which significantly improves performance.

-- ─── Profiles ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ─── Categories ──────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Users can see system categories (user_id IS NULL) AND their own custom ones
CREATE POLICY "categories_select"
  ON public.categories FOR SELECT
  USING (user_id IS NULL OR (SELECT auth.uid()) = user_id);

CREATE POLICY "categories_insert_own"
  ON public.categories FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_update_own"
  ON public.categories FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_delete_own"
  ON public.categories FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ─── Transactions ─────────────────────────────────────────────────────────────
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ─── Portfolio Positions ──────────────────────────────────────────────────────
ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_select_own"
  ON public.portfolio_positions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "portfolio_insert_own"
  ON public.portfolio_positions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "portfolio_update_own"
  ON public.portfolio_positions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "portfolio_delete_own"
  ON public.portfolio_positions FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ─── AI Insights ─────────────────────────────────────────────────────────────
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insights_select_own"
  ON public.ai_insights FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "insights_insert_own"
  ON public.ai_insights FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
