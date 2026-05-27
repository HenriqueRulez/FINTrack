# Especificação Visual — Performance Page

**Working Item:** `.claude/working-items/performance-redesign.md`
**DESIGN.md:** consultado ✅
**Protótipo:** `.claude/design-handoff/project/Performance.html` + `performance-app.jsx` ✅
**Referência:** `.claude/reports/design-holdings-redesign.md` ✅

---

## Resumo Visual

A página `/performance` é uma vista analítica de qualidade de trading — a complement à página Holdings que mostra o "quê" do portfólio, enquanto Performance revela o "como". A estrutura visual segue o mesmo esqueleto já estabelecido (sidebar sticky + topbar + main `flex-col gap-5`), introduzindo dois novos padrões visuais: o **KPI strip com micro-visualizações embutidas** (gauge, split bar, tick row) e a **Trade Analysis table** com sparklines SVG inline. O tom é de terminal financeiro quantitativo — dense, monocromatico dark, com neon pontual nos valores semânticos e nos indicadores de actividade.

---

## Layout Geral

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (220px sticky)    │  MAIN COLUMN (flex-1)                           │
│  ─────────────────────────│  ───────────────────────────────────────────── │
│  [F] FINTrack / v0.1      │  TOPBAR (border-b border-border/50)            │
│                            │    date (rise d0) · neon-dot · "Sync · Xm ago" │
│  Dashboard                 │  ─────────────────────────────────────────────  │
│  Holdings                  │  MAIN (p-6, flex-col gap-5)                     │
│  Transactions (inactivo)  │                                                  │
│  Performance ←── ACTIVO   │  PAGE HEAD (rise d1)                            │
│  Tax Calculator (inactivo)│  ┌──────────────────────────────────────────┐   │
│                            │  │ h1: "Performance"                        │   │
│  ─────────────────────────│  │ meta: [neon-dot] LIVE · 4 active · 2 closed  │
│  Settings                 │  │ seg: [1M][3M][YTD*][1Y][ALL]             │   │
└────────────────────────── │  └──────────────────────────────────────────┘   │
                             │                                                  │
                             │  KPI STRIP (rise d2) — 5 células               │
                             │  ┌───┬───┬───┬───┬───┐                         │
                             │  │ WR│ PS│OAH│AWH│ALH│                         │
                             │  └───┴───┴───┴───┴───┘                         │
                             │                                                  │
                             │  TRADE ANALYSIS CARD (rise d3)                 │
                             │  ┌────────────────────────────────────────┐    │
                             │  │ Trade Analysis     [EUR│USD│Native]    │    │
                             │  │────────────────────────────────────────│    │
                             │  │ Asset Status Hold Inv Rea Unr Tot Spk ROI│  │
                             │  │ [row × 4 active + 2 closed optional]   │    │
                             │  └────────────────────────────────────────┘    │
                             └──────────────────────────────────────────────────┘
