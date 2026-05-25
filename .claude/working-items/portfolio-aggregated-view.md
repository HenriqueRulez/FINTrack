# Working Item — Visão Agregada do Portfólio por Ticker

## Descrição

O portfólio actualmente exibe uma linha por registo de compra, causando duplicação visual quando o utilizador tem múltiplas entradas do mesmo ticker (ex: compras parciais ao longo do tempo). Esta feature transforma a tabela numa visão agregada: uma linha por ticker com todos os dados financeiros consolidados (quantidade total, preço médio ponderado, total investido, valor actual, ganho/perda absoluto e percentual) e uma sparkline inline com o histórico de preços dos últimos 30 dias.

A agregação é feita inteiramente no frontend a partir das posições já retornadas pelo backend — sem alterações de schema de base de dados. Uma nova API route (`GET /api/portfolio/history`) fornece os dados históricos para as sparklines, com cache de 1 hora em memória no servidor.

---

## Critérios de Aceite

### CA-01 — Agregação por ticker
A tabela exibe exactamente uma linha por ticker distinto, independentemente do número de entradas de compra na base de dados para esse ticker.

### CA-02 — Quantidade total correcta
A quantidade total apresentada para cada ticker é a soma exacta de `quantity` de todas as entradas desse ticker (`Σ qty_i`). Valor numérico validável contra a soma manual das entradas individuais.

### CA-03 — Preço médio ponderado correcto
O preço médio exibido é calculado como `Σ(qty_i × avg_price_i) / Σqty_i`. Verificável: duas compras de AAPL (10 unid. a 150 e 20 unid. a 180) devem mostrar preço médio de `(10×150 + 20×180) / 30 = 170,00`.

### CA-04 — Total Investido correcto
A coluna "Total Investido" exibe `quantidade_total × preço_médio_ponderado` com 2 casas decimais. Usando o exemplo do CA-03: `30 × 170,00 = 5.100,00`.

### CA-05 — Valor Actual correcto
A coluna "Valor Actual" exibe `quantidade_total × current_price`. Se `current_price` for `null`, exibe `—` (em dash) com `text-muted-foreground`.

### CA-06 — Ganho/Perda com sinal e percentagem
A coluna "Ganho/Perda" exibe o valor absoluto e percentual: ex `+€120,50 (+3,2%)` ou `-R$ 45,00 (-1,8%)`. Ganho usa `text-[var(--gain)] neon-gain`; perda usa `text-[var(--loss)] neon-loss`. Se `current_price` for `null`, exibe `—`.

### CA-07 — Ordem das colunas
As colunas aparecem exactamente nesta ordem: Ticker | Nome | Tipo | Qtd. Total | Preço Médio | Preço Atual | Total Investido | Valor Atual | Ganho/Perda | Histórico 30d | Ações.

### CA-08 — Sparkline lazy com skeleton
A coluna "Histórico 30d" exibe um `<Skeleton>` animado enquanto o fetch ao `/api/portfolio/history?ticker=X` está em curso. Após resolução: se bem-sucedido, mostra o gráfico; se erro de rede ou dados insuficientes (< 2 pontos), mostra `—`.

### CA-09 — Cor da sparkline condicional
A linha da sparkline é teal (`var(--chart-1)`) se o ganho/perda do ticker for positivo ou zero, e vermelha (`var(--loss)`) se negativo. A cor é determinada pelo estado de ganho/perda calculado no CA-06, não pelos dados históricos isoladamente.

### CA-10 — API route de histórico com cache
`GET /api/portfolio/history?ticker=AAPL` retorna `{ data: { date: string, close: number }[] }` com os últimos 30 dias. Respostas são cacheadas em memória por 1 hora por ticker. Uma segunda chamada ao mesmo ticker dentro de 1 hora não aciona nova chamada ao Yahoo Finance (verificável via logs de servidor ou mock).

### CA-11 — Acções de edição e remoção por entrada individual
O botão "Ações" de cada linha agregada abre um sub-menu ou modal que lista todas as entradas individuais desse ticker, permitindo editar ou remover cada uma delas separadamente. A remoção de uma entrada recalcula os valores agregados em tempo real no estado React sem novo fetch.

### CA-12 — Tipo e moeda da primeira entrada
O badge de Tipo e o campo Moeda usam os valores da primeira entrada (por `created_at` ascendente) do ticker, coerente com o comportamento actual do backend que ordena por `created_at ascending`.

### CA-13 — Design system sem hardcoding
Nenhuma cor hexadecimal hardcoded no componente. Todos os valores de cor referenciam tokens CSS do design system (`var(--gain)`, `var(--loss)`, `var(--chart-1)`, `var(--border)`, etc.).

### CA-14 — Estado vazio inalterado
Quando o portfólio não tem posições, mantém-se a mensagem existente: "Nenhuma posição cadastrada. Clique em 'Adicionar Posição' para começar."

