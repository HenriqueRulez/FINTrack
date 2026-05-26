# Especificação Visual — Holdings Page

**Working Item:** `.claude/working-items/holdings-redesign.md`
**DESIGN.md:** consultado ✅

---

## Resumo Visual

A página `/holdings` é uma vista densa de dados financeiros organizada em duas camadas verticais: um strip de 7 KPIs numa superfície card unificada (sem gaps entre células — bordas internas dividem) seguido de um card de tabela ordenável com célula Company destacada pelo `AllocPill`. A intenção visual é terminal financeiro — monocromia dark com neon pontual nos valores de P/L e uma célula Company que comunica peso relativo sem necessidade de gráfico separado. A experiência é imediata: o utilizador lê o estado do portfólio em menos de 2 segundos.

---

## Componentes a Criar

### HoldingsPage
- **Localização:** `src/components/holdings/HoldingsPage.tsx`
- **Tipo:** Client Component (`"use client"`)
- **Layout:** `flex flex-col gap-5` dentro do `<main>` do layout dashboard. Contém: `PageHead`, `KpiStrip`, `HoldingsCard`.
- **Tokens CSS:** `bg-background`, `text-foreground`
- **Classes neon:** nenhuma directamente — delegadas aos filhos
- **shadcn/ui:** nenhum directamente
- **Estados visuais:** sem loading nesta fase (dados mock)
- **Comportamento:** Componente raiz que mantém estado global da página: `currency` (EUR | USD | Native), `showSold` (boolean), `sortCol` + `sortDir`. Passa props para os filhos. Usa `useAnimations()` para controlar classes `rise` e `d0`–`d4`.

---

### mock-data (módulo de dados)
- **Localização:** `src/components/holdings/mock-data.ts`
- **Tipo:** Módulo utilitário (sem JSX)
- **Layout:** N/A
- **Tokens CSS:** N/A
- **Classes neon:** N/A
- **shadcn/ui:** N/A
- **Estados visuais:** N/A
- **Comportamento:** Exporta:
  - `HOLDINGS: HoldingItem[]` — array com 6 posições activas + 2 fechadas (ver secção de dados abaixo)
  - `FX: Record<string, Record<string, number>>` — tabela FX mock `{ EUR: { EUR:1, USD:1.09 }, USD: { EUR:0.92, USD:1 } }` + Native resolvido em runtime
  - `SYMBOL: Record<string, string>` — `{ EUR:'€', USD:'$' }`
  - Funções auxiliares: `convertAmount(n, from, to)`, `formatMoney(n, cur, opts?)`, `formatPct(n)`

  **Estrutura de `HoldingItem`:**
  ```
  ticker: string
  name: string
  assetClass: 'Stocks' | 'ETFs' | 'Crypto' | 'Other'
  chartVar: 'chart-1' | 'chart-2' | 'chart-4' | 'chart-5'
  shares: number
  native: 'EUR' | 'USD'
  avgCost: number          // na moeda native
  costBasis: number        // na moeda native
  currentPrice: number     // na moeda native
  sold: boolean
  ```

  **Dados dos 8 tickers:**
  | ticker | name | assetClass | chartVar | shares | native | avgCost | costBasis | currentPrice | sold |
  |--------|------|-----------|---------|--------|--------|---------|-----------|-------------|------|
  | AMAT | Applied Materials, Inc. | Stocks | chart-1 | 12 | USD | 556 | 6672 | 433.62 | false |
  | VWCE | Vanguard FTSE All-World UCITS ETF | ETFs | chart-2 | 60 | EUR | 108.6 | 6516 | 122.40 | false |
  | CSPX | iShares Core S&P 500 UCITS ETF | ETFs | chart-2 | 14 | EUR | 480.2 | 6722.8 | 512.40 | false |
  | AAPL | Apple Inc. | Stocks | chart-1 | 8 | USD | 180 | 1440 | 178.40 | false |
  | MSFT | Microsoft Corp. | Stocks | chart-1 | 5 | USD | 320 | 1600 | 412.20 | false |
  | BTC | Bitcoin | Crypto | chart-4 | 0.045 | USD | 42000 | 1890 | 67400 | false |
  | TSLA | Tesla Inc. | Stocks | chart-1 | 4 | USD | 245 | 980 | 218.30 | true |
  | GLD | SPDR Gold Shares | Other | chart-5 | 6 | USD | 195 | 1170 | 198.20 | true |

