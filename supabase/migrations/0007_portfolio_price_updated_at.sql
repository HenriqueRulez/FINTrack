-- Migration: adicionar coluna price_updated_at à tabela portfolio_positions
-- Usada para o cache de 15 minutos de preços via Yahoo Finance
-- NULL = nunca actualizado (necessita de actualização imediata)

ALTER TABLE portfolio_positions
  ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;
