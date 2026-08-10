---

# Bug Report — `getHistory()` usa API deprecada do yahoo-finance2 e devolve sempre `[]`

**Severidade:** HIGH
**Área:** `src/lib/yahoo-finance/client.ts` (função `getHistory`, linhas 251-281)

## Comportamento Esperado

`getHistory(ticker)` deve devolver um array de `HistoryPoint[]` com os closes diários dos últimos ~30 dias para um ticker válido, permitindo ao dashboard, ao endpoint de histórico e aos movers apresentar dados reais.

## Comportamento Actual

`getHistory(ticker)` devolve sempre `[]`, para qualquer ticker, porque a chamada interna a `yahooFinance.historical()` lança sempre uma excepção.

## Passos para Reproduzir

1. Chamar `getHistory("AAPL")` (ou qualquer ticker válido) em `src/lib/yahoo-finance/client.ts`.
2. A linha 259 executa `yahooFinance.historical(ticker, { period1, interval: "1d" })`.
3. O catch (linha 271) captura o erro, cacheia `{ data: [], fetchedAt: Date.now() }` em `historyCache` e devolve `[]`.

## Contexto Adicional

- Causa raiz confirmada: o pacote instalado é `yahoo-finance2@3.14.1`. Nesta versão, `historical()` está deprecado — internamente é mapeado para `chart()`, mas o mapeamento falha na validação de schema (`period2` — "Expecting date'ish") porque as opções passadas não são compatíveis com `ChartOptions`. Resultado: `historical()` lança sempre, o catch de `getHistory` é sempre accionado, e o resultado vazio fica cacheado (TTL de `HISTORY_CACHE_TTL_MS`), agravando o problema em chamadas repetidas.
- A função irmã `getHistoryRange` (linhas 212-249, mesmo ficheiro) já resolve exactamente este problema usando `yahooFinance.chart()` directamente — inclusive o comentário nas linhas 208-210 já documenta que `historical()` está deprecado no v3 e cita o mesmo padrão usado em `getFxOnDate`. `getHistory` nunca foi migrado.
- Solução recomendada (não implementada, apenas documentada como proposta):
  - Substituir a chamada `yahooFinance.historical(ticker, { period1, interval: "1d" })` por `yahooFinance.chart(ticker, { period1, period2: new Date(), interval: "1d" })`, seguindo o mesmo padrão de `getHistoryRange`.
  - Filtrar `q.close != null && !Number.isNaN(q.close)` e mapear para `{ date: q.date.toISOString().split("T")[0], close: q.close as number }`.
  - Manter inalterados: assinatura pública (`Promise<HistoryPoint[]>`), lógica de cache (`historyCache`, `pruneCache`, `HISTORY_CACHE_TTL_MS`) e comportamento de fallback `[]` no catch.

## Ficheiros Provavelmente Afectados

- `src/lib/yahoo-finance/client.ts:251-281` (função `getHistory` — origem do bug)
- `src/app/(dashboard)/dashboard/page.tsx:145` (gráfico "Portfolio over time" 30d — consumidor)
- `src/app/api/portfolio/history/route.ts:44` (endpoint de histórico — consumidor)
- `src/app/api/portfolio/movers/route.ts:64` (movers — consumidor)
- `src/lib/portfolio/day-pnl.ts:30` (baseline de day P&L — consumidor)

## Critérios de Aceite para a Correcção

- [ ] CA1: `getHistory(ticker)` deixa de devolver `[]` sempre — devolve pontos de histórico de ~30 dias (não vazio) para um ticker válido
- [ ] CA2: Sem uso de `yahooFinance.historical()` no ficheiro `src/lib/yahoo-finance/client.ts`
- [ ] CA3: `npm run typecheck` e `npm run lint` verdes
- [ ] CA4: Caches (`historyCache`, TTL, `pruneCache`) e assinatura pública (`Promise<HistoryPoint[]>`) inalterados; nenhum consumidor (`dashboard/page.tsx`, `api/portfolio/history/route.ts`, `api/portfolio/movers/route.ts`, `lib/portfolio/day-pnl.ts`) precisa de alteração

---
