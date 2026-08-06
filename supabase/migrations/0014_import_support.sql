-- Migration 0014: suporte a import de CSV do broker (Trading212) em /transactions.
--
-- Adiciona à tabela do ledger as colunas que permitem rastrear a origem de uma
-- entrada e deduplicar reimportações do mesmo ficheiro:
--   external_id     — identificador do broker (nullable; manual = NULL).
--   source          — origem da entrada ('manual' | 'trading212').
--   isin            — identificador do instrumento (12 chars quando presente).
--   withholding_tax — retenção na fonte (EUR, >= 0; dividendos).
--
-- O índice único PARCIAL em (user_id, external_id) só se aplica quando
-- external_id NÃO é nulo — garante que reimportar o mesmo export nunca duplica
-- (CA7), sem colidir com as entradas manuais (que têm external_id NULL).
--
-- A tabela já tem GRANT a `authenticated` (0011); colunas novas herdam-no.

ALTER TABLE public.transactions
  ADD COLUMN external_id     TEXT,
  ADD COLUMN source          TEXT NOT NULL DEFAULT 'manual'
                             CHECK (source IN ('manual', 'trading212')),
  ADD COLUMN isin            TEXT CHECK (isin IS NULL OR char_length(isin) = 12),
  ADD COLUMN withholding_tax NUMERIC(15, 4) NOT NULL DEFAULT 0
                             CHECK (withholding_tax >= 0);

CREATE UNIQUE INDEX idx_transactions_user_external
  ON public.transactions (user_id, external_id)
  WHERE external_id IS NOT NULL;