---

## Notas Técnicas para o Engineer

### Agregação no frontend (`portfolio-client.tsx`)

```typescript
// Tipo para linha agregada
interface AggregatedPosition {
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
  entries: Position[]; // entradas originais para edição/remoção
}

function aggregatePositions(positions: Position[]): AggregatedPosition[] {
  const map = new Map<string, Position[]>();
  for (const p of positions) {
    if (!map.has(p.ticker)) map.set(p.ticker, []);
    map.get(p.ticker)!.push(p);
  }

  return Array.from(map.entries()).map(([ticker, entries]) => {
    const totalQty = entries.reduce((s, e) => s + e.quantity, 0);
    const weightedAvgPrice =
      entries.reduce((s, e) => s + e.quantity * e.avg_price, 0) / totalQty;
    const totalInvested = totalQty * weightedAvgPrice;
    const currentPrice = entries[0].current_price; // mesma para todas as entradas do ticker
    const currentValue = currentPrice != null ? totalQty * currentPrice : null;
    const gainLoss = currentValue != null ? currentValue - totalInvested : null;
    const gainLossPct = gainLoss != null ? (gainLoss / totalInvested) * 100 : null;

    return {
      ticker,
      name: entries[0].name,
      asset_type: entries[0].asset_type,
      currency: entries[0].currency,
      totalQty,
      weightedAvgPrice,
      totalInvested,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct,
      entries,
    };
  });
}
```

### Nova API route — `src/app/api/portfolio/history/route.ts`

- Método: `GET`
- Query param: `ticker` (string, obrigatório, máximo 20 chars, apenas alfanuméricos + `.` + `-`)
- Auth: `supabase.auth.getUser()` — padrão canónico
- Rate limit: `rateLimit(\`portfolio:history:${user.id}\`, 60, 60_000)`
- Validação Zod: `z.object({ ticker: z.string().min(1).max(20).regex(/^[A-Z0-9.\-]+$/i) })`
- Yahoo Finance: usar `yahooFinance.historical(ticker, { period1: thirtyDaysAgo, interval: '1d' })` — requer extensão do tipo no `client.ts`
- Cache em memória: `Map<string, { data: HistoryPoint[]; fetchedAt: number }>` com TTL de 1 hora
- Resposta: `{ data: { date: string; close: number }[] }` (apenas campos necessários para a sparkline)
- Em caso de erro do Yahoo Finance: retornar `{ data: [] }` com status 200 (não falhar a UI)

### Extensão do `src/lib/yahoo-finance/client.ts`

Adicionar função `getHistory(ticker: string): Promise<HistoryPoint[]>` que:
1. Verifica cache interno de 1 hora
2. Chama `yahooFinance.historical(ticker, { period1, interval: '1d' })`
3. Mapeia para `{ date: string; close: number }[]`
4. Retorna array vazio em caso de erro (nunca lança excepção para o caller)

O tipo do `YahooFinanceClass` no require precisa de incluir `historical`.

### Componente `<PriceSparkline />` — `src/components/portfolio/price-sparkline.tsx`

```typescript
'use client';

interface PriceSparklineProps {
  ticker: string;
  isGain: boolean; // determina a cor da linha
}
```

- Usa `useState` + `useEffect` para fetch lazy a `/api/portfolio/history?ticker=X`
- Estado: `'loading' | 'success' | 'error'`
- Loading: `<Skeleton className="h-8 w-20 bg-muted animate-pulse rounded" />`
- Erro ou dados vazios (< 2 pontos): `<span className="text-muted-foreground">—</span>`
- Sucesso: `<LineChart>` do Recharts com width=80, height=32, sem eixos, sem tooltip, sem legenda
  - `<Line type="monotone" dataKey="close" dot={false} strokeWidth={1.5} stroke={isGain ? 'var(--chart-1)' : 'var(--loss)'} />`
  - `<ResponsiveContainer width="100%" height={32}>`

### Ações por linha agregada

O botão "Ações" no `AggregatedPositionTable` abre um `<DropdownMenu>` (shadcn/ui) com a lista de entradas individuais. Cada entrada mostra: data de compra, qtd, preço médio, e botões "Editar" e "Remover". Reutilizar `PositionFormDialog` e `PositionDeleteDialog` já existentes.

Alternativamente (mais simples): manter o comportamento actual mas adaptar para a primeira entrada do ticker, se o utilizador tiver apenas um registo por ticker. Documentar a escolha na PR.

### Ficheiros a criar/modificar

