-- Migration: adicionar colunas sold e chart_var à tabela portfolio_positions
-- sold   — indica se a posição foi encerrada/vendida (necessário para filtro Show Sold)
-- chart_var — variável CSS da classe de activo para coloração visual na AllocPill

ALTER TABLE portfolio_positions
  ADD COLUMN IF NOT EXISTS sold BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chart_var TEXT CHECK (chart_var IN ('chart-1', 'chart-2', 'chart-4', 'chart-5'));

-- Índice em sold para filtros futuros (a maioria das queries filtra por sold = false)
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_sold
  ON portfolio_positions (sold);