```

O layout usa o `DashboardLayout` existente em `src/app/(dashboard)/layout.tsx` — sem criar novo layout, apenas uma nova route `src/app/(dashboard)/performance/page.tsx`.

---

## Componentes a Criar

### PerformancePage
- **Localização:** `src/components/performance/PerformancePage.tsx`
- **Tipo:** Client Component (`"use client"`)
- **Layout:** `flex flex-col gap-5` dentro do `<main>` do layout dashboard
- **Tokens CSS:** `bg-background text-foreground`
- **Estado global mantido:**
  - `currency: 'EUR' | 'USD' | 'Native'` — default `'EUR'`
  - `showClosed: boolean` — default `false`
  - `density: 'compact' | 'comfortable' | 'spacious'` — default `'comfortable'`
  - `period: '1M' | '3M' | 'YTD' | '1Y' | 'ALL'` — default `'YTD'`
  - `sort: { col: TradeSortCol; dir: 'asc' | 'desc' }` — default `{ col: 'totalEUR', dir: 'desc' }`
- **Comportamento:** Componente raiz que calcula KPIs e dados enriquecidos a partir de `TRADES` mock, passa props para `PerformancePageHead`, `KPIStrip` e `TradeAnalysisCard`. Usa `useAnimations()` para classes `rise`/`d0`–`d3`.

---

### mock-data (módulo de dados — performance)
- **Localização:** `src/components/performance/mock-data.ts`
- **Tipo:** módulo utilitário sem JSX
- **Estrutura `TradeItem`:**
  ```ts
  interface TradeItem {
    ticker: string;
    name: string;
    chart: 'chart-1' | 'chart-2' | 'chart-5';
    status: 'active' | 'closed';
    holdDays: number;
    invested: number;   // na moeda native
    realized: number;   // na moeda native
    unrealized: number; // na moeda native
    native: 'EUR' | 'USD';
  }
  ```
- **Dados mock — 6 registos obrigatórios:**
  | ticker | name | chart | status | holdDays | invested | realized | unrealized | native |
  |--------|------|-------|--------|----------|---------|---------|------------|--------|
  | VWCE | Vanguard FTSE All-World UCITS ETF | chart-2 | active | 54 | 180.00 | 0.00 | 2243.65 | EUR |
  | AMAT | Applied Materials, Inc. | chart-1 | active | 110 | 6672.00 | 0.00 | -2191.84 | USD |
  | CSPX | iShares Core S&P 500 UCITS ETF | chart-2 | active | 72 | 6722.80 | 0.00 | 450.40 | EUR |
  | MSFT | Microsoft Corp. | chart-1 | active | 198 | 1600.00 | 0.00 | 461.00 | USD |
  | TSLA | Tesla Inc. | chart-1 | closed | 0 | 980.00 | -106.80 | 0.00 | USD |
  | GLD | SPDR Gold Shares | chart-5 | closed | 0 | 1170.00 | 19.20 | 0.00 | USD |
- **FX mock:** `{ EUR: { EUR: 1, USD: 1.09 }, USD: { EUR: 0.92, USD: 1 } }`
- **Exportações:**
  - `TRADES: TradeItem[]`
  - `FX: Record<string, Record<string, number>>`
  - `SYMBOL: Record<string, string>` — `{ EUR: '€', USD: '$', Native: '' }`
  - `convertTrade(amount, from, to)` — aplica FX mock
  - `formatTradeAmount(n, cur, opts?)` — pt-PT locale com currency
  - `formatPct(n)` — com sinal + e 2 casas decimais
  - `formatHoldDays(days)` — `'Xm Yd'`, `'Xd'` ou `'—'` se `days <= 0`
  - `generateSparkSeed(ticker)` — `(ticker.charCodeAt(0) * 31 + ticker.charCodeAt(1)) % 9999`

**Nota importante:** Este módulo é separado do `src/components/holdings/mock-data.ts` existente porque os dados de Performance têm uma estrutura diferente (`TradeItem` vs `HoldingItem`). A estrutura reutiliza as funções FX e formatação mas com tipos distintos.

---

### PerformancePageHead
- **Localização:** `src/components/performance/PerformancePageHead.tsx`
- **Tipo:** Client Component
- **Layout:** `flex items-end justify-between gap-5 flex-wrap` — título+meta à esquerda, segmented control de período à direita
- **Tokens CSS:** `text-foreground` (título), `text-muted-foreground` (meta), `text-primary` (contagem activos)
- **Classes neon:** `.neon-dot` pulsante no indicador LIVE
- **shadcn/ui:** nenhum
- **Comportamento:**
  - Props: `activeCount: number`, `closedCount: number`, `period: Period`, `onPeriodChange: (p: Period) => void`
  - Animação: `rise d1` quando animations ON

**Estrutura interna:**
```
<div className="flex flex-col gap-3">
  <h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">
    Performance
  </h1>
  <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
    <span className="neon-dot" aria-hidden="true" />
    <span className="text-foreground font-medium">LIVE</span>
    <span>·</span>
    <span>
      <span className="text-primary">{activeCount} active</span>
      {" · "}
      {closedCount} closed
    </span>
  </div>
</div>

<div role="group" aria-label="Selector de período"
  className="inline-flex items-center bg-muted border border-border/50 rounded-md p-[2px] gap-[2px]">
  {['1M','3M','YTD','1Y','ALL'].map((p) => (
    <button key={p}
      onClick={() => onPeriodChange(p)}
      aria-pressed={period === p}
      className={[
        "px-3 py-[5px] text-xs rounded-sm transition-colors font-medium tracking-wide uppercase",
        period === p
          ? "bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "text-muted-foreground hover:text-foreground"
      ].join(' ')}
    >{p}</button>
  ))}
</div>
```

**Nota:** O selector de período é apenas visual nesta fase — não filtra dados. A lógica de state existe em `PerformancePage` para futura expansão.

---

### KPIStrip (Performance — 5 células com micro-visualizações)
- **Localização:** `src/components/performance/KPIStrip.tsx`
- **Tipo:** Client Component
- **Layout:** `grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5` — superfície card unificada sem gaps, bordas internas
- **Tokens CSS:** `bg-card border border-border/50 rounded-lg overflow-hidden`
- **shadcn/ui:** nenhum (células manuais — controlo total de bordas internas)
- **Animação:** `rise d2` no container quando animations ON

**Grid responsivo:**
| Viewport | Colunas | Notas |
|---------|---------|-------|
| `< 900px` (base) | 2 | Células 3, 4, 5 passam para linhas novas |
| `≥ 900px` (`lg`) | 3 | Células 4, 5 passam para linha nova |
| `≥ 1280px` (`xl`) | 5 | Linha única — sem top borders |

**Bordas internas em cada célula:**
- `border-r border-border/50` em todas excepto a última de cada linha
- `border-t border-border/50` nas células de linhas ≥ 2 (calculado por index)
- Em 3 colunas: célula [2] (index 2) perde `border-r`; células [3], [4] recebem `border-t`
- Em 2 colunas: células com index par recebem `border-t` (excepto as 2 primeiras); células [1], [3] perdem `border-r`

**Estrutura de cada KPI cell:**
```tsx
<div className="p-5 flex flex-col gap-3 min-w-0 [border-r/t condicionais]">
  {/* Linha topo: label + ícone */}
  <div className="flex items-center justify-between gap-2">
    <span className="text-[13px] text-foreground font-medium truncate">{label}</span>
    <span className={`shrink-0 ${iconColorClass}`} aria-hidden="true">{icon}</span>
  </div>

  {/* Valor principal */}
  <div className={`text-[28px] font-semibold leading-none tabular-nums tracking-tight truncate ${valueColorClass}`}>
    {value}
    {/* unidade em menor tamanho inline */}
    {unit && <span className="text-[0.62em] text-muted-foreground ml-1 font-normal">{unit}</span>}
  </div>

  {/* Subtítulo */}
  <div className="text-[12px] text-muted-foreground tracking-wide truncate">{sub}</div>

  {/* Micro-visualização */}
  <div className="mt-auto pt-2">{microViz}</div>
