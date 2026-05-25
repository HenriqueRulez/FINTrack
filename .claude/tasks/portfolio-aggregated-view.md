# Plano de Tarefas — Visão Agregada do Portfólio por Ticker

**Working item:** `.claude/working-items/portfolio-aggregated-view.md`
**Branch sugerida:** `feat/portfolio-aggregated-view`

---

## Ordem de execução

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

T1 e T2 são independentes entre si e podem ser desenvolvidas em paralelo.
T3, T4 e T5 dependem de T2 (tipo `AggregatedPosition` definido).
T6 e T7 só se executam após T3, T4 e T5 estarem concluídas.

---

## T1 — Estender `src/lib/yahoo-finance/client.ts` com `getHistory()`

**Dependências:** nenhuma

**Ficheiros a modificar:**
- `src/lib/yahoo-finance/client.ts`

**O que fazer:**

1. Estender o tipo inline do `YahooFinanceClass` para incluir o método `historical`:

```typescript
historical: (
  symbol: string,
  options: { period1: Date | string; interval?: string }
) => Promise<Array<{ date: Date; close: number; [key: string]: unknown }>>;
```

2. Declarar o tipo `HistoryPoint` exportável:

```typescript
export interface HistoryPoint {
  date: string; // ISO string — ex: "2025-04-23"
  close: number;
}
```

3. Criar cache dedicado para histórico (separado do cache de quotes):

```typescript
interface HistoryCacheEntry {
  data: HistoryPoint[];
  fetchedAt: number;
}
const historyCache = new Map<string, HistoryCacheEntry>();
const HISTORY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
```

4. Implementar a função `getHistory(ticker: string): Promise<HistoryPoint[]>`:
   - Verificar cache: se `fetchedAt` existe e está dentro do TTL de 1h, retornar valor cacheado
   - Calcular `period1` como `new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)` (30 dias atrás)
   - Chamar `yahooFinance.historical(ticker, { period1, interval: '1d' })`
   - Mapear resultado para `HistoryPoint[]`: `{ date: item.date.toISOString().split('T')[0], close: item.close }`
   - Filtrar entradas onde `close` seja um número válido (não NaN, não undefined)
   - Em caso de qualquer erro (`try/catch`): logar `console.error` e retornar `[]` — nunca lançar excepção
   - Guardar resultado no `historyCache` antes de retornar (mesmo que array vazio, para evitar re-fetch em falhas)
   - Exportar a função

**Critérios de conclusão:**
- [ ] `YahooFinanceClass` inclui método `historical` no tipo
- [ ] `HistoryPoint` exportado
- [ ] `getHistory()` exportada e usa cache de 1h separado do cache de quotes
- [ ] `getHistory()` nunca lança excepção — retorna `[]` em caso de erro
- [ ] `npm run typecheck` passa no ficheiro modificado

---

## T2 — Definir tipo `AggregatedPosition` e função `aggregatePositions()`

**Dependências:** nenhuma (tipo `Position` já existe em `position-table.tsx`)

**Ficheiros a modificar:**
- `src/components/portfolio/portfolio-client.tsx`

**O que fazer:**

1. Adicionar a interface `AggregatedPosition` no topo do ficheiro (após os imports), **antes** de qualquer componente:

```typescript
export interface AggregatedPosition {
  ticker: string;
  name: string;
  asset_type: string;
  currency: string;
  totalQty: number;
  weightedAvgPrice: number;
  totalInvested: number;
  currentPrice: number | null;
  currentValue: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
  entries: Position[]; // todas as entradas originais deste ticker
}
```

