-- Migration 0010: travas de integridade no ledger de transações (achado A-01).
-- A tabela public.transactions (0009) aceitava qty/price NULL e sem sinal, fx
-- sem limites e fee negativa — números impossíveis num ledger financeiro.
-- Estas CHECK constraints fecham isso no próprio schema, como última linha de
-- defesa por baixo da validação Zod da API de escrita (F-05, Etapa 2).
--
-- Aplicável em segurança: a tabela nasce vazia (o seed mock foi removido na
-- migração para o Cloud), portanto não há linhas existentes a violar.
--
-- Nota de âmbito: NÃO se impõe aqui a consistência aritmética de `total`
-- (total = qty·price ± fee). O sinal da fee difere entre buy e sell e o `total`
-- é recomputado no servidor no write path (F-05); forçá-lo no schema seria
-- frágil e redundante.

ALTER TABLE public.transactions
  -- buy/sell exigem quantidade positiva e preço não-negativo.
  ADD CONSTRAINT transactions_buysell_qty_price_check
    CHECK (
      type NOT IN ('buy', 'sell')
      OR (qty IS NOT NULL AND qty > 0 AND price IS NOT NULL AND price >= 0)
    ),
  -- Câmbio tem de ser estritamente positivo (evita divisão/normalização por 0
  -- e valores absurdos); limite superior generoso só para barrar overflow.
  ADD CONSTRAINT transactions_fx_positive_check
    CHECK (fx > 0 AND fx < 1000000),
  -- Fees nunca são negativas.
  ADD CONSTRAINT transactions_fee_nonneg_check
    CHECK (fee >= 0);