</div>
```

**Ícones (inline SVG 16×16):**
- KPI 1 Win Rate: ícone `target` (círculos concêntricos) — `text-muted-foreground`
- KPI 2 Profit Split: ícone `wallet` (carteira) — `text-muted-foreground`
- KPI 3 Overall Avg Hold: ícone `clock` — `text-muted-foreground`
- KPI 4 Avg Winner Hold: ícone `clock` — `text-[var(--gain)]` (class `tone-gain`)
- KPI 5 Avg Loser Hold: ícone `clock` — `text-[var(--loss)]` (class `tone-loss`)

---

### KPIWinRate (sub-componente de KPIStrip)
- **Localização:** inline dentro de `KPIStrip.tsx` ou ficheiro separado `KPIWinRate.tsx`
- **Micro-viz:** Gauge horizontal
  ```tsx
  <div className="h-[6px] rounded-full bg-muted overflow-hidden relative">
    <div
      className="absolute inset-y-0 left-0 bg-primary rounded-full"
      style={{ width: `${rate}%`, transition: 'width 700ms cubic-bezier(.2,.7,.2,1)' }}
    />
  </div>
  ```
- **Valor:** `"50.0%"` — `text-[28px] font-semibold text-foreground`
- **Sub:** `"Of positions are profitable"` — `text-muted-foreground`

---

### KPIProfitSplit (sub-componente de KPIStrip)
- **Localização:** inline dentro de `KPIStrip.tsx` ou ficheiro separado `KPIProfitSplit.tsx`
- **Micro-viz:** Split bar bicolor
  ```tsx
  <div className="flex h-[6px] rounded-full overflow-hidden bg-muted">
    <div className="bg-[var(--gain)]" style={{ width: `${realizedPct}%` }} />
    <div className="bg-primary opacity-55" style={{ width: `${unrealizedPct}%` }} />
  </div>
  ```
- **Valor:** `"7% / 93%"` — label e percentagens separadas por `<span className="text-[0.62em] text-muted-foreground mx-1">/</span>`
- **Sub:** `"Realized vs Unrealized"` — `text-muted-foreground`
- **Nota:** Os dois segmentos somam sempre 100% (calculado por `absRea / (absRea + absUnr) * 100`)

---

### KPIHoldPeriod (sub-componente genérico para KPIs 3, 4, 5)
- **Localização:** inline ou `KPIHoldPeriod.tsx`
- **Props:** `label: string`, `days: number`, `sub: string`, `tone: 'neutral' | 'gain' | 'loss'`, `distribution: Array<'active' | 'gain' | 'loss' | 'off'>`
- **Valor:** `"{days}"` + unidade `"Days"` — cor do valor segue `tone`:
  - `neutral`: `text-foreground`
  - `gain`: `text-[var(--gain)]`
  - `loss`: `text-[var(--loss)]`
- **Micro-viz:** Tick row (10 ticks)
  ```tsx
  <div className="flex items-center gap-[6px] h-[6px]">
    {distribution.map((state, i) => (
      <div key={i} className={`flex-1 h-full rounded-[2px] ${tickClass(state)}`} />
    ))}
  </div>
  ```
  `tickClass`:
  - `'active'` → `bg-primary` (teal)
  - `'gain'` → `bg-[var(--gain)]` (verde)
  - `'loss'` → `bg-[var(--loss)]` (vermelho)
  - `'off'` → `bg-muted`
- **Algoritmo tick distribution:** Array de 10 ticks; sortear o grupo (`active`, `winners`, `losers`) por `holdDays`; atribuir `tone` aos primeiros N ticks (N = tamanho do grupo); restantes `'off'`

---

### TradeAnalysisCard
- **Localização:** `src/components/performance/TradeAnalysisCard.tsx`
- **Tipo:** Client Component
- **Layout:** `bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col`
  - Header: `flex items-center justify-between px-5 py-4 border-b border-border/50`
  - Body: `overflow-x-auto` para scroll horizontal em viewports estreitos
- **Animação:** `rise d3` quando animations ON
- **Props:** `rows: EnrichedTrade[]`, `currency: Currency`, `sort: TradeSortState`, `onSort: (col: TradeSortCol) => void`, `onCurrencyChange: (v: Currency) => void`

**Header do card:**
```
Esquerda: <h2 className="text-[22px] font-medium tracking-tight leading-none">Trade Analysis</h2>
Direita:  <CurrencySelector /> (reutilizado de src/components/holdings/CurrencySelector.tsx)
```

**Nota de reutilização:** `CurrencySelector` de `src/components/holdings/CurrencySelector.tsx` é directamente reutilizável — aceita `value: Currency` e `onChange: (v: Currency) => void` que são os mesmos tipos.

---

### TradeTable
- **Localização:** `src/components/performance/TradeTable.tsx`
- **Tipo:** Client Component
- **Layout:** `<table className="w-full border-collapse">` dentro do wrapper `overflow-x-auto`
- **Tokens CSS:**
  - `<thead>`: sem fundo
  - `<th>`: `text-right px-4 py-3 border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap`
  - `<th>:first-child`: `text-left pl-5`
  - `<th>:last-child`: `pr-5`
  - `<td>`: `px-4 py-4 border-b border-border/40 text-right tabular-nums text-[13px] align-middle`
  - `<td>:first-child`: `pl-5 text-left`
  - `<td>:last-child`: `pr-5`
  - `<tbody tr>`: `transition-colors hover:bg-muted/40 duration-[140ms]`
  - `<tbody tr>:last-child td`: `border-b-0`
- **Variante de densidade:**
  - `compact`: td `py-2 px-3 text-[12px]`, th `py-2 px-3`
  - `comfortable`: td `py-4 px-4` (default)
  - `spacious`: td `py-5 px-4`, th `py-4 px-4`

**9 colunas da tabela:**
| # | Header | sortCol | Alinhamento | Largura mínima |
|---|--------|---------|------------|----------------|
| 1 | Asset | `'ticker'` | esquerda | `min-w-[240px]` |
| 2 | Status | `'status'` | centro | `min-w-[80px]` |
| 3 | Holding Period | `'hold'` | direita | `min-w-[110px]` |
| 4 | Invested | `'invested'` | direita | `min-w-[100px]` |
| 5 | Realized | `'realized'` | direita | `min-w-[100px]` |
| 6 | Unrealized | `'unrealized'` | direita | `min-w-[110px]` |
| 7 | Total Profit | `'totalEUR'` | direita | `min-w-[110px]` |
| 8 | Last 30 days | não ordenável | direita | `min-w-[160px]` |
| 9 | ROI | `'roi'` | direita | `min-w-[80px]` |

**Sort arrows:** idêntico ao padrão de `HoldingsTable`:
- Activo: `▼` ou `▲` em `text-primary`
- Inactivo: `↕` em `text-muted-foreground/50`
- Coluna não ordenável: sem arrow (Last 30 days)

**Ordenação default:** `{ col: 'totalEUR', dir: 'desc' }` — Total Profit decrescente

---

### AssetCell (Performance)
- **Localização:** `src/components/performance/AssetCell.tsx`
- **Tipo:** função pura / componente simples
- **Layout:** `flex items-center gap-3 min-w-[240px]`
- **Logo 36×36:**
  ```tsx
  <div
    className="w-9 h-9 rounded-[4px] flex items-center justify-center text-[11px] font-bold shrink-0 border border-border/50"
    style={{ background: `var(--${trade.chart})`, color: 'rgba(11,13,24,0.85)' }}
  >
    {trade.ticker[0]}
  </div>
  ```
- **Textos:**
  ```tsx
  <div className="flex flex-col min-w-0">
    <span className="text-[13px] font-semibold tracking-wide leading-[1.2]">{trade.ticker}</span>
    <span className="text-[12px] text-muted-foreground truncate max-w-[200px]">{trade.name}</span>
  </div>
  ```
- **Cores de logo por asset class:**
  | chart | Tipo | Cor |
  |-------|------|-----|
  | `chart-1` | Stocks | `oklch(0.72 0.17 185)` — teal |
  | `chart-2` | ETFs | `oklch(0.65 0.20 280)` — violeta |
  | `chart-5` | Outros | `oklch(0.68 0.17 220)` — azul céu |

**Nota:** Este componente pode substituir ou coexistir com `AllocPill` de Holdings. São visualmente diferentes — AssetCell é simples (logo + texto); AllocPill tem fill de alocação. Criar um novo `AssetCell.tsx` em `src/components/performance/` em vez de reutilizar.

---

### StatusPill
- **Localização:** função inline em `TradeTable.tsx` (não precisa de ficheiro separado)
- **Layout:** `inline-flex items-center gap-2 text-[12px]`
- **Active:**
  ```tsx
  <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--gain)]">
    <span
      className="w-[6px] h-[6px] rounded-full bg-[var(--gain)] shrink-0"
      style={{ boxShadow: '0 0 6px oklch(0.70 0.18 145 / 60%)' }}
    />
    Active
  </span>
  ```
- **Closed:**
  ```tsx
  <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
    <span className="w-[6px] h-[6px] rounded-full bg-muted-foreground/50 shrink-0" />
    Closed
  </span>
  ```

---

### Sparkline
- **Localização:** `src/components/performance/Sparkline.tsx`
- **Tipo:** componente puro (não precisa de `"use client"` se não usar estado — mas pode)
- **Props:** `seed: number`, `dir30: number` (−1 a +1), `pct30: number`
- **SVG:** `width="96" height="28"` com `viewBox="0 0 96 28"` e `preserveAspectRatio="none"`
- **Algoritmo de geração (LCG determinístico):**
  ```ts
  function generateSpark(seed: number, dir30: number): number[] {
    let s = seed;
    const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const n = 30;
    const points: number[] = [];
    let v = 0;
    const drift = dir30 * 0.35;
    for (let i = 0; i < n; i++) {
      v += drift + (rng() - 0.5) * 1.4;
      points.push(v);
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) || 1;
    return points.map((p) => (p - min) / range); // normalizado 0..1
  }
  ```
- **Path Bezier suavizado:**
  ```ts
  const W = 96, H = 28, P = 2;
  const pts = data.map((d, i) => [
    P + (i / (data.length - 1)) * (W - P * 2),
    P + (1 - d) * (H - P * 2),
  ]);
  // Cubic bezier com control points no meio horizontal
  let path = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i-1], p1 = pts[i];
    const cx = (p0[0] + p1[0]) / 2;
    path += ` C ${cx} ${p0[1]}, ${cx} ${p1[1]}, ${p1[0]} ${p1[1]}`;
  }
  const fillPath = `${path} L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  ```