2. Implementar a função pura `aggregatePositions(positions: Position[]): AggregatedPosition[]`:
   - Usar `Map<string, Position[]>` para agrupar por ticker
   - Para cada grupo:
     - `totalQty = entries.reduce((s, e) => s + e.quantity, 0)`
     - `weightedAvgPrice = entries.reduce((s, e) => s + e.quantity * e.avg_price, 0) / totalQty`
     - `totalInvested = totalQty * weightedAvgPrice`
     - `currentPrice = entries[0].current_price` (todos os registos do mesmo ticker têm o mesmo `current_price`)
     - `currentValue = currentPrice != null ? totalQty * currentPrice : null`
     - `gainLoss = currentValue != null ? currentValue - totalInvested : null`
     - `gainLossPct = gainLoss != null ? (gainLoss / totalInvested) * 100 : null`
     - `entries` = array original (preservar todas as entradas para edição/remoção individual)
   - A ordem dos tickers no resultado segue a ordem de primeira aparição no array de input (que o backend ordena por `created_at` ascending)

**Critérios de conclusão:**
- [ ] Interface `AggregatedPosition` definida e exportada
- [ ] `aggregatePositions()` implementada como função pura (sem side effects)
- [ ] CA-02: `totalQty` é soma exacta das quantities
- [ ] CA-03: `weightedAvgPrice` é média ponderada correcta (verificar exemplo: 10@150 + 20@180 = 170,00)
- [ ] CA-04: `totalInvested = totalQty * weightedAvgPrice`
- [ ] CA-05: `currentValue = null` quando `currentPrice == null`
- [ ] CA-06: `gainLoss` e `gainLossPct` são `null` quando `currentPrice == null`
- [ ] `npm run typecheck` passa

---

## T3 — Criar API route `GET /api/portfolio/history`

**Dependências:** T1 (função `getHistory()` disponível)

**Ficheiros a criar:**
- `src/app/api/portfolio/history/route.ts`

**O que fazer:**

Criar a route seguindo o padrão canónico do `CLAUDE.md`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { getHistory } from "@/lib/yahoo-finance/client";

