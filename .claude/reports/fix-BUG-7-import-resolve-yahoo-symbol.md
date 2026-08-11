# Relatório de Implementação — Import resolve símbolo Yahoo por ISIN (BUG-7/FIN-15)

**Plano:** `.issues/details/BUG-7-import-resolve-yahoo-symbol.md`
**Working Item:** `.issues/details/BUG-7-import-resolve-yahoo-symbol.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings/erros
**Migration:** N/A (não houve migration — só código)

## Ficheiros Criados

- `src/lib/yahoo-finance/resolve-symbol.ts` — resolver de símbolo Yahoo por ISIN, server-only, com core puro injectável + wrapper com cache em memória por `ticker|isin`.
- `scripts/backfill-ticker-symbols.mjs` — backfill das posições já importadas: remapeia por (ticker, isin), dry-run por defeito + `--commit`, idempotente, carrega `.env.local`.
- `tests/unit/resolve-symbol.spec.ts` — 8 testes do resolver com `quote`/`search` mockados (sem rede), cobrindo os 4 casos do spec + regressões (preço 0/NaN, search a lançar, cache).

## Ficheiros Modificados

- `src/lib/yahoo-finance/client.ts` — estendida a tipagem do wrapper para incluir `search` e os args opcionais `queryOptions`/`moduleOptions` do `quote`; adicionadas as primitivas server-only `yahooQuoteRaw` (quote com `validateResult:false`) e `yahooSearch`.
- `src/app/api/transactions/import/route.ts` — ligada a resolução de símbolo por ISIN no preview (dryRun) e no commit: dedupe por ticker das candidatas novas buy/sell, remap 1:1, aplicado às linhas de preview e ao payload; fallback ao ticker original em falha (nunca 500). Auth/rate-limit/Zod intactos.

## Tarefas Implementadas

- [x] Parte A1 — Resolver testável (`resolveYahooSymbolCore` + `resolveYahooSymbol`) com deps injectadas, cache por `ticker|isin`, `validateResult:false` em quote e search.
- [x] Parte A2 — Wiring no `POST /api/transactions/import` (preview + commit), dedupe, fallback, guard de oversell inalterado.
- [x] Parte B — `scripts/backfill-ticker-symbols.mjs` (dry-run + `--commit`, idempotente, remap por (ticker, isin)). NÃO executado (service role key desta sessão inválida — o dono corre-o).
- [x] Testes — 8 unitários novos, todos verdes; suite completa verde no CI.

## Notas para o QA

- **CA1** (instrumento europeu grava símbolo resolvido): confirmado por teste `caso 2` — `VWRA`/`IE00B5BMR087` → `CSSPX.MI`. Em live, o import passa a gravar o símbolo com sufixo de bolsa. Verificação funcional exige CSV real com ISIN europeu; a posição deve deixar de mostrar "Preço indisponível" após import.
- **CA2** (ticker US inalterado, sem search extra): teste `caso 1` — quando `getQuote(ticker)` já traz preço, o resolver devolve o ticker e **NÃO** chama `search`. Só o quote inicial é feito.
- **CA3** (fallback sem rebentar): testes `caso 3a` (sem ISIN), `caso 3b` (ISIN sem candidata quotável) e `search a lançar excepção`. No route, cada resolução está em try/catch individual + `Promise.all`; qualquer falha cai ao ticker original. O import **nunca** devolve 500 por causa da resolução.
- **CA4** (`validateResult:false`): a primitiva `yahooQuoteRaw` chama `quote(symbol, {}, { validateResult:false })`; o resolver chama `search(isin, {quotesCount:8,newsCount:0}, {validateResult:false})`. Sem isto, ETFs (`quoteType: ETF`) rebentam a validação de schema.
- **CA5** (backfill): dry-run por defeito imprime o plano de remap; `--commit` aplica os UPDATEs por (ticker, isin). Idempotente porque só processa posições cujo `getQuote` já falha — após a 1ª aplicação o símbolo resolve e é ignorado. **Não foi executado nesta sessão** (a service role key no `.env.local` está inválida/placeholder — 401); o dono corre-o com credenciais válidas: `node scripts/backfill-ticker-symbols.mjs` (dry) e depois `--commit`.
- **CA6**: typecheck + lint verdes; 8 testes novos verdes; suite sem regressão (verde no CI); auth (`getUser` primeiro) + rate-limit + Zod do import intactos (ordem inalterada).
- **Detalhe do preview**: o símbolo resolvido aparece na coluna `ticker` das linhas `new` da pré-visualização (o utilizador vê o símbolo que vai ficar antes de confirmar). Linhas `duplicate`/`ignored`/`error` não são tocadas.
- **Guard de oversell**: a remapeação é 1:1 por ticker e corre ANTES do guard, por isso o guard opera sobre os símbolos resolvidos de forma consistente com o payload. Não funde tickers distintos.
- **Custo de chamadas**: no preview e no commit resolve-se apenas cada ticker DISTINTO das candidatas novas buy/sell (dedupe), e o cache em memória por `ticker|isin` evita repetir dentro do mesmo run. Tickers já quotáveis custam só 1 quote (sem search).