---

### PageHead
- **Localização:** `src/components/holdings/PageHead.tsx`
- **Tipo:** Client Component (precisa de `useAnimations`)
- **Layout:** `flex flex-col gap-3` — título em cima, linha de metadados em baixo
- **Tokens CSS:** `text-foreground` (título), `text-muted-foreground` (meta), `text-primary` (count activo)
- **Classes neon:** `.neon-dot` no indicador de estado ao lado de "LIVE"
- **shadcn/ui:** nenhum
- **Estados visuais:** estático (sem loading)
- **Comportamento:**
  - Título `<h1>`: `text-2xl font-medium tracking-tight leading-none` — texto "Holdings"
  - Meta row: `flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground`
    - `.neon-dot` pulsante (aria-hidden)
    - Texto `"LIVE"` em `text-foreground font-medium`
    - Separador `·`
    - Contagem: `"{activeCount} active · {soldCount} closed"` em `text-muted-foreground`
  - Aplicar classes `rise d1` quando animações activas

---

### KpiStrip
- **Localização:** `src/components/holdings/KpiStrip.tsx`
- **Tipo:** Client Component
- **Layout:** `grid` com `grid-cols-7` numa única superfície card. Células divididas por bordas internas verticais — sem gap entre células. Responsivo: `grid-cols-7 → grid-cols-4 → grid-cols-2` nos breakpoints `max-1280px` e `max-900px`. Em mobile (≤700px) usar `grid-cols-2`.
- **Tokens CSS:**
  - Container: `bg-card border border-border/50 rounded-lg overflow-hidden`
  - Célula: `p-4 border-r border-border/50 flex flex-col gap-2 min-w-0`
  - Última célula: `border-r-0`
  - Em 4 colunas: células da 2.ª linha recebem `border-t border-border/50`; célula [3] perde `border-r`
  - Em 2 colunas: células pares perdem `border-r`; todas as células da linha 2+ recebem `border-t`
- **Classes neon:** `.neon-loss` aplicado ao texto do valor quando KPI é negativo (apenas Total Value e Cash quando < 0)
- **shadcn/ui:** nenhum (células manuais — mais controlo sobre bordas internas)
- **Estados visuais:** sem loading nesta fase
- **Comportamento:**
  - Props: `kpis: KpiStripItem[]`
  - Interface `KpiStripItem`: `{ label: string; value: string; sub: string; icon: ReactNode; sentiment?: 'gain' | 'loss' | 'neutral'; neon?: boolean }`
  - Animação: `rise d2` no container quando animations ON

  **Estrutura interna de cada célula (`KpiCell`):**
  ```
  <div className="kpi-cell [border-r condicional] [border-t condicional]">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</span>
      <span className="text-muted-foreground/60 shrink-0">{icon 13×13}</span>
    </div>
    <div className="text-[22px] font-medium leading-none mt-1 tabular-nums tracking-tight truncate
                    [text-[var(--gain)] | text-[var(--loss)] | text-foreground]
                    [neon-gain | neon-loss | '']">
      {value}
    </div>
    <div className="text-[10px] text-muted-foreground/60 tracking-wide truncate">{sub}</div>
  </div>
  ```

  **7 KPIs calculados em `HoldingsPage`:**
  | # | label | sub | sentiment | neon |
  |---|-------|-----|-----------|------|
  | 1 | Total Value | Investments + cash | loss se < 0, else neutral | sim se < 0 |
  | 2 | Holdings Value | Open positions | neutral | não |
  | 3 | Cash | Uninvested cash balance | loss se < 0, else neutral | não |
  | 4 | Total P/L | Since inception | gain / loss | não |
  | 5 | Unrealized P/L | Open positions | gain / loss | não |
  | 6 | Realized P/L | Closed trades | gain / loss | não |
  | 7 | Holdings | Active positions | neutral | não |

  **Valores mock calculados:**
  - `holdingsEUR` = soma de `shares × currentPrice` de cada posição activa convertida para EUR
  - `unrealizedEUR` = soma de `(currentPrice − avgCost) × shares` de activas, em EUR
  - `realizedEUR` = soma de `(currentPrice − avgCost) × shares` de fechadas, em EUR
  - `cashEUR` = `−7894.04` (sintético, conforme protótipo)
  - `totalEUR` = `holdingsEUR + cashEUR`
  - `count` = 6 (posições activas)