- **Fill gradient:** LinearGradient com id único `sp-fade-${seed}` — `stopOpacity 0.28` no topo, `0` no fundo
- **Dot final:** `<circle cx={lastPt[0]} cy={lastPt[1]} r="2.2" fill={color} />`
- **Cor:** `dir30 >= 0` → `var(--gain)` / `oklch(0.70 0.18 145)` ; else `var(--loss)` / `oklch(0.63 0.22 25)`
- **Delta percentual:** `<span className="text-[12px] tabular-nums tracking-tight min-w-[48px] text-right ${positive ? 'text-[var(--gain)]' : 'text-[var(--loss)]'}">{pct30 >= 0 ? '+' : '−'}{Math.abs(pct30).toFixed(1)}%</span>`

**Wrapper `.spark`:**
```tsx
<div className="inline-flex items-center justify-end gap-2 min-w-[130px]">
  <svg className="w-24 h-7 block" ...>...</svg>
  <span className="...delta...">{deltaText}</span>
</div>
```

**Seed determinístico por ticker:** `(ticker.charCodeAt(0) * 31 + ticker.charCodeAt(1)) % 9999`
- VWCE → seed = `(86*31 + 87) % 9999 = 2753`
- AMAT → seed = `(65*31 + 77) % 9999 = 2092`
- CSPX → seed = `(67*31 + 83) % 9999 = 2160`
- MSFT → seed = `(77*31 + 83) % 9999 = 2470`

