---

# Bug Report — Import Trading212 grava ticker cru sem resolver símbolo Yahoo (posições "Preço indisponível")

**Linear:** FIN-15 (título "BUG-7")
**Severidade:** HIGH
**Área:** `src/lib/import/trading212.ts:378`, `src/app/api/transactions/import/route.ts:186`, `src/lib/yahoo-finance/client.ts`

> Nota de numeração: o índice local `.issues/bugs.md` já reutilizou "BUG-7/8/9" para itens de verificação visual sem Linear ID (drift). Este bug é o do Linear **FIN-15**. Artefactos ancorados a FIN-15.

## Comportamento Esperado

Após importar o CSV do Trading212, todas as posições activas mostram preço actual e Market Value em EUR na tabela de holdings.

## Comportamento Actual

~11 posições mostram o ícone de aviso e "Preço indisponível — valor desatualizado"; preço e Market Value ficam a "—". São excluídas do `totalValueEur` do sumário (`hasPriceGaps = true`).

## Causa-raiz (confirmada por código + validação live)

Cadeia (confirmada em código):
1. `HoldingsTable.tsx:198-204` mostra o aviso quando `row.priceMissing === true`.
2. `derive.ts:116`: `priceMissing = active && currentPriceEur === null`.
3. `derive.ts:115`: `currentPriceEur` é `null` quando o `PriceProvider` devolve `null`.
4. `prices.ts:132-143` + `client.ts:176`: `yahooPriceProvider` devolve `null` quando `getQuote(ticker)` não traz `regularMarketPrice` (símbolo não resolve no Yahoo).

Origem: o import grava o valor cru da coluna `Ticker` do CSV só com `.toUpperCase()` (`trading212.ts:378`), gravado tal-qual em `import/route.ts:186`. O formulário manual valida via `verify-ticker` (`getQuote`) antes de gravar; o import **não valida nem normaliza**. Símbolos T212 de instrumentos europeus (LSE/Xetra/Euronext) não são símbolos Yahoo — o Yahoo precisa de sufixo de bolsa (`.L`, `.DE`, `.AS`, `.MI`, …). Tickers US coincidem e funcionam.

Validação live feita nesta sessão (yahoo-finance2@3.14.1 instalado): `yahooFinance.search(isin, { quotesCount, newsCount:0 }, { validateResult:false })` resolve o símbolo quotável correcto:
- `IE00B5BMR087` → `CSSPX.MI` (724.36 EUR)
- `IE00BK5BQT80` → `VWRA.L`
- `IE00B4L5Y983` → `IWDA.L`
- `IE00BFY0GT14` → `SPPW.DE` (47.08 EUR)
- `US0378331005` → `AAPL`

`validateResult:false` é OBRIGATÓRIO: o yahoo-finance2 lança "did not validate with schema" em ETFs (`quoteType: ETF` != const `EQUITY`) por defeito.

## Abordagem aprovada pelo dono

Resolver por ISIN no import + script de backfill para as posições já importadas.

## Escopo da correcção

### Parte A — Resolução de símbolo no import (server-only)

1. Criar resolver testável (injecção de dependências, à imagem do `PriceProvider` em `derive.ts`). Sugestão: `src/lib/yahoo-finance/resolve-symbol.ts` com um core puro que recebe as funções `quote`/`search` injectadas, mais um wrapper que usa a instância real do `client.ts`.
   - Lógica: `resolveYahooSymbol(ticker, isin)`:
     a. Tentar `getQuote(ticker)`; se devolve preço, o ticker já resolve → devolver `ticker` inalterado.
     b. Se falha e há `isin`: `search(isin, { quotesCount: 8, newsCount: 0 }, { validateResult: false })`; iterar `res.quotes` com `symbol`; devolver o PRIMEIRO cujo `quote(symbol)` traz `regularMarketPrice`.
     c. Sem match / sem ISIN → devolver `ticker` original (fallback; a posição fica com aviso, o import NÃO rebenta).
   - Cache em memória por chave `ticker|isin` para não repetir search no mesmo run.
   - `validateResult:false` em search E quote das candidatas.
2. Ligar em `POST /api/transactions/import` (`import/route.ts`):
   - No COMMIT (`dryRun=false`), antes de montar o `payload`, resolver o símbolo para cada ticker distinto das candidatas novas buy/sell (dedupe por ticker; usar o `isin` da candidata). Substituir `c.ticker` pelo símbolo resolvido no payload; manter `isin`.
   - Também resolver no `dryRun` (preview) para o utilizador ver o símbolo que vai ficar (dedupe por ticker para limitar chamadas).
   - Segurança: falha de resolução → fallback ao ticker original; nunca 500 no import. Manter auth/rate-limit/Zod intactos.
   - Atenção ao guard de oversell: a remapeação é 1:1 por ticker (todas as linhas do mesmo ticker → mesmo símbolo), não funde tickers distintos; ordem actual do fluxo mantém-se.

### Parte B — Backfill das posições existentes

3. `scripts/backfill-ticker-symbols.mjs` (server-only, `SUPABASE_SERVICE_ROLE_KEY`, carregado de `.env.local`):
   - Ler todas as transacções buy/sell; agrupar por ticker (net qty); para cada ticker activo cujo `getQuote` falha e que tem `isin`, resolver via `search(isin)` (validateResult:false) e `UPDATE transactions SET ticker=<resolvido> WHERE ticker=<antigo> AND isin=<isin>`.
   - Modo dry-run por defeito (imprime plano de remap); `--commit` aplica. Idempotente (correr 2x não muda nada após a 1ª).
   - App é single-user; não filtrar por user_id é aceitável, mas preferir remap por (ticker, isin) para segurança.
   - O dono corre este script com credenciais válidas (a service role key no `.env.local` desta sessão está inválida/placeholder — 401).

### Testes

4. Testes unitários do resolver com `quote`/`search` MOCKADOS (sem rede):
   - ticker resolve directo → devolve ticker, não chama search.
   - ticker falha + isin resolve → devolve símbolo da candidata quotável.
   - sem match / sem isin → devolve ticker original.
   - primeira candidata sem preço, segunda com preço → devolve a segunda.
5. Suite existente permanece verde.

## Ficheiros Provavelmente Afectados

- `src/lib/yahoo-finance/client.ts` (expor `search` na tipagem do wrapper; helper de quote com validateResult:false se preciso)
- `src/lib/yahoo-finance/resolve-symbol.ts` (novo — resolver)
- `src/app/api/transactions/import/route.ts` (ligar resolução no preview e commit)
- `scripts/backfill-ticker-symbols.mjs` (novo — backfill)
- `tests/unit/resolve-symbol.spec.ts` (novo)

## Critérios de Aceite

- [ ] CA1: import de instrumento europeu com ISIN grava o símbolo Yahoo resolvido (quotável), não o ticker cru.
- [ ] CA2: import de ticker US já quotável permanece inalterado (não faz search além do quote inicial).
- [ ] CA3: resolução falhada (sem ISIN/sem match) faz fallback ao ticker original sem rebentar o import.
- [ ] CA4: `search`/`quote` das candidatas usam `validateResult:false` (não rebenta em ETFs).
- [ ] CA5: `scripts/backfill-ticker-symbols.mjs` remapeia por ISIN, com dry-run + `--commit`, idempotente.
- [ ] CA6: `npm run typecheck` + `npm run lint` verdes; testes unitários novos verdes; sem regressão; auth/rate-limit/Zod do import intactos.

---