---

### HoldingsCard
- **Localização:** `src/components/holdings/HoldingsCard.tsx`
- **Tipo:** Client Component
- **Layout:** `bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col`
  - Header interno: `flex items-center justify-between px-5 py-4 border-b border-border/50`
  - Body: `overflow-x-auto` para scroll horizontal em viewports estreitos
- **Tokens CSS:** `bg-card`, `border-border/50`, `rounded-lg`
- **Classes neon:** nenhuma no card em si
- **shadcn/ui:** `Button` (variant `ghost`, tamanho ícone para o botão Refresh)
- **Estados visuais:** sem loading nesta fase
- **Comportamento:**
  - Props recebidas: `rows`, `currency`, `showSold`, `sort`, `onSort`, `onCurrencyChange`, `onShowSoldChange`
  - Animação: `rise d3` quando animations ON

  **Header do card:**
  - Esquerda: `<h2 className="text-lg font-medium tracking-tight leading-none">Holdings</h2>`
  - Direita (`flex items-center gap-3`):
    - Botão Refresh: `Button variant="ghost" size="icon"` com ícone SVG 14×14. No click: inicia animação de rotação `spin` (400ms) no ícone — sem fetch real
    - Toggle "Show sold" (ver componente abaixo)
    - Selector de moeda segmentado (ver componente abaixo)

---

### ShowSoldToggle
- **Localização:** `src/components/holdings/ShowSoldToggle.tsx`
- **Tipo:** Client Component
- **Layout:** `inline-flex items-center gap-2` — label à esquerda, pista à direita
- **Tokens CSS:** `text-sm text-muted-foreground`, track: `bg-muted border border-border`, track activo: `bg-primary/20 border-primary`, thumb: `bg-muted-foreground`, thumb activo: `bg-primary`
- **Classes neon:** nenhuma
- **shadcn/ui:** nenhum (toggle manual, idêntico ao `AnimationsToggle.tsx` já existente)
- **Estados visuais:**
  - OFF: track `bg-muted border-border`, thumb à esquerda (translate-x-0), cor `bg-muted-foreground`
  - ON: track `bg-primary/20 border-primary`, thumb à direita (translate-x-[14px]), cor `bg-primary`
- **Comportamento:**
  - Props: `value: boolean`, `onChange: (v: boolean) => void`
  - `role="switch"`, `aria-checked={value}`, `aria-label="Mostrar posições fechadas"`
  - Dimensões: track `w-8 h-[18px] rounded-full`, thumb `w-3 h-3 rounded-full absolute top-[2px] left-[2px]`
  - Transição thumb: `transition-transform duration-150`
  - Texto label: `"Show sold"` — `text-sm text-muted-foreground`

---

### CurrencySelector
- **Localização:** `src/components/holdings/CurrencySelector.tsx`
- **Tipo:** Client Component
- **Layout:** `inline-flex items-center` — botões segmentados sem gap, bordas partilhadas
- **Tokens CSS:**
  - Container: `border border-border/50 rounded-md overflow-hidden`
  - Botão inactivo: `px-3 py-1 text-xs text-muted-foreground bg-transparent hover:bg-muted/60 transition-colors`
  - Botão activo: `px-3 py-1 text-xs text-primary bg-primary/10 font-medium`
  - Separadores: `border-r border-border/50` em todos excepto o último
- **Classes neon:** nenhuma
- **shadcn/ui:** nenhum (segmented control manual)
- **Estados visuais:** exactamente 1 botão activo em cada momento
- **Comportamento:**
  - Props: `value: 'EUR' | 'USD' | 'Native'`, `onChange: (v: 'EUR' | 'USD' | 'Native') => void`
  - Opções fixas: `['EUR', 'USD', 'Native']`
  - `role="group"`, `aria-label="Seleccionar moeda de exibição"`