**`dir30` e `pct30` calculados em `PerformancePage`:**
```ts
const dir30 = totEUR === 0 ? 0 : (totEUR > 0 ? 1 : -1);
const pct30 = Math.max(-12, Math.min(12, roi * 0.18 + dir30 * 0.6));
```

---

### ROI Badge
- **Localização:** função inline em `TradeTable.tsx`
- **Layout:** `inline-flex px-[10px] py-1 rounded-full border text-[12px] font-medium tabular-nums`
- **Gain:** `text-[var(--gain)] border-[oklch(0.70_0.18_145_/_40%)] bg-[oklch(0.70_0.18_145_/_12%)]`
- **Loss:** `text-[var(--loss)] border-[oklch(0.63_0.22_25_/_40%)] bg-[oklch(0.63_0.22_25_/_12%)]`
- **Formato:** `+13.84%` / `−32.85%` (usar `−` Unicode, não hífen)
- **ROI calculado:** `(totalProfitEUR / investedEUR) * 100` — sempre em EUR

**Nota sobre `--gain-soft` e `--loss-soft`:** Estas variáveis não existem no `globals.css` actual. O Engineer deve adicioná-las ao bloco `.dark`:
```css
/* Fundos suaves semânticos — para badges ROI */
--gain-soft: oklch(0.70 0.18 145 / 12%);
--loss-soft: oklch(0.63 0.22 25 / 12%);
```
Alternativamente, usar classes Tailwind arbitrárias: `bg-[oklch(0.70_0.18_145_/_12%)]` e `bg-[oklch(0.63_0.22_25_/_12%)]`.

---

### DensitySelector (TweaksPanel — interno)
- **Localização:** controlado por `PerformancePage` via prop `density`
- **Visual:** segmented control idêntico a `CurrencySelector` — opções `compact | comfortable | spacious`
- **Nota:** o TweaksPanel do protótipo não existe na app React real. O toggle de densidade e show closed deve ser exposto de outra forma. **Decisão de design:** colocar no header do `TradeAnalysisCard` lado a lado com `CurrencySelector`:

```
[Trade Analysis]       [compact|comfortable|spacious]  [EUR|USD|Native]
```

Ou, simplificando para esta fase: apenas `CurrencySelector` no header do card; density fica em Settings futuro. Ver notas abaixo.

---

### Modificações a Componentes Existentes