const HistoryQuerySchema = z.object({
  ticker: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9.\-]+$/i, "Ticker inválido"),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth — sempre primeiro
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit — 60 req/min por utilizador
  const rl = rateLimit(`portfolio:history:${user.id}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validação Zod do query param
  const { searchParams } = new URL(request.url);
  const parsed = HistoryQuerySchema.safeParse({ ticker: searchParams.get("ticker") });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // 4. Obter histórico (cache 1h em getHistory())
  const data = await getHistory(parsed.data.ticker);

  // CA-10: sempre retornar 200, mesmo em caso de array vazio (erro do Yahoo Finance)
  return NextResponse.json({ data }, { status: 200 });
}
```

**Critérios de conclusão:**
- [ ] CA-10: route existe em `src/app/api/portfolio/history/route.ts`
- [ ] `supabase.auth.getUser()` é a primeira operação — retorna 401 se não autenticado
- [ ] Rate limit com chave `portfolio:history:${user.id}`, 60 req/min
- [ ] Validação Zod: `ticker` obrigatório, max 20 chars, regex `^[A-Z0-9.\-]+$` (case insensitive)
- [ ] Retorna `{ data: HistoryPoint[] }` com status 200 sempre (incluindo array vazio)
- [ ] Nunca retorna 500 — erros do Yahoo Finance são absorvidos em `getHistory()`
- [ ] `npm run typecheck` passa no ficheiro

---

## T4 — Criar componente `<PriceSparkline />`

**Dependências:** T2 (perceber a interface), T3 (API disponível para fetch)

**Ficheiros a criar:**
- `src/components/portfolio/price-sparkline.tsx`

**O que fazer:**

```typescript
'use client';

import * as React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface PriceSparklineProps {
  ticker: string;
  isGain: boolean; // true = teal (var(--chart-1)), false = vermelho (var(--loss))
}

type SparklineState = 'loading' | 'success' | 'error';

interface HistoryPoint {
  date: string;
  close: number;
}
```

- Estado inicial: `'loading'`
- `useEffect` dispara um `fetch` a `/api/portfolio/history?ticker=${ticker}` quando o componente monta
- Em caso de erro de rede (`catch`): estado → `'error'`
- Em caso de resposta OK com `data.length < 2`: estado → `'error'` (dados insuficientes para sparkline)
- Em caso de sucesso com 2+ pontos: estado → `'success'`, guardar dados em state

Renderização por estado:
- `'loading'`: `<Skeleton className="h-8 w-20 animate-pulse" />`
- `'error'`: `<span className="text-muted-foreground text-xs">—</span>`
- `'success'`:
  ```tsx
  <ResponsiveContainer width="100%" height={32}>
    <LineChart data={points}>
      <Line
        type="monotone"
        dataKey="close"
        dot={false}
        strokeWidth={1.5}
        stroke={isGain ? "var(--chart-1)" : "var(--loss)"}
      />
    </LineChart>
  </ResponsiveContainer>
  ```

Atenção:
- O componente deve ter `width` fixo via wrapper `<div className="w-20">` para o `ResponsiveContainer` funcionar correctamente em tabela
- CA-09: a cor da linha é determinada por `isGain` (ganho/perda calculado), **não** pelos dados históricos
- CA-13: nenhuma cor hexadecimal hardcoded — apenas tokens CSS `var(--chart-1)` e `var(--loss)`

**Critérios de conclusão:**
- [ ] Componente `'use client'` criado em `src/components/portfolio/price-sparkline.tsx`
- [ ] CA-08: skeleton durante loading com `animate-pulse`
- [ ] CA-08: `—` em caso de erro de rede ou dados insuficientes (< 2 pontos)
- [ ] CA-09: cor da linha baseada em `isGain`, não nos dados históricos
- [ ] CA-13: sem cores hardcoded — apenas `var(--chart-1)` e `var(--loss)`
- [ ] Não importa nada de `src/lib/yahoo-finance/` (violação de fronteira servidor/cliente)
- [ ] `npm run typecheck` passa

---

## T5 — Actualizar `position-table.tsx` → `AggregatedPositionTable`

**Dependências:** T2 (tipo `AggregatedPosition`), T4 (componente `<PriceSparkline />`)

**Ficheiros a modificar:**
- `src/components/portfolio/position-table.tsx`

**O que fazer:**

1. Importar `AggregatedPosition` de `portfolio-client.tsx` e `PriceSparkline` de `./price-sparkline`

2. Manter a interface `Position` existente e exportada (ainda usada internamente nos `entries`)

3. Adicionar nova interface de props:

```typescript
interface AggregatedPositionTableProps {
  positions: AggregatedPosition[];
  onEdit: (id: string, data: PositionFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}
```

4. Criar/substituir o componente principal por `AggregatedPositionTable` com as colunas na ordem exacta (CA-07):
   - **Ticker** | **Nome** | **Tipo** | **Qtd. Total** | **Preço Médio** | **Preço Atual** | **Total Investido** | **Valor Atual** | **Ganho/Perda** | **Histórico 30d** | **Ações**

5. Formatação de valores (CA-05, CA-06):
   - Números: `toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
   - `Qtd. Total`: `toLocaleString("pt-BR", { maximumFractionDigits: 8 })`
   - Todas as colunas numéricas: `tabular-nums`
   - `currentPrice == null` → `<span className="text-muted-foreground">—</span>`
   - `currentValue == null` → `<span className="text-muted-foreground">—</span>`
   - `gainLoss == null` → `<span className="text-muted-foreground">—</span>`

6. Coluna Ganho/Perda (CA-06):
   ```tsx
   {agg.gainLoss != null && agg.gainLossPct != null ? (
     <span className={`font-medium tabular-nums ${
       agg.gainLoss >= 0
         ? "text-[var(--gain)] neon-gain"
         : "text-[var(--loss)] neon-loss"
     }`}>
       {agg.gainLoss >= 0 ? "+" : ""}
       {agg.gainLoss.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
       {" "}
       ({agg.gainLoss >= 0 ? "+" : ""}
       {agg.gainLossPct.toFixed(1)}%)
     </span>
   ) : (
     <span className="text-muted-foreground">—</span>
   )}
   ```

7. Coluna Histórico 30d (CA-08, CA-09):
   ```tsx
   <PriceSparkline
     ticker={agg.ticker}
     isGain={(agg.gainLoss ?? 0) >= 0}
   />
   ```

8. Coluna Ações — botão "Ações" abre `DropdownMenu` (shadcn/ui) que lista entradas individuais de `agg.entries`:
   - Cada entrada mostra: data de compra formatada, quantidade, preço médio
   - Botões "Editar" e "Remover" por entrada individual
   - `onEdit(entry.id, ...)` e `onDelete(entry.id)` — exactamente as mesmas callbacks

9. Manter estado vazio (CA-14):
   ```tsx
   if (positions.length === 0) {
     return (
       <div className="bg-card rounded-xl border border-border/50 p-10 text-center text-muted-foreground text-sm">
         Nenhuma posição cadastrada. Clique em &quot;Adicionar Posição&quot; para começar.
       </div>
     );
   }
   ```

10. Manter `AssetBadge` e `ASSET_TYPE_STYLES` inalterados

**Critérios de conclusão:**
- [ ] CA-07: 11 colunas na ordem correcta
- [ ] CA-05: `—` para `currentPrice == null`
- [ ] CA-06: ganho com `neon-gain`, perda com `neon-loss`, `null` → `—`
- [ ] CA-08: `<PriceSparkline>` na coluna Histórico 30d
- [ ] CA-11: botão Ações abre dropdown com entradas individuais editáveis e removíveis
- [ ] CA-12: badge Tipo e Moeda usam valores de `agg.entries[0]` (primeira entrada)
- [ ] CA-13: sem cores hexadecimais hardcoded
- [ ] CA-14: mensagem de estado vazio preservada
- [ ] `npm run typecheck` passa

---

## T6 — Actualizar `portfolio-client.tsx` para usar a tabela agregada

**Dependências:** T2 (`aggregatePositions()` definida no mesmo ficheiro), T5 (`AggregatedPositionTable` disponível)

**Ficheiros a modificar:**
- `src/components/portfolio/portfolio-client.tsx`

**O que fazer:**

1. Atualizar import: substituir `PositionTable` por `AggregatedPositionTable` de `./position-table`

2. Aplicar `aggregatePositions()` antes de passar dados à tabela:

```typescript
const aggregatedPositions = React.useMemo(
  () => aggregatePositions(positions),
  [positions]
);
```

   Usar `useMemo` para evitar re-agregação desnecessária a cada render.

3. Substituir `<PositionTable>` por `<AggregatedPositionTable>`:

```tsx
<AggregatedPositionTable
  positions={aggregatedPositions}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

4. `handleDelete` actual filtra por `id` no array `positions` (raw) — **manter este comportamento**. Após remoção de uma entrada, o `useMemo` re-agrega automaticamente (CA-11: recalcula sem novo fetch).

5. `handleEdit` actual actualiza a entrada pelo `id` no array `positions` (raw) — **manter este comportamento**. O `useMemo` propaga a actualização automaticamente.

6. Verificar: a prop `onSuccess` do `PositionFormDialog` de adição (`handleAdd`) ainda adiciona ao array `positions` raw — o `useMemo` agrega depois.

**Critérios de conclusão:**
- [ ] CA-01: tabela exibe uma linha por ticker distinto
- [ ] CA-11: remoção de entrada recalcula valores em tempo real (via `useMemo` re-run)
- [ ] `aggregatePositions()` envolto em `useMemo` com dependência em `[positions]`
- [ ] Fetch inicial ao `/api/portfolio` mantido (re-fresh de preços)
- [ ] `npm run typecheck` passa

---

## T7 — Typecheck e Lint

**Dependências:** T3, T4, T5, T6 (todos os ficheiros concluídos)

**O que fazer:**

```powershell
# Na raiz do projecto
npm run typecheck
npm run lint
```

**Critérios de conclusão:**
- [ ] `npm run typecheck` — zero erros TypeScript
- [ ] `npm run lint` — zero warnings ou erros ESLint
- [ ] Se houver erros: corrigir antes de marcar como concluído
- [ ] Verificar especialmente:
  - Imports circulares entre `portfolio-client.tsx` e `position-table.tsx` (ambos exportam tipos usados mutuamente) — se necessário, mover `AggregatedPosition` para um ficheiro separado (ex: `src/types/portfolio.ts`)
  - `'use client'` presente em todos os Client Components (`position-table.tsx`, `portfolio-client.tsx`, `price-sparkline.tsx`)
  - Nenhum import de `src/lib/yahoo-finance/` em Client Components

---

## Resumo de ficheiros

| Ficheiro | Acção | Tarefa |
|---|---|---|
| `src/lib/yahoo-finance/client.ts` | Modificar — adicionar `HistoryPoint`, `getHistory()`, `historyCache` | T1 |
| `src/components/portfolio/portfolio-client.tsx` | Modificar — adicionar `AggregatedPosition`, `aggregatePositions()`, `useMemo` | T2, T6 |
| `src/app/api/portfolio/history/route.ts` | Criar — nova API route GET com auth, rate limit, Zod, `getHistory()` | T3 |
| `src/components/portfolio/price-sparkline.tsx` | Criar — componente client com fetch lazy, skeleton, Recharts LineChart | T4 |
| `src/components/portfolio/position-table.tsx` | Modificar — substituir por `AggregatedPositionTable`, novas colunas, dropdown Ações | T5 |

---

## Critérios de Aceite a verificar pelo QA

| CA | Descrição | Tarefa |
|---|---|---|
| CA-01 | Uma linha por ticker | T6 |
| CA-02 | Quantidade total correcta | T2 |
| CA-03 | Preço médio ponderado correcto | T2 |
| CA-04 | Total Investido correcto | T2 |
| CA-05 | Valor Actual com `—` para `null` | T5 |
| CA-06 | Ganho/Perda com sinal, percentagem, cor e neon | T5 |
| CA-07 | Ordem das 11 colunas | T5 |
| CA-08 | Sparkline lazy com skeleton e fallback `—` | T4 |
| CA-09 | Cor da sparkline por ganho/perda | T4, T5 |
| CA-10 | API de histórico com cache 1h | T1, T3 |
| CA-11 | Ações por entrada individual com recálculo em tempo real | T5, T6 |
| CA-12 | Tipo e moeda da primeira entrada | T5 |
| CA-13 | Sem cores hardcoded | T4, T5 |
| CA-14 | Estado vazio inalterado | T5 |

---

## Notas de implementação

### Potencial import circular

`position-table.tsx` precisa de `AggregatedPosition` definido em `portfolio-client.tsx`, e `portfolio-client.tsx` importa `AggregatedPositionTable` de `position-table.tsx`. Se o TypeScript reclamar de import circular, mover a interface `AggregatedPosition` (e `Position` se necessário) para `src/types/portfolio.ts` e importar a partir daí em ambos os ficheiros.

### `ResponsiveContainer` em tabela

O `ResponsiveContainer` do Recharts precisa de um elemento pai com dimensões definidas. Envolver o `<PriceSparkline>` na célula da tabela com `<div className="w-20">` para garantir que o `ResponsiveContainer` tem referência.

### Separação server/client

- `getHistory()` em `src/lib/yahoo-finance/client.ts` — **server-only**
- A API route `/api/portfolio/history` é o ponto de acesso para o browser
- `<PriceSparkline>` faz `fetch` à API route, nunca importa `getHistory()` directamente