---

### HoldingsTable
- **Localização:** `src/components/holdings/HoldingsTable.tsx`
- **Tipo:** Client Component
- **Layout:** `<table className="w-full border-collapse">` dentro do wrapper `overflow-x-auto`
- **Tokens CSS:**
  - `<thead>`: `<tr>` sem fundo
  - `<th>`: `text-right px-4 py-3 border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap`
  - `<th>:first-child`: `text-left pl-5`
  - `<th>:last-child`: `pr-5`
  - `<td>`: `px-4 py-4 border-b border-border/40 text-right tabular-nums text-sm align-middle`
  - `<td>:first-child`: `pl-5 text-left`
  - `<td>:last-child`: `pr-5`
  - `<tbody tr>`: `transition-colors hover:bg-muted/40`
  - `<tbody tr>:last-child td`: `border-b-0`
- **Classes neon:** nenhuma na tabela em si (ganho/perda nas células)
- **shadcn/ui:** nenhum
- **Estados visuais:** linhas com `sold: true` têm `opacity-[0.55]` (ocultas por defeito, visíveis com `showSold`)
- **Comportamento:**
  - Props: `rows: EnrichedHolding[]`, `currency: 'EUR' | 'USD' | 'Native'`, `sort: SortState`, `onSort: (col: SortCol) => void`
  - Ordenação activa: header da coluna activa tem ícone `▼` ou `▲` em `text-primary`; outras colunas têm `↕` em `text-muted-foreground/50`
  - Clicar num header já activo inverte a direcção; clicar num novo header inicia com `'desc'`
  - `sortCol` default: `'value'`, `sortDir` default: `'desc'`
  - `cursor-pointer` nos `<th>` + `hover:text-foreground transition-colors`

  **8 colunas:**
  | Coluna | sortCol | Alinhamento | Notas |
  |--------|---------|-------------|-------|
  | Company | `'ticker'` | esquerda | AllocPill variant fill — ocupa min-w-[260px] |
  | Portfolio% | `'pct'` | direita | visível sempre (variant fill usa pill interna) |
  | Shares | `'shares'` | direita | até 4 casas decimais |
  | Avg Cost | `'avg'` | direita | moeda seleccionada |
  | Cost Basis | `'cost'` | direita | moeda seleccionada |
  | Current Price | `'price'` | direita | moeda seleccionada |
  | Market Value | `'value'` | direita | moeda seleccionada |
  | Total Gain/Loss | `'gain'` | direita | célula GainLossCell |

---

### AllocPill
- **Localização:** `src/components/holdings/AllocPill.tsx`
- **Tipo:** Client Component
- **Layout:** `flex items-center gap-3` (logo + pill) — logo fixo 32×32; pill `flex-1 h-[38px] rounded-md relative overflow-hidden border border-border/50`
- **Tokens CSS:**
  - Logo: `w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 border border-border/50`; `color: rgba(11,13,24,0.85)` — texto escuro sobre cor vivida
  - Pill container: `bg-muted` (fundo base escuro)
  - Pill fill: `absolute inset-y-0 left-0 opacity-[0.18] transition-[width] duration-[600ms] cubic-bezier(.2,.7,.2,1)`; `background: var(--bar-color)` via `style`
  - Pill content: `relative flex items-center justify-between w-full px-3 gap-3`
  - Ticker: `text-sm font-semibold tracking-wide leading-[1.2]`
  - Name: `text-xs text-muted-foreground truncate max-w-[220px]`
  - Pct: `text-xs text-foreground tabular-nums font-medium shrink-0`
- **Classes neon:** nenhuma
- **shadcn/ui:** nenhum
- **Estados visuais:**
  - Posição activa: opacidade normal
  - Posição fechada (`sold: true`): o componente pai aplica `opacity-[0.55]` na `<tr>` — AllocPill não precisa de estado próprio