#### Sidebar (`src/components/layout/sidebar.tsx`)
- **Alteração:** No array `NAV_ITEMS`, o item `{ label: "Performance", href: "#", active: false }` passa para `{ label: "Performance", href: "/performance", active: true }`.
- **Impacto visual:** O item "Performance" deixa de ter `opacity-40 cursor-not-allowed` e passa a ser um `<Link>` real. Quando em `/performance`, aplica `bg-sidebar-accent text-primary font-medium border-l-2 border-primary pl-[10px]` — idêntico ao padrão do item "Holdings" activo.

---

## Estrutura de Ficheiros a Criar

```
src/
  app/(dashboard)/performance/
    page.tsx                          ← Server Component stub
  components/performance/
    PerformancePage.tsx               ← Client Component root + state
    PerformancePageHead.tsx           ← h1 + LIVE meta + period selector
    KPIStrip.tsx                      ← container 5 células + micro-viz
    TradeAnalysisCard.tsx             ← card wrapper + header controls
    TradeTable.tsx                    ← tabela ordenável 9 colunas
    AssetCell.tsx                     ← logo + ticker + nome
    Sparkline.tsx                     ← SVG sparkline seed determinístico
    mock-data.ts                      ← TradeItem[], FX, helpers
```

---

## Hierarquia Visual da Página

```
TOPBAR
  date (rise d0) · [neon-dot] Sync · 2 min ago

PAGE HEAD (rise d1)
  h1: Performance (text-2xl font-medium tracking-tight)
  meta: [neon-dot pulsante] LIVE · [teal]4 active[/teal] · 2 closed
  seg period: [1M][3M][YTD*][1Y][ALL]  ← YTD default, state-only

KPI STRIP (rise d2) — card unificado, 5 células
  ┌────────────────┬────────────────┬────────────────┬────────────────┬────────────────┐
  │ Win Rate       │ Profit Split   │ Ovr Avg Hold   │ Avg Winner Hold│ Avg Loser Hold │
  │ [target icon]  │ [wallet icon]  │ [clock muted]  │ [clock gain]   │ [clock loss]   │
  │ 50.0%          │ 7% / 93%       │ 108            │ 108            │ 110            │
  │ foreground     │ foreground     │ foreground     │ gain           │ loss           │
  │ Of positions.. │ Realized vs.. │ Total portfolio│ Letting winners│ Cutting losers │
  │ ▬▬▬▬▬░░░░░  gauge│ ▬▬▬▬▬▬▬▬▬▬ split│ ▬▬▬▬░░░░░░ ticks│ ▬▬▬░░░░░░░ ticks│ ▬░░░░░░░░░ tick│
  └────────────────┴────────────────┴────────────────┴────────────────┴────────────────┘

TRADE ANALYSIS CARD (rise d3)
  header: [Trade Analysis]                    [EUR|USD|Native]
  table:
    Asset          Status  Hold  Invested  Realized  Unrealized  Total   Last 30d  ROI
    [logo]VWCE     Active  1m24d  €180     €0        +€2,243     +€2,243  ~spark   +1245%
    [logo]AMAT     Active  3m20d  €6,139   €0        -€2,016     -€2,016  ~spark    -32%
    [logo]CSPX     Active  2m12d  €6,723   €0        +€450       +€450    ~spark    +6.7%
    [logo]MSFT     Active  6m18d  €1,472   €0        +€424       +€424    ~spark    +28.8%
    [TSLA closed — oculto por defeito, visível com Show closed ON]
    [GLD  closed — oculto por defeito, visível com Show closed ON]
```

**Hierarquia de destaque:**
1. **KPI "Win Rate" gauge** — visual imediato de eficácia geral; teal fill contra fundo muted
2. **KPI "Profit Split" barra** — verde (realized) vs teal-50% (unrealized) — proporção visual
3. **Tick rows** dos KPIs 3-5 — contexto de disciplina temporal com cor semântica por grupo
4. **Sparklines** na coluna Last 30 days — tendência recente de cada posição
5. **ROI badges** — cor semântica imediata; pill arredondado contrasta com dados tabulares
6. **Status pills** — dot com glow neon para Active; dot muted para Closed

---

## Tokens e Classes Utilizados

