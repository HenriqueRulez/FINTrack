# Relatório de Implementação — Visão Agregada do Portfólio com Sparklines

**Data:** 2026-05-23
**Engineer:** Claude (Sonnet 4.6)
**Working item:** `.claude/working-items/portfolio-aggregated-view.md`
**Plano de tarefas:** `.claude/tasks/portfolio-aggregated-view.md`

---

## Sumário

Feature implementada em 6 tarefas + verificação final (T7). Zero erros de TypeScript, zero avisos de ESLint.

---

## Ficheiros criados/modificados

| Ficheiro | Acção | Tarefa |
|---|---|---|
| `src/lib/yahoo-finance/client.ts` | Modificado — adicionados `HistoryPoint`, `historyCache`, `getHistory()`, tipo `historical` no `YahooFinanceClass` | T1 |
| `src/types/portfolio.ts` | Criado — `AggregatedPosition`, `aggregatePositions()` | T2 |
| `src/app/api/portfolio/history/route.ts` | Criado — nova API route GET com auth → rate limit → Zod → `getHistory()` | T3 |
| `src/components/portfolio/price-sparkline.tsx` | Criado — Client Component com fetch lazy, skeleton, Recharts `LineChart` com dimensões fixas | T4 |
| `src/components/portfolio/position-table.tsx` | Substituído por `AggregatedPositionTable` — 11 colunas, DropdownMenu por entrada, sparkline | T5 |
| `src/components/portfolio/portfolio-client.tsx` | Modificado — usa `aggregatePositions()` via `useMemo`, passa `aggregatedPositions` para a tabela | T6 |

### Componentes shadcn/ui instalados

- `skeleton` — via `npx shadcn@latest add skeleton`
- `dropdown-menu` — via `npx shadcn@latest add dropdown-menu` (baseado em `@base-ui/react/menu`)

---

## Decisões de implementação

### Tipo `AggregatedPosition` em `src/types/portfolio.ts` (não em `portfolio-client.tsx`)

O task plan sugeria adicionar `AggregatedPosition` em `portfolio-client.tsx`, mas isso criaria um import circular: `position-table.tsx` importa `AggregatedPosition` de `portfolio-client.tsx`, e `portfolio-client.tsx` importa `AggregatedPositionTable` de `position-table.tsx`. A nota T7 do plano de tarefas já antecipava este cenário e indicava mover para `src/types/portfolio.ts` se necessário. Optou-se por colocar directamente em `src/types/portfolio.ts`, evitando o problema desde o início.

### `PriceSparkline` com dimensões fixas (sem `ResponsiveContainer`)

O prompt do Engineer especifica `width={80} height={32}` fixos para evitar problemas em contexto de tabela. A tarefa T4 do plano menciona `<ResponsiveContainer>` com wrapper `<div className="w-20">` como alternativa. Optou-se pelas dimensões fixas (conforme o prompt) por ser a abordagem mais robusta em contexto de tabela — o `ResponsiveContainer` requer um elemento pai com dimensões definidas, o que em células de tabela pode ser imprevisível.

### `DropdownMenuTrigger` sem `asChild`

O `dropdown-menu.tsx` instalado usa `@base-ui/react/menu` (não Radix UI), que não suporta a prop `asChild`. O `DropdownMenuTrigger` renderiza um `<button>` nativamente, pelo que as classes CSS são aplicadas directamente no trigger.

### Cache de histórico com TTL para falhas

Em caso de erro do Yahoo Finance, `getHistory()` guarda `{ data: [], fetchedAt: Date.now() }` no cache. Isto evita re-fetch agressivo em caso de falhas repetidas dentro do TTL de 1 hora. O caller (API route) retorna `{ data: [] }` com status 200 — a sparkline mostra `—` silenciosamente.

### Coluna "Ações" com DropdownMenu por entrada individual

Cada linha agregada tem um `DropdownMenu` que lista todas as entradas individuais (`agg.entries`). Cada entrada mostra data, quantidade e preço médio, com botões "Editar esta entrada" e "Remover esta entrada". A data mostrada é `price_updated_at` (único campo timestamp disponível no tipo `Position`), não `created_at` (não está no tipo exposto pelo backend).

---

## Critérios de Aceite — estado de implementação

| CA | Descrição | Estado |
|---|---|---|
| CA-01 | Uma linha por ticker | Implementado — `aggregatePositions()` agrupa por ticker via `Map` |
| CA-02 | Quantidade total correcta | Implementado — `reduce((s, e) => s + e.quantity, 0)` |
| CA-03 | Preço médio ponderado correcto | Implementado — `Σ(qty × avg_price) / Σqty` |
| CA-04 | Total Investido = qtd × preço médio | Implementado |
| CA-05 | Valor Actual com `—` para `null` | Implementado |
| CA-06 | Ganho/Perda com sinal, percentagem, neon-gain/neon-loss | Implementado |
| CA-07 | 11 colunas na ordem exacta | Implementado |
| CA-08 | Sparkline lazy com skeleton e fallback `—` | Implementado — estado `loading/success/error` |
| CA-09 | Cor da sparkline por isGain (não pelos dados) | Implementado — `var(--chart-1)` ou `var(--loss)` |
| CA-10 | API route `/api/portfolio/history` com cache 1h | Implementado — `historyCache` com TTL 1h |
| CA-11 | Ações por entrada individual com recálculo em tempo real | Implementado — DropdownMenu + `useMemo` re-agrega |
| CA-12 | Tipo e moeda da primeira entrada do ticker | Implementado — `entries[0].asset_type`, `entries[0].currency` |
| CA-13 | Sem cores hardcoded — tokens CSS apenas | Implementado — apenas `var(--chart-1)`, `var(--loss)`, `var(--gain)`, etc. |
| CA-14 | Estado vazio inalterado | Implementado — mensagem original preservada |

---

## Verificação T7

```
npm run typecheck → 0 erros TypeScript
npm run lint      → 0 avisos/erros ESLint
```

---

## Padrão de segurança verificado

`GET /api/portfolio/history/route.ts` segue o padrão canónico:
1. `supabase.auth.getUser()` — primeira operação, retorna 401 se não autenticado
2. `rateLimit('portfolio:history:${user.id}', 60, 60_000)` — 60 req/min por utilizador
3. Validação Zod: `ticker` obrigatório, max 20 chars, regex `^[A-Z0-9.\-]+$` (case insensitive)
4. `getHistory(ticker)` — server-only, nunca exposto ao browser directamente
5. Retorna `{ data: [] }` com status 200 em caso de erro do Yahoo Finance (nunca 500)