- **Comportamento:**
  - Props: `holding: HoldingItem`, `pct: number`, `variant?: 'fill' | 'stripe' | 'hidden'`
  - Nesta fase, `variant` default `'fill'`
  - `style={{ '--bar-color': 'var(--chart-X)' } as CSSProperties}` para definir a cor da fill
  - A cor do logo é `var(--chart-X)` conforme `holding.chartVar`
  - Animação da fill: `transition-[width] duration-[600ms]` (CSS, sem JS)

  **Cores por asset class:**
  | assetClass | chartVar | CSS var |
  |-----------|---------|---------|
  | Stocks | chart-1 | `var(--chart-1)` — teal |
  | ETFs | chart-2 | `var(--chart-2)` — violeta |
  | Crypto | chart-4 | `var(--chart-4)` — rosa |
  | Other | chart-5 | `var(--chart-5)` — azul céu |

---

### GainLossCell
- **Localização:** `src/components/holdings/GainLossCell.tsx`
- **Tipo:** Client Component (pode ser função pura inline na tabela)
- **Layout:** `inline-flex flex-col items-end gap-1 leading-[1.2]`
- **Tokens CSS:**
  - Valor monetário: `text-sm font-medium tabular-nums text-[var(--gain)]` ou `text-[var(--loss)]`
  - Badge percentagem: `text-[10px] px-1.5 py-0.5 rounded-sm font-medium`
    - Positivo: `bg-[var(--gain)]/15 text-[var(--gain)]`
    - Negativo: `bg-[var(--loss)]/15 text-[var(--loss)]`
- **Classes neon:** nenhuma (neon reservado apenas para KPI strip)
- **shadcn/ui:** nenhum
- **Estados visuais:** gain (verde) / loss (vermelho) — sem estado neutral nesta coluna
- **Comportamento:**
  - Props: `absoluteValue: number`, `pctValue: number`, `currency: string`
  - Formata valor com sinal `+` ou `−` e símbolo da moeda
  - Badge: `+X.XX%` ou `−X.XX%`

---

## Componentes a Modificar

### Sidebar
- **Localização:** `src/components/layout/sidebar.tsx`
- **Alteração:** No array `NAV_ITEMS`, o item "Holdings" passa de `{ href: "#", active: false }` para `{ href: "/holdings", active: true }`. O ícone mantém-se (já existe `HoldingsIcon`).
- **Impacto visual:** O item "Holdings" deixa de estar desactivado (sem `opacity-40 cursor-not-allowed`) e passa a ser um `<Link>` real. Quando o utilizador está em `/holdings`, o item exibe o indicator visual activo: `bg-sidebar-accent text-primary font-medium border-l-2 border-primary pl-[10px]`.

---

## Hierarquia Visual da Página

```
┌─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (220px sticky)  │  MAIN COLUMN (flex-1)                   │
│  ─────────────────────── │  ─────────────────────────────────────  │
│  [F] FINTrack / v0.1     │  TOPBAR (h-14): date · neon-dot · sync │
│                           │  ─────────────────────────────────────  │
│  Dashboard               │  MAIN (p-6, flex-col gap-5)            │
│  Holdings ←── ACTIVO     │                                          │
│  Transactions (inactivo) │  PAGE HEAD (rise d1)                    │
│  Performance  (inactivo) │  ┌─────────────────────────────────┐   │
│  Tax Calc.    (inactivo) │  │ Holdings              [neon-dot] │   │
│                           │  │ LIVE · 6 active · 2 closed      │   │
│  ─────────────────────── │  └─────────────────────────────────┘   │
│  Settings                │                                          │
└──────────────────────────│  KPI STRIP (rise d2) — 7 células        │
                            │  ┌───┬───┬───┬───┬───┬───┬───┐        │
                            │  │ TV│ HV│ $$ │TPL│UPL│RPL│ # │        │
                            │  └───┴───┴───┴───┴───┴───┴───┘        │
                            │                                          │
                            │  HOLDINGS CARD (rise d3)               │
                            │  ┌─────────────────────────────────┐   │
                            │  │ Holdings  [↺] [Show sold ○] [EUR│USD│Native] │
                            │  │──────────────────────────────────│   │
                            │  │ Company    Pct  Shr  Avg  Cost.. │   │
                            │  │ [LOGO][===ALLOC PILL===%]        │   │
                            │  │ [LOGO][===ALLOC PILL===%]   ...  │   │
                            │  │ (posições fechadas ocultas/visiíveis) │
                            │  └─────────────────────────────────┘   │
                            └─────────────────────────────────────────┘
```