| Ficheiro | Acção |
|---|---|
| `src/components/portfolio/position-table.tsx` | Substituir por `AggregatedPositionTable` ou renomear e criar novo |
| `src/components/portfolio/portfolio-client.tsx` | Adicionar `aggregatePositions()`, passar dados agregados à tabela |
| `src/components/portfolio/price-sparkline.tsx` | Criar novo componente |
| `src/app/api/portfolio/history/route.ts` | Criar nova API route |
| `src/lib/yahoo-finance/client.ts` | Adicionar `getHistory()` e tipo `historical` |

### Não alterar

- Schema da base de dados (`portfolio_positions`)
- API routes existentes (`/api/portfolio`, `/api/portfolio/[id]`)
- Componentes `PositionFormDialog`, `PositionDeleteDialog`
- Ficheiro `src/types/database.ts` (gerado pelo CLI)

---

## Casos de Teste para QA

### Caso 1 — Ticker único (1 entrada)
**Setup:** Portfólio com apenas 1 entrada: AAPL, 10 unid., avg_price 150, current_price 165.

**Verificar:**
- Tabela tem 1 linha com ticker AAPL
- Qtd. Total = 10
- Preço Médio = 150,00
- Total Investido = 1.500,00
- Valor Actual = 1.650,00
- Ganho/Perda = +150,00 (+10,0%) com cor verde e neon-gain
- Sparkline carrega (skeleton → gráfico teal)

---

### Caso 2 — Múltiplas entradas do mesmo ticker
**Setup:** 3 entradas de MSFT:
- 10 unid. a 280
- 20 unid. a 310
- 5 unid. a 295

**Verificar:**
- Tabela exibe 1 linha para MSFT (não 3)
- Qtd. Total = 35
- Preço Médio Ponderado = (10×280 + 20×310 + 5×295) / 35 = (2800 + 6200 + 1475) / 35 = 10475 / 35 = **299,29** (arredondado a 2 casas)
- Total Investido = 35 × 299,29 = **10.475,00**
- Remoção de 1 entrada recalcula os valores restantes em tempo real sem recarregar a página

---

### Caso 3 — Múltiplos tickers distintos
**Setup:** Portfólio com AAPL (2 entradas), MSFT (1 entrada), BTC-USD (1 entrada).

**Verificar:**
- Tabela tem exactamente 3 linhas (uma por ticker)
- Cada linha mostra badge de Tipo correcto (Stock, Stock, Crypto)
- Sparklines carregam de forma independente e assíncrona (podem chegar em momentos diferentes)
- Nenhuma linha de um ticker afecta os valores calculados de outro

---

### Caso 4 — Ticker sem current_price (`null`)
**Setup:** Posição com ticker cujo `current_price` é `null` (ex: após falha do Yahoo Finance ou ticker recém-adicionado com cache não preenchido).

**Verificar:**
- Coluna "Preço Atual" exibe `—` (`text-muted-foreground`)
- Coluna "Valor Actual" exibe `—`
- Coluna "Ganho/Perda" exibe `—`
- Sparkline ainda tenta carregar o histórico de forma independente
- Sem erros de runtime no console

---

### Caso 5 — Sparkline a carregar (estado de loading)
**Setup:** Simular latência de rede (throttle no DevTools para "Slow 3G") e recarregar a página.

**Verificar:**
- Enquanto `/api/portfolio/history?ticker=X` está pendente, a célula da coluna "Histórico 30d" mostra `<Skeleton>` animado com `animate-pulse`
- O skeleton não bloqueia a renderização da linha — os outros valores (preço, ganho, etc.) aparecem imediatamente
- Após a resposta chegar, o skeleton é substituído pelo gráfico sem flash/layout shift significativo

---

### Caso 6 — Erro de rede no histórico
**Setup:** Bloquear `GET /api/portfolio/history` no DevTools (block request URL) ou forçar retorno de erro no servidor.

**Verificar:**
- A célula da coluna "Histórico 30d" exibe `—` com `text-muted-foreground` (sem crash)
- O resto da linha permanece funcional (valores, botões de acção)
- Sem `unhandled promise rejection` no console
- A API route retorna `{ data: [] }` com status 200 quando o Yahoo Finance falha (não 500)

---

### Caso 7 — Portfólio vazio
**Setup:** Utilizador autenticado sem nenhuma posição registada.

**Verificar:**
- Exibe a mensagem existente: "Nenhuma posição cadastrada. Clique em 'Adicionar Posição' para começar."
- Nenhum fetch a `/api/portfolio/history` é efectuado
- Botão "+ Adicionar Posição" permanece funcional

---

## Definição de Pronto

- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem warnings
- [ ] Todos os 14 critérios de aceite verificados manualmente
- [ ] Todos os 7 casos de teste de QA executados e aprovados
- [ ] Nenhuma cor hardcoded — apenas tokens CSS do design system
- [ ] API route `/api/portfolio/history` segue o padrão canónico (auth → rate limit → validação Zod → lógica)
- [ ] Cache de 1 hora em memória implementado e validado via logs