| Elemento | Token/Classe | Motivo |
|----------|-------------|--------|
| Background da página | `bg-background` | Camada base |
| KPI strip container | `bg-card border-border/50 rounded-lg overflow-hidden` | Superfície card unificada |
| KPI cell padding | `p-5` (protótipo `var(--s-5)` = 24px) | Mais espaço que Holdings (Holdings usa `p-4`) |
| KPI cell separator | `border-r border-border/50` | Divisão interna sem gap |
| KPI label | `text-[13px] text-foreground font-medium` | Ligeiramente maior que Holdings (10px) — mais legível |
| KPI valor | `text-[28px] font-semibold tabular-nums tracking-tight` | Escala do protótipo |
| KPI unidade inline | `text-[0.62em] text-muted-foreground ml-1 font-normal` | Subordinada ao valor |
| KPI subtítulo | `text-[12px] text-muted-foreground tracking-wide` | Hierarquia tertial |
| Gauge track | `h-[6px] rounded-full bg-muted` | Fundo neutro |
| Gauge fill | `bg-primary` (teal) + `transition: width 700ms cubic-bezier(.2,.7,.2,1)` | Animação suave |
| Split bar gain | `bg-[var(--gain)]` | Realized = verde |
| Split bar unrealized | `bg-primary opacity-55` | Unrealized = teal 55% |
| Tick active | `bg-primary` | Teal para "overall" |
| Tick gain | `bg-[var(--gain)]` | Verde para winners |
| Tick loss | `bg-[var(--loss)]` | Vermelho para losers |
| Tick off | `bg-muted` | Posições sem dados |
| Trade card | `bg-card border-border/50 rounded-lg overflow-hidden` | Consistente com Holdings |
| Table header | `text-[10px] uppercase tracking-wider text-muted-foreground` | Padrão DESIGN.md |
| Table row hover | `hover:bg-muted/40 transition-colors duration-[140ms]` | Feedback interactivo |
| Asset logo | `w-9 h-9 rounded-[4px]` + `bg-[var(--chart-N)]` | Cor por asset class |
| Ticker | `text-[13px] font-semibold tracking-wide` | Identidade primária |
| Asset name | `text-[12px] text-muted-foreground truncate` | Contexto secundário |
| Status Active | `text-[var(--gain)]` + dot `box-shadow neon gain` | Semântica + glow |
| Status Closed | `text-muted-foreground` + dot muted | Hierarquia inferior |
| Holding period | `text-muted-foreground tabular-nums` | Dado neutro |
| Monetary gain | `text-[var(--gain)]` | Verde semântico |
| Monetary loss | `text-[var(--loss)]` | Vermelho semântico |
| Monetary zero | `text-muted-foreground` | Neutro |
| Sparkline gain | stroke/fill `var(--gain)` | Tendência positiva |
| Sparkline loss | stroke/fill `var(--loss)` | Tendência negativa |
| ROI gain badge | `text-[var(--gain)] border-[gain/40%] bg-[gain/12%] rounded-full` | Pill semântico |
| ROI loss badge | `text-[var(--loss)] border-[loss/40%] bg-[loss/12%] rounded-full` | Pill semântico |
| Sort arrow activo | `text-primary` | Acento teal |
| Sort arrow inactivo | `text-muted-foreground/50` | Hierarquia |
| Currency seg activo | `text-primary bg-primary/10 font-medium` | Estado seleccionado |
| Period seg activo | `bg-card text-foreground` | Selector mais subtil |
| Neon dot LIVE | `.neon-dot` (pulsante) | Status em tempo real |
| Rise entrance | `.rise .d0`–`.d3` | Escalonado por `useAnimations` |
| Números monetários | `tabular-nums` | Alinhamento em colunas |

---

## Variáveis CSS Novas a Adicionar em `globals.css`

As seguintes variáveis não existem no `globals.css` actual e são necessárias para os ROI badges:

```css
/* No bloco .dark, após as variáveis --gain e --loss: */
--gain-soft: oklch(0.70 0.18 145 / 12%);   /* fundo do badge ROI gain */
--loss-soft: oklch(0.63 0.22 25  / 12%);    /* fundo do badge ROI loss */
```

**Alternativa sem modificar globals.css:** usar classes Tailwind arbitrárias directamente nos componentes — `bg-[oklch(0.70_0.18_145_/_12%)]`. Esta abordagem é preferível se for desejável minimizar alterações globais.

---

## Estados e Feedback Visual

| Estado | Comportamento Visual |
|--------|---------------------|
| Sort Total Profit (default) | Header "Total Profit" mostra `▼` em `text-primary` |
| Sort ascending | Header activo mostra `▲` em `text-primary` |
| Sort descending | Header activo mostra `▼` em `text-primary` |
| Sort inactivo | Header mostra `↕` em `text-muted-foreground/50` |
| Currency EUR (default) | Todos os valores em `€` (pt-PT locale) |
| Currency USD | Valores convertidos com FX mock em `$` |
| Currency Native | Valores na moeda original do activo |
| Show closed OFF (default) | TSLA e GLD ausentes da tabela |
| Show closed ON | TSLA e GLD no fim da tabela após posições activas |
| Period YTD (default) | Botão "YTD" com `bg-card text-foreground` — sem filtrar dados |
| Period outro | Troca estado activo visualmente — sem filtrar dados |
| Hover em linha | `background: var(--muted)` transição 140ms |
| Animations ON | `.rise .d0`–`.d3` activos |
| Animations OFF | Elementos aparecem sem transição |
| Nav item Performance activo | `bg-sidebar-accent text-primary border-l-2 border-primary pl-[10px]` |

---

## Animações de Entrada

| Elemento | Classe | Delay |
|---------|--------|-------|
| Topbar date | `rise d0` | 0ms |
| Page Head | `rise d1` | 60ms |
| KPI Strip | `rise d2` | 120ms |
| Trade Analysis Card | `rise d3` | 180ms |