**Hierarquia de destaque:**
1. **KPI "Total Value"** — posição 1, maior impacto. Se negativo: `neon-loss` cria atenção visual imediata.
2. **KPI "Total P/L"** — posição 4, cores semânticas gain/loss.
3. **AllocPill** na tabela — ocupa toda a célula Company, visualiza peso relativo de cada posição sem gráfico separado.
4. **Coluna "Total Gain/Loss"** — badges coloridos — leitura rápida de posições ganhadoras/perdedoras.
5. **Metadados** (labels dos KPIs, headers da tabela) — `text-muted-foreground`, hierarquia inferior.

---

## Tokens e Classes Utilizados

| Elemento | Token/Classe | Motivo |
|----------|-------------|--------|
| Background da página | `bg-background` | Camada base do layout |
| KPI strip container | `bg-card border-border/50 rounded-lg` | Superfície card unificada |
| Célula KPI separator | `border-r border-border/50` | Divisão visual interna sem gap |
| Label KPI | `text-[10px] uppercase tracking-wider text-muted-foreground` | Hierarquia tertial |
| Valor KPI | `text-[22px] font-medium tabular-nums tracking-tight` | Legível em scan rápido |
| Valor KPI positivo | `text-[var(--gain)]` | Semântica financeira |
| Valor KPI negativo | `text-[var(--loss)] neon-loss` | Semântica + destaque neon |
| Holdings card | `bg-card border-border/50 rounded-lg overflow-hidden` | Consistência com DESIGN.md |
| Header do card | `border-b border-border/50` | Separação visual |
| Table header | `text-[10px] uppercase tracking-wider text-muted-foreground` | Padrão DESIGN.md tabelas |
| Table row hover | `hover:bg-muted/40` | Feedback interactivo subtil |
| Table cell separator | `border-b border-border/40` | Estrutura de leitura |
| Posição fechada | `opacity-[0.55]` | Distinção sem remoção |
| Logo asset | `bg-[var(--chart-X)]` | Cor por classe de activo |
| Alloc pill fill | `opacity-[0.18]` de `--bar-color` | Fill subtil, não distractor |
| Ticker na pill | `text-sm font-semibold tracking-wide` | Identidade primária |
| Nome na pill | `text-xs text-muted-foreground truncate` | Contexto secundário |
| Badge gain | `bg-[var(--gain)]/15 text-[var(--gain)]` | Semântica + transparência |
| Badge loss | `bg-[var(--loss)]/15 text-[var(--loss)]` | Semântica + transparência |
| Sort arrow activo | `text-primary` | Acento teal no elemento interactivo |
| Sort arrow inactivo | `text-muted-foreground/50` | Hierarquia secundária |
| Seg. button activo | `text-primary bg-primary/10 font-medium` | Sinalização de estado |
| Seg. button inactivo | `text-muted-foreground bg-transparent` | Estado default |
| Neon dot | `.neon-dot` | Status LIVE — pulsante teal |
| Rise entrance | `.rise .d0` a `.rise .d4` | Animação escalonada controlada por `useAnimations` |
| Números monetários | `tabular-nums` | Alinhamento em colunas |

---

## Estados e Feedback Visual

| Estado | Comportamento Visual |
|--------|---------------------|
| Carregamento (fase 1 — N/A) | Dados mock — sem skeleton nesta fase |
| Vazio (N/A — mock sempre tem dados) | N/A |
| Erro (N/A — mock) | N/A |
| Sort ascending | Header mostra `▲` em `text-primary` |
| Sort descending | Header mostra `▼` em `text-primary` |
| Sort inactivo | Header mostra `↕` em `text-muted-foreground/50` |
| Show sold OFF | Linhas TSLA, GLD ausentes da tabela |
| Show sold ON | Linhas TSLA, GLD no final da tabela com `opacity-[0.55]` |
| Currency EUR | Todos os valores monetários em `€` |
| Currency USD | Todos os valores monetários em `$` (FX mock aplicado) |
| Currency Native | Valores na moeda original do activo; USD convertidos com parêntesis `(€X.XX)` em `text-muted-foreground text-[0.85em]` ao lado |
| Refresh click | Ícone roda (CSS `animate-spin` 400ms via `spin` state) — sem fetch |
| Nav item Holdings activo | `bg-sidebar-accent text-primary border-l-2 border-primary pl-[10px]` |
| Animações ON | `.rise .d0`–`.d4` activos nos elementos da página |
| Animações OFF | Elementos aparecem imediatamente sem transição |
| KPI Total Value negativo | `text-[var(--loss)] neon-loss` no valor |
| KPI Total P/L positivo | `text-[var(--gain)]` |
| KPI Total P/L negativo | `text-[var(--loss)]` |
| Alloc pill | Fill anima de 0% → pct% em 600ms cubic-bezier ao montar |

---

## Notas para o Frontend

### Estrutura de ficheiros a criar
```
src/
  app/(dashboard)/holdings/page.tsx        ← Server Component (stub simples, monta HoldingsPage)
  components/holdings/
    HoldingsPage.tsx                        ← Client Component root + state
    PageHead.tsx
    KpiStrip.tsx
    HoldingsCard.tsx
    ShowSoldToggle.tsx
    CurrencySelector.tsx
    HoldingsTable.tsx
    AllocPill.tsx
    GainLossCell.tsx
    mock-data.ts
```

### Layout da rota `/holdings`
A rota `/holdings` usa o mesmo `DashboardLayout` (`src/app/(dashboard)/layout.tsx`) que o `/dashboard`. Não criar novo layout — apenas criar `src/app/(dashboard)/holdings/page.tsx` como Server Component que renderiza `<HoldingsPage />`.

### Responsividade do KPI Strip
O strip usa classes Tailwind com breakpoints. Classes sugeridas:
```
grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7
```
Bordas internas condicionais via nth-child Tailwind ou lógica JS inline (passar `isLast`, `isNewRow` como props). Abordagem recomendada: calcular via index no render — `i % cols === cols - 1` para omitir `border-r`.

### Custom CSS Property no AllocPill
A cor dinâmica da fill usa `style={{ '--bar-color': `var(--${holding.chartVar})` } as React.CSSProperties}`. TypeScript exige o `as React.CSSProperties` para aceitar CSS custom properties.

### Formatação de moeda — locale pt-PT vs en-GB
O protótipo usa `en-GB` (ponto decimal, vírgula para milhares: `€1,234.56`). O dashboard existente usa `pt-PT` (`€1 234,56`). **Para consistência com o restante da app, usar `pt-PT`** com `Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })`. Para USD usar `currency: 'USD'`.

### Acessibilidade da tabela
- `<table>` com `<caption className="sr-only">Posições do portfólio</caption>`
- Botões de sort nos `<th>`: usar `<button>` dentro do `<th>` em vez de `onClick` directo no `<th>` — melhor semântica para screen readers
- `aria-sort="ascending" | "descending" | "none"` nos `<th>` de sort

### z-index e overflow
- O wrapper `overflow-x-auto` da tabela deve estar no `HoldingsCard` (sobre o body, não no container do card) para que o scroll horizontal não corte o `rounded-lg` do card — usar `overflow-hidden` apenas no card raiz, `overflow-x-auto` num div interno.

### Animações escalonadas
Usar o mesmo padrão do dashboard:
```tsx
const { enabled: animationsEnabled } = useAnimations();
const rise = animationsEnabled ? 'rise' : '';
// PageHead → `${rise} d1`
// KpiStrip → `${rise} d2`
// HoldingsCard → `${rise} d3`
```

### Tipo `SortCol`
```ts
type SortCol = 'ticker' | 'pct' | 'shares' | 'avg' | 'cost' | 'price' | 'value' | 'gain';
type SortDir = 'asc' | 'desc';
interface SortState { col: SortCol; dir: SortDir; }
```

### Cálculo de Portfolio%
```
pct = holdingMarketValueEUR / totalActiveHoldingsValueEUR * 100
```
Calculado em `HoldingsPage` sobre valores EUR. Para posições fechadas, `pct = 0` (não participam no total de holdings activas).