O hook `useAnimations()` já existe em `src/hooks/useAnimations.ts` e é usado em Holdings. Reutilizar directamente — padrão estabelecido:
```tsx
const { enabled: animationsEnabled } = useAnimations();
const rise = animationsEnabled ? "rise" : "";
// aplicar: className={`${rise} d1`}
```

---

## Responsividade

| Breakpoint | KPI Strip | Tabela | Sidebar |
|-----------|----------|--------|---------|
| `< 700px` | 2 colunas | scroll horizontal | oculta (já implementado) |
| `700px–900px` | 2 colunas | scroll horizontal | visível |
| `900px–1280px` | 3 colunas | scroll horizontal se necessário | visível |
| `≥ 1280px` | 5 colunas (linha única) | layout completo | visível |

**Classes grid para KPI strip:**
```tsx
className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
```

**Lógica de bordas internas no KPI strip (5 células):**
- 2 colunas: `border-t` quando `i >= 2`; perder `border-r` quando `i % 2 === 1`
- 3 colunas: `border-t` quando `i >= 3`; perder `border-r` quando `i % 3 === 2`
- 5 colunas: sem `border-t`; perder `border-r` apenas na última célula (`i === 4`)

Implementar com classes condicionais via lógica JS no render, usando `Math.floor(i / cols)` e `i % cols`.

**Tabela scroll horizontal:** `overflow-x-auto` no wrapper interno do `TradeAnalysisCard` (não no card raiz para preservar `rounded-lg`).

---

## Notas de Implementação para o Frontend

### Rota
```tsx
// src/app/(dashboard)/performance/page.tsx
import { PerformancePage } from "@/components/performance/PerformancePage";

export default function PerformanceRoute() {
  return <PerformancePage />;
}
```

### Tipo `EnrichedTrade`
```ts
interface EnrichedTrade extends TradeItem {
  _investedEUR: number;
  _realizedEUR: number;
  _unrealizedEUR: number;
  _totalEUR: number;
  _roi: number;        // em percentagem
  _dir30: number;      // -1, 0 ou 1
  _pct30: number;      // -12..+12
  _seed: number;       // para sparkline
}
```

### Tipo `TradeSortCol`
```ts
type TradeSortCol = 'ticker' | 'status' | 'hold' | 'invested' | 'realized' | 'unrealized' | 'totalEUR' | 'roi';
type TradeSortDir = 'asc' | 'desc';
interface TradeSortState { col: TradeSortCol; dir: TradeSortDir; }
```

### KPI calculations (em `PerformancePage`)
```ts
// Winners: totalEUR > 0; Losers: totalEUR < 0
const winners = all.filter(x => x._totalEUR > 0);
const losers  = all.filter(x => x._totalEUR < 0);

// Win Rate: baseado em todos os trades (activos + fechados)
const winRate = all.length > 0 ? (winners.length / all.length) * 100 : 0; // 50.0%

// Profit Split
const absRea = Math.abs(totalRealized);
const absUnr = Math.abs(totalUnrealized);
const splitDenom = absRea + absUnr || 1;
const realizedPct   = (absRea / splitDenom) * 100; // ~6.8%
const unrealizedPct = (absUnr / splitDenom) * 100; // ~93.2%

// Avg Hold — apenas posições activas
const avgHoldAll  = active.reduce(...) / active.length;          // 108
const avgHoldWin  = winners_active.reduce(...) / winners_active.length; // 108
const avgHoldLose = losers_active.reduce(...) / losers_active.length;   // 110

// Tick distributions — 10 ticks, sorted by holdDays, tone por grupo
```

### Acessibilidade da tabela
- `<table>` com `<caption className="sr-only">Análise de trades do portfólio</caption>`
- `<th>` de sort com `<button>` interno em vez de `onClick` directo no `<th>`
- `aria-sort="ascending" | "descending" | "none"` nos headers de sort
- Status pills com `aria-label` descritivo

### Formatação monetária
Usar locale `pt-PT` consistente com o restante da app (definido em `mock-data.ts` de Holdings):
```ts
new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: cur,  // 'EUR' | 'USD'
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: signed ? 'always' : 'auto',
}).format(n)
```

### Densidade da tabela
O toggle de densidade (`compact | comfortable | spacious`) deve ser controlado via estado em `PerformancePage` e passado como prop para `TradeTable`. A implementação pode ser um segundo segmented control no header do `TradeAnalysisCard` ou num painel futuro de settings. Para esta fase, **default é `comfortable` e o toggle é opcional** — o Engineer pode optar por não implementar o selector de densidade na UI, mantendo apenas o estado interno para futura expansão.

### Show Closed Toggle
Reutilizar `ShowSoldToggle` de `src/components/holdings/ShowSoldToggle.tsx` directamente, renomeando apenas o label para `"Show closed trades"` via prop ou criando uma cópia com label diferente. Colocar no header do `TradeAnalysisCard` à esquerda do `CurrencySelector`.

Header completo do Trade Analysis Card:
```
[h2: Trade Analysis]  [Show closed trades ○]  [compact|comfortable|spacious]  [EUR|USD|Native]
```
Simplificado para esta fase (remover density selector):
```
[h2: Trade Analysis]  [Show closed trades ○]  [EUR|USD|Native]
```
