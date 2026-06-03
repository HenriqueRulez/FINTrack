# Especificação Visual — Tax Calculator

**Working Item:** `.claude/working-items/tax-calculator.md`
**DESIGN.md:** consultado ✅
**Protótipo:** `.claude/design-handoff/project/Tax Calculator.html` + `tax-app.jsx` + `settings-modal.jsx` ✅
**Referências de formato:** `.claude/reports/design-performance-redesign.md` + `design-transactions-redesign.md` ✅

---

## Resumo Visual

A página `/tax-calculator` é uma vista de estimativa fiscal anual — um terminal financeiro que responde "quanto imposto deves este ano fiscal" a partir de eventos realizados (vendas + dividendos). A estrutura reaproveita o esqueleto já estabelecido em Holdings / Performance / Transactions (sidebar sticky + topbar + `<main>` em `flex-col`), introduzindo dois padrões: o **KPI strip de 3 cartões "fat"** com grid assimétrico (`1.4fr 1fr 1fr`) onde o primeiro cartão domina, e os **dois painéis lado a lado** (Capital Gains com selector Aggregate/Detailed; Dividend Tax) com `min-height` igual de 340px para alinhamento visual. O tom é sóbrio e determinístico: o único acento neon é o `neon-loss` no valor da liability total quando existe imposto — tudo o resto usa cor semântica (`--gain`/`--loss`/neutro) sem glow, honrando o princípio "neon é destaque, não decoração".

---

## Layout Geral

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (220px sticky)    │  MAIN COLUMN (flex-1)                             │
│  ─────────────────────────│  ─────────────────────────────────────────────── │
│  [F] FINTrack / v0.1      │  TOPBAR (border-b)                                │
│  Dashboard                 │    date (rise d0) · Sync · Xm ago                 │
│  Holdings                  │  ─────────────────────────────────────────────── │
│  Transactions              │  MAIN (p-6, flex-col gap-8)                       │
│  Performance               │                                                   │
│  Tax Calculator ←ACTIVO   │  PAGE HEAD (rise d1)                              │
│                            │  ┌──────────────────────────────────────────┐    │
│  ─────────────────────────│  │ h1: Tax Calculator   [?] Tax Year: [2026▾]│    │
│  Settings                 │  └──────────────────────────────────────────┘    │
│                            │                                                   │
│                            │  KPI STRIP (rise d2) — grid 1.4fr 1fr 1fr        │
│                            │  ┌──────────────┬─────────┬─────────┐            │
│                            │  │ Total Liab.  │ Cap Gain │ Dividend│            │
│                            │  │ €219.16(neon)│ €207.57  │ €11.59  │            │
│                            │  └──────────────┴─────────┴─────────┘            │
│                            │                                                   │
│                            │  PANEL GRID (rise d3) — 1fr 1fr                  │
│                            │  ┌────────────────────┬────────────────────┐    │
│                            │  │ Capital Gains      │ Dividend Tax        │    │
│                            │  │ [Aggregate|Detailed]│        [28% rate]   │    │
│                            │  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │    │
│                            │  │ rows / table       │ rows + table        │    │
│                            │  │ (min-h 340px)      │ (min-h 340px)       │    │
│                            │  └────────────────────┴────────────────────┘    │
│                            │                                                   │
│                            │  TweaksPanel (floating, bottom-right)            │
│                            └───────────────────────────────────────────────── │
```

O layout reutiliza o `DashboardLayout` existente em `src/app/(dashboard)/layout.tsx` — **não criar novo layout**, apenas a nova route `src/app/(dashboard)/tax-calculator/page.tsx`.

**Nota factual sobre o `<main>`:** o `DashboardLayout` real usa `p-6 flex flex-col gap-8` (verificado em `src/app/(dashboard)/layout.tsx:19`), **não** `gap-5` como o protótipo HTML (`var(--s-5)`). A página herda esse `gap-8` entre as secções de topo (page-head → kpi-strip → panel-grid). Manter esse `gap-8` para consistência com Holdings / Performance / Transactions já em produção.

---

## Componentes a Criar

### TaxCalculatorPage
- **Localização:** `src/components/tax-calculator/TaxCalculatorPage.tsx`
- **Tipo:** Client Component (`"use client"`)
- **Layout:** `flex flex-col` — herda o `gap-8` do `<main>` do dashboard layout; renderiza `TaxPageHead`, `TaxKpiStrip`, o `panel-grid` (com `CapitalGainsPanel` + `DividendTaxPanel`) e o `TaxTweaksPanel`
- **Tokens CSS:** herda `bg-background text-foreground` do layout
- **Estado global mantido (raiz):**
  - `useSampleData: boolean` — default `false` (OFF)
  - `cgView: 'aggregate' | 'detailed'` — default `'aggregate'`
  - `year: 2026 | 2025 | 2024` — default `2026`
- **Comportamento:** calcula `events` (= `SAMPLE_EVENTS_2026` quando `useSampleData && year === 2026`, senão `{ sales: [], dividends: [] }`), deriva `cg` (rows + agregados) e `div` (rows + agregados) via `useMemo`, computa `totalTax = cg.totalTax + div.totalTax`, e distribui props para os filhos. Usa `useAnimations()` para as classes `rise`/`d1`–`d3`.
- **Decisão de design factual (anos sem dados):** o working item D3 diz que 2025/2024 mostram estado vazio. Implementar como: `events` só é preenchido quando `useSampleData === true` **e** `year === 2026`. Trocar para 2025/2024 com sample ON → ambos os painéis vazios e KPIs a `€0.00`. O texto "Sum for {year}" e os estados vazios usam sempre o `year` corrente.

---

### mock-data (módulo de dados + matemática fiscal)
- **Localização:** `src/components/tax-calculator/mock-data.ts`
- **Tipo:** módulo utilitário sem JSX (facilita substituição por dados reais na fase 2)
- **Estruturas:**
  ```ts
  interface SaleEvent { date: string; ticker: string; proceeds: number; cost: number; holdYears: number; }
  interface DividendEvent { date: string; ticker: string; amount: number; }
  interface TaxTier { from: number; to: number | null; rate: number; }
  interface TaxSettings { dividendRate: number; method: 'fixed' | 'tiered'; fixedRate: number; tiers: TaxTier[]; }
  ```
- **`SAMPLE_EVENTS_2026`** — exactamente os dados do working item (4 sales, 3 dividends). Não alterar valores.
- **`TAX_SETTINGS` (defaults mock de `settings.tax`)** — exactamente: `dividendRate: 28`, `method: 'tiered'`, `fixedRate: 28`, `tiers: [{from:0,to:2,rate:28.0},{from:2,to:5,rate:25.2},{from:5,to:8,rate:22.4},{from:8,to:null,rate:19.6}]`
- **Funções (fiéis ao `tax-app.jsx`):**
  - `rateForHoldYears(years, tax)` — `fixed` → `fixedRate`; `tiered` → tier onde `years >= from` e (`to == null || years < to`); fallback ao último tier
  - `fmtEUR(n, { signed?, dec? })` — locale `en-GB`, 2 casas, prefixo `€`, sinal negativo `−` (U+2212), `+` quando `signed && n>0`, `€0.00` para null/NaN
  - `fmtDate(iso)` — `YYYY-MM-DD` → `DD/MM/YYYY`
- **Nota factual sobre formatação:** o protótipo usa `en-GB` em `fmtEUR` (separador de milhares `,`). Isto **diverge** do `pt-PT` usado em Holdings/Performance. O working item (secção "Formatação") manda explicitamente `en-GB`. **Seguir `en-GB`** — é requisito do CA. Não unificar com pt-PT nesta página.

---

### TaxPageHead
- **Localização:** `src/components/tax-calculator/TaxPageHead.tsx`
- **Tipo:** Client Component
- **Layout:** `flex items-center justify-between gap-5` (`.page-head` do protótipo) — título à esquerda; `flex items-center gap-3` à direita (help icon + label "Tax Year:" + chip dropdown)
- **Tokens CSS:** `text-foreground` (h1), `text-muted-foreground` (label "Tax Year:")
- **Classes neon:** nenhuma
- **shadcn/ui:** nenhum (o dropdown é um `<select>` nativo estilizado como chip — ver nota)
- **Props:** `year: number`, `onYearChange: (y: number) => void`
- **Animação:** `rise d1`
- **Estrutura:**
  - `<h1 className="text-2xl font-medium tracking-tight leading-none text-foreground">Tax Calculator</h1>` — corresponde a `var(--t-h1)` peso 500 (CA-01); `text-2xl` é a escala de título de página do DESIGN.md
  - Help icon: `<button>` 32×32 com `title="How is this calculated?"`, ícone `help` 16×16 (igual ao `HelpIcon` de `TxPageHead`), cor `text-muted-foreground` → `hover:text-primary` (CA-01)
  - Label: `<span className="text-sm text-muted-foreground">Tax Year:</span>`
  - Chip dropdown — ver componente `TaxYearChip` abaixo

**Nota sobre o help icon:** o protótipo usa `cursor: help` e cor → `--primary` no hover. Reproduzir com `cursor-help` (ou `cursor-pointer`) + `hover:text-primary`. Nesta fase o tooltip é apenas o atributo `title` (out-of-scope: tooltip funcional).

---

### TaxYearChip (dropdown de ano)
- **Localização:** inline em `TaxPageHead.tsx` (não precisa de ficheiro separado)
- **Tipo:** wrapper de `<select>` nativo estilizado (padrão `.input--chip` do protótipo)
- **Layout:** `<label>` com `inline-flex items-center gap-2`, fundo `bg-muted`, borda `border border-border/50`, `rounded-md`, `px-3 py-[7px]`, `min-h-[32px]`, `text-sm`
- **Hover:** `hover:border-border` (equivalente a `--line-strong` — borda ligeiramente mais forte)
- **`<select>` interno:** `bg-transparent border-none outline-none text-foreground font-mono tabular-nums cursor-pointer appearance-none pr-4` com seta SVG inline via `background-image` (chevron muted, igual ao protótipo) ou um ícone chevron 10×10 posicionado em `absolute right`
- **Opções:** `2026` (default), `2025`, `2024`
- **Comportamento:** `onChange` → `onYearChange(Number(value))`

**Nota factual:** existe `src/components/ui/select.tsx` (shadcn Radix). O protótipo usa `<select>` HTML nativo como chip. Para fidelidade ao protótipo e simplicidade, **usar `<select>` nativo estilizado** (chip), não o Radix Select — o Radix introduz um popover/portal e visual diferente do chip pretendido. O Frontend decide; o nativo é o caminho recomendado para igualar o protótipo.

---

### TaxKpiStrip
- **Localização:** `src/components/tax-calculator/TaxKpiStrip.tsx`
- **Tipo:** Client Component
- **Layout:** `grid gap-4` com `grid-template-columns: 1.4fr 1fr 1fr` (CA-02) — **3 cartões separados** (cada um é uma card própria com borda completa), **não** uma superfície unificada como o `KpiStrip` de Holdings. Cada cartão: `bg-card border border-border/50 rounded-lg p-5 flex flex-col gap-3 min-h-[130px]`
- **Tokens CSS:** `bg-card`, `border-border/50`, `text-foreground`, `text-muted-foreground`
- **Classes neon:** `neon-loss` aplicada ao valor do cartão 1 **apenas quando `totalTax > 0`** (CA-02)
- **shadcn/ui:** nenhum (cartões manuais)
- **Animação:** `rise d2` no container
- **Props:** `totalTax: number`, `cgTax: number`, `cgCount: number`, `divTax: number`, `divCount: number`, `year: number`

**Estrutura de cada cartão (`.tax-kpi`):**
```
<div className="bg-card border border-border/50 rounded-lg p-5 flex flex-col gap-3 min-h-[130px]">
  <div className="flex items-center justify-between gap-2">      ← .tax-kpi__top
    <span className="text-sm text-foreground font-medium">{label}</span>   ← var(--t-body), peso 500
    <span className="...icon color...">{icon}</span>            ← .tax-kpi__icon
  </div>
  <div className="text-[32px] font-medium leading-none tabular-nums tracking-tight {neon?}">{value}</div>
  <div className="text-sm text-muted-foreground">{sub}</div>    ← var(--t-small)
</div>
```

**Os 3 cartões (CA-02):**

| # | Label | Ícone | Cor do ícone | Valor | Sub-texto | Neon |
|---|-------|-------|-------------|-------|-----------|------|
| 1 | Total Estimated Tax Liability | `info` (14×14) | `text-muted-foreground` (sempre) | `fmtEUR(totalTax)` | `Sum for {year}` | `neon-loss` quando `totalTax > 0` |
| 2 | Capital Gains Tax | `trendUp` (16×16) | `var(--gain)` quando `cgTax > 0`, senão `text-muted-foreground` | `fmtEUR(cgTax)` | `From {cgCount} sale event{s}` | — |
| 3 | Dividend Tax | `coins` (16×16) | `var(--chart-3)` quando `divTax > 0`, senão `text-muted-foreground` | `fmtEUR(divTax)` | `From {divCount} dividend event{s}` | — |

- **Valor do cartão 1:** cor base `text-foreground`; quando `neon-loss` aplicado, o glow vermelho dá a leitura de "passivo fiscal". O cartão 1 **não** muda a cor base do texto para `--loss` — apenas adiciona o text-shadow `neon-loss` (fidelidade ao protótipo: `className={tax-kpi__value ${totalTax>0?'neon-loss':''}}` sem cor `--loss` explícita). Confirmar: o glow vermelho sobre texto `--foreground` é o efeito pretendido.
- **Pluralização:** `event` (singular) quando count === 1, `events` caso contrário (CA-02). Com sample OFF: `From 0 sale events` / `From 0 dividend events`.
- **Ícones (inline SVG, fiéis ao `tax-app.jsx`):** `info` (círculo + i), `trendUp` (linha ascendente + seta), `coins` (duas elipses empilhadas). Especificados na secção "Inventário de Ícones".

---

### CapitalGainsPanel
- **Localização:** `src/components/tax-calculator/CapitalGainsPanel.tsx`
- **Tipo:** Client Component
- **Layout (`.panel`):** `bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col min-h-[340px]`
  - Header (`.panel__head`): `flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50`
  - Body: depende da vista (ver abaixo)
- **Props:** `rows: CgRow[]`, `totalProceeds`, `totalCost`, `totalGain`, `totalTax: number`, `cgView: 'aggregate'|'detailed'`, `onCgViewChange: (v) => void`, `year: number`
- **Header:**
  - `<h2 className="text-lg font-medium tracking-tight leading-none">Capital Gains</h2>` (`var(--t-h2)`; `text-lg` é a escala de título de secção do DESIGN.md)
  - Selector segmentado `Aggregate | Detailed` à direita — ver `SegSelector` abaixo
- **Estado vazio (CA-07):** quando `rows.length === 0` → body `flex-1 flex items-center justify-center p-8` com `Empty` (ícone `emptyTrend` 48×48 + texto `No taxable sales found for {year}`)

**Vista Aggregate (`.agg`, CA-04):** container `p-5 flex flex-col gap-4`, 4 linhas (`.agg__row`):

| Linha | Label | Valor | Cor do valor | Notas |
|-------|-------|-------|-------------|-------|
| 1 | Total proceeds | `fmtEUR(totalProceeds)` | `text-foreground` (neutral) | — |
| 2 | Total cost basis | `fmtEUR(totalCost)` | `text-foreground` (neutral) | — |
| 3 | Net realised gain | `fmtEUR(totalGain, {signed:true})` | `--gain` se ≥ 0, `--loss` se < 0 | com sinal |
| 4 | Capital gains tax due | `fmtEUR(totalTax)` | `--loss` | sufixo `tier-weighted` pequeno muted |

- Cada `.agg__row`: `flex items-baseline justify-between gap-3 pb-3 border-b border-dashed border-border/50`; **última linha sem borda** (`last:border-b-0 last:pb-0`) (CA-04)
- `.agg__label`: `text-sm text-muted-foreground`
- `.agg__value`: `text-[22px] font-medium tabular-nums tracking-tight`
- Sufixo `tier-weighted`: `<u>` sem sublinhado → `text-[0.62em] text-muted-foreground ml-1.5 font-normal not-underline` (fiel ao protótipo `.agg__value u`)

**Vista Detailed (`.detail-table`, CA-05):** wrapper `overflow-x-auto`, `<table className="w-full border-collapse tabular-nums">`, 6 colunas:

| # | Header | Alinhamento | Conteúdo | Cor |
|---|--------|------------|----------|-----|
| 1 | Date | esquerda | `fmtDate(r.date)` | `text-muted-foreground` |
| 2 | Asset | direita | `r.ticker` | bold (`font-semibold`) |
| 3 | Hold | direita | `{holdYears.toFixed(1)}y` | `text-muted-foreground` |
| 4 | Gain | direita | `fmtEUR(r.gain, {signed:true})` | `--gain` se ≥ 0, `--loss` se < 0 |
| 5 | Rate | direita | `{rate.toFixed(1)}%` | `text-muted-foreground` |
| 6 | Tax | direita | `fmtEUR(r.tax)` | `text-foreground` (neutral) |

- `<th>`: `text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3 border-b border-border/50 text-right` (`var(--t-micro)`)
- `<th>:first-child` / `<td>:first-child`: `text-left pl-5`; `:last-child`: `pr-5`
- `<td>`: `px-4 py-3 border-b border-border/50 text-sm text-right`; **última linha `td` sem borda** (`tbody tr:last-child td → border-b-0`)
- Sem hover de linha exigido pelo CA (o protótipo não tem hover na detail-table); pode adicionar `hover:bg-muted/40` por consistência mas não é requisito

---

### DividendTaxPanel
- **Localização:** `src/components/tax-calculator/DividendTaxPanel.tsx`
- **Tipo:** Client Component
- **Layout (`.panel`):** idêntico ao Capital Gains — `bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col min-h-[340px]`
- **Props:** `rows: DivRow[]`, `total: number`, `totalTax: number`, `dividendRate: number`, `year: number`
- **Header:**
  - `<h2 className="text-lg font-medium tracking-tight leading-none">Dividend Tax</h2>`
  - Badge à direita: `{Math.round(dividendRate)}% rate` → `28% rate` (CA-06). Visual: `text-[10px] px-1.5 py-0.5 rounded-sm tabular-nums text-muted-foreground border border-border/50 bg-card` (padrão badge da app — ver nota)
- **Estado vazio (CA-07):** `rows.length === 0` → body `flex-1 flex items-center justify-center p-8` com `Empty` (ícone `emptyCoins` 48×48 + texto `No dividend income found for {year}`)
- **Vista com dados (`.agg` + tabela, CA-06):** container `p-5 flex flex-col gap-4`, 3 linhas agregadas seguidas de tabela:

| Linha agregada | Label | Valor | Cor |
|----------------|-------|-------|-----|
| 1 | Total dividends received | `fmtEUR(total, {signed:true})` | `--gain` |
| 2 | Dividend tax due | `fmtEUR(totalTax)` | `--loss` |
| 3 | Net dividend income | `fmtEUR(total - totalTax)` | `text-foreground` (neutral) |

  - Mesmas classes `.agg__row` / `.agg__label` / `.agg__value` da vista Aggregate de Capital Gains (linha 3 sem borda inferior, mas aqui segue-se a tabela — ver protótipo: as 3 linhas mantêm `border-dashed`, a tabela vem depois com `margin-top`)
  - Após as 3 linhas: `<div className="overflow-x-auto mt-2">` com a tabela de 4 colunas

- **Tabela (`.detail-table`, 4 colunas):**

| # | Header | Alinhamento | Conteúdo | Cor |
|---|--------|------------|----------|-----|
| 1 | Date | esquerda | `fmtDate(r.date)` | `text-muted-foreground` |
| 2 | Asset | direita | `r.ticker` | bold (`font-semibold`) |
| 3 | Amount | direita | `fmtEUR(r.amount, {signed:true})` | `--gain` |
| 4 | Tax | direita | `fmtEUR(r.tax)` | `text-foreground` (neutral) |

  - Mesmas classes de `<th>`/`<td>` da detail-table de Capital Gains

**Nota factual sobre o badge "{X}% rate":** não existe um componente `Badge` shadcn em `src/components/ui/` (verificado: apenas button, select, input, label, dialog, alert-dialog, skeleton, dropdown-menu). O badge no protótipo é a classe `.badge` do design-system. Reproduzir inline com as classes Tailwind acima (mesmo padrão do count badge da Sidebar e dos badges de `TypeTabs`). Não criar componente novo.

---

### SegSelector (selector segmentado Aggregate / Detailed)
- **Localização:** inline em `CapitalGainsPanel.tsx` (ou ficheiro `SegSelector.tsx` se o Frontend preferir reutilizar)
- **Tipo:** função/componente puro
- **Layout:** `inline-flex items-center border border-border/50 rounded-md overflow-hidden` (padrão idêntico ao `CurrencySelector` de Holdings)
- **Botões:** `Aggregate`, `Detailed`
  - `px-3 py-1 text-xs transition-colors`
  - `!isLast → border-r border-border/50`
  - activo (`seg__btn--on`): `text-primary bg-primary/10 font-medium`
  - inactivo: `text-muted-foreground bg-transparent hover:bg-muted/60`
- **Props:** `value: 'aggregate'|'detailed'`, `onChange: (v) => void`
- **Sincronização (CA-08):** o `value` e `onChange` vêm directamente do estado `cgView` da `TaxCalculatorPage`, partilhado com o radio do TweaksPanel — mudar num reflecte no outro automaticamente (mesma fonte de estado).

**Nota:** este é o **mesmo padrão visual** do `CurrencySelector` existente. O Frontend pode generalizar `CurrencySelector` ou criar `SegSelector`. Recomendado: novo `SegSelector` simples para não acoplar à tipagem `Currency`.

---

### TaxEmptyState
- **Localização:** `src/components/tax-calculator/TaxEmptyState.tsx` (ou inline `Empty` em cada painel)
- **Tipo:** componente puro
- **Layout (`.empty`):** `flex flex-col items-center gap-3 text-center text-muted-foreground text-sm`; container do painel centra com `flex-1 flex items-center justify-center p-8`
- **Ícone (`.empty__icon`):** 56×56 box com SVG 48×48, cor `text-muted-foreground/40` (equivale a `--faint-foreground` do protótipo)
- **Props:** `icon: ReactNode`, `message: string`
- **Usos:**
  - Capital Gains vazio → ícone `emptyTrend` + `No taxable sales found for {year}` (CA-07)
  - Dividend Tax vazio → ícone `emptyCoins` + `No dividend income found for {year}` (CA-07)

**Nota:** o `EmptyState` existente em `src/components/transactions/EmptyState.tsx` é específico de transacções (texto fixo, ícone fixo). Criar um `TaxEmptyState` parametrizável (icon + message) em vez de reutilizar.

---

### TaxTweaksPanel
- **Localização:** `src/components/tax-calculator/TaxTweaksPanel.tsx`
- **Tipo:** Client Component
- **Layout:** painel flutuante idêntico ao `TxTweaksPanel` (botão FAB `fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full` + painel `fixed bottom-16 right-4 w-64 z-50 bg-card border border-border/50 rounded-lg shadow-xl p-4 flex flex-col gap-4`)
- **Título:** `Tax Calculator · Tweaks` (CA-08) — `<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">` no topo do painel
- **Conteúdo (CA-08):**
  - **Toggle "Show sample data"** — componente `Toggle` idêntico ao de `TxTweaksPanel` (switch `w-8 h-[18px]`, ON = teal). OFF por defeito. Liga/desliga `useSampleData`.
  - **Radio "Capital Gains view"** — opções `aggregate` / `detailed`, sincronizado com o `SegSelector` do painel (mesma fonte de estado `cgView`)
- **Props:** `useSampleData: boolean`, `onUseSampleDataChange`, `cgView`, `onCgViewChange`

**Visual do radio "Capital Gains view":** secção com label `<p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Capital Gains view</p>` seguida de um segmented control `inline-flex border border-border/50 rounded-md overflow-hidden w-full` com dois botões `aggregate`/`detailed` (mesma estética do density selector de `TxTweaksPanel`: `flex-1 text-xs px-2 py-1.5`, activo `bg-primary/10 text-primary font-medium`). Funcionalmente equivalente ao radio do protótipo `TweakRadio`.

**Nota factual sobre o TweaksPanel:** o protótipo HTML usa um sistema `TweaksPanel`/`TweakToggle`/`TweakRadio` que **não existe** na app React real. A app real estabeleceu o padrão `TxTweaksPanel` (FAB flutuante) em Transactions. **Seguir o padrão `TxTweaksPanel`** — é o equivalente canónico já em produção. Reutilizar o subcomponente `Toggle` (copiar para o módulo tax-calculator ou extrair para partilhado, à escolha do Frontend).

---

## Componentes a Modificar

### Sidebar (`src/components/layout/sidebar.tsx`)
- **Alteração:** no array `NAV_ITEMS`, o item `{ label: "Tax Calculator", href: "#", active: false, icon: <TaxIcon /> }` passa a `{ label: "Tax Calculator", href: "/tax-calculator", active: true, icon: <TaxIcon /> }` (CA-09)
- **Impacto visual:** o item "Tax Calculator" deixa de ter `opacity-40 cursor-not-allowed pointer-events-none` e passa a ser um `<Link>` real. Quando em `/tax-calculator`, aplica `bg-sidebar-accent text-primary font-medium border-l-2 border-primary pl-[10px]` — idêntico ao indicador teal activo dos restantes itens (CA-09). O `TaxIcon` já existe no ficheiro — nenhuma alteração de ícone necessária. Restantes itens mantêm o comportamento actual.

**Facto verificado:** `TaxIcon` já está definido em `sidebar.tsx:88-103` e o item já está no array (apenas `active: false`, `href: "#"`). A modificação é mínima — trocar dois campos.

---

## Inventário de Ícones (inline SVG, fiéis ao `tax-app.jsx`)

| Nome | Tamanho | Uso | Descrição do path |
|------|---------|-----|-------------------|
| `help` | 16×16 | header (help button) | círculo r=6.5 + "?" estilizado (igual ao `HelpIcon` de `TxPageHead`) |
| `info` | 14×14 | KPI 1 ícone | círculo r=5.5 + "i" (`M7 6v4M7 4v.01`) |
| `trendUp` | 16×16 | KPI 2 ícone | linha ascendente `M2 12l4-4 3 2 5-6` + cabeça de seta `M10 4h4v4` |
| `coins` | 16×16 | KPI 3 ícone | duas elipses empilhadas (moedas) |
| `emptyTrend` | 48×48 | empty Capital Gains | trend line grande `M6 36l12-12 8 8 16-18` + seta |
| `emptyCoins` | 48×48 | empty Dividend Tax | duas elipses grandes empilhadas |

Todos com `fill="none" stroke="currentColor"`, `strokeWidth` 1.4–1.5, `aria-hidden="true"`. Copiar os paths exactos do `tax-app.jsx` (linhas 17–23). O `help` pode reutilizar o `HelpIcon` já existente em `TxPageHead.tsx`.

---

## Hierarquia Visual da Página

```
TOPBAR
  date (rise d0) · Sync · Xm ago         ← herdado do layout (Topbar existente)

PAGE HEAD (rise d1)
  h1: Tax Calculator (text-2xl font-medium)        [?]  Tax Year: [2026 ▾]

KPI STRIP (rise d2) — grid 1.4fr 1fr 1fr
  ┌──────────────────────────┬─────────────────┬─────────────────┐
  │ Total Estimated Tax Liab.│ Capital Gains Tax│ Dividend Tax    │
  │ [info muted]             │ [trendUp gain]  │ [coins amber]   │
  │ €219.16  ← NEON-LOSS     │ €207.57         │ €11.59          │
  │ Sum for 2026            │ From 4 sale evts │ From 3 div evts │
  └──────────────────────────┴─────────────────┴─────────────────┘

PANEL GRID (rise d3) — 1fr 1fr, ambos min-h 340px
  ┌──────────────────────────────┬──────────────────────────────┐
  │ Capital Gains  [Agg|Detailed]│ Dividend Tax        [28% rate]│
  │ ──────────────────────────── │ ──────────────────────────── │
  │ Total proceeds      €5,559.77│ Total dividends rec. +€41.40 │ ← gain
  │ Total cost basis    €5,190.00│ Dividend tax due     €11.59  │ ← loss
  │ Net realised gain   +€369.77 │ Net dividend income  €29.81  │ ← neutral
  │ Cap gains tax due   €207.57  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
  │   (tier-weighted)            │ Date  Asset  Amount   Tax    │
  │                              │ 01/03 CSPX  +€24.40  €6.83   │
  └──────────────────────────────┴──────────────────────────────┘

TweaksPanel (FAB bottom-right) — Show sample data ○ · CG view [agg|det]
```

**Hierarquia de destaque (do mais ao menos proeminente):**
1. **Cartão 1 "Total Estimated Tax Liability"** com `neon-loss` — o número que o utilizador procura; o glow vermelho + a maior largura (`1.4fr`) + o valor `text-[32px]` fazem-no dominar a página
2. **Cartões 2 e 3** (Capital Gains / Dividend Tax) — o breakdown do total; ícones coloridos semanticamente (verde gain / âmbar) dão leitura rápida da origem do imposto
3. **Net realised gain** e **Total dividends received** — valores com cor semântica `--gain`/`--loss` nos painéis; guiam o olho para o resultado líquido
4. **"Capital gains tax due"** em `--loss` com sufixo `tier-weighted` — explica como o imposto foi calculado
5. **Tabelas detalhadas / por evento** — o nível mais granular, em cores neutras com ticker em bold como única ênfase

---

## Tokens e Classes Utilizados

| Elemento | Token/Classe | Motivo |
|----------|-------------|--------|
| Background da página | `bg-background` (herdado) | Camada base do layout |
| Cards KPI / painéis | `bg-card border border-border/50 rounded-lg` | Superfície de card padrão DESIGN.md |
| KPI strip grid | `grid gap-4 grid-cols-[1.4fr_1fr_1fr]` | Grid assimétrico do protótipo (CA-02) |
| KPI label | `text-sm text-foreground font-medium` | `var(--t-body)` peso 500 |
| KPI valor | `text-[32px] font-medium leading-none tabular-nums tracking-tight` | Escala do protótipo |
| KPI sub | `text-sm text-muted-foreground` | `var(--t-small)` |
| Liability neon | `neon-loss` (condicional `totalTax > 0`) | Destaque do passivo fiscal (único neon da página) |
| Ícone KPI gain | `text-[var(--gain)]` (condicional) | Cap gains tax > 0 |
| Ícone KPI amber | `text-[var(--chart-3)]` (condicional) | Dividend tax > 0 |
| Painel título | `text-lg font-medium tracking-tight leading-none` | `var(--t-h2)` (título de secção DESIGN.md) |
| Painel min-height | `min-h-[340px]` | Alinhamento visual dos dois painéis (CA-03) |
| Painel header border | `border-b border-border/50` | Separação header/body |
| Seg button activo | `text-primary bg-primary/10 font-medium` | Padrão CurrencySelector / estado activo teal |
| Seg button inactivo | `text-muted-foreground hover:bg-muted/60` | Hierarquia |
| Chip dropdown | `bg-muted border border-border/50 rounded-md` | `.input--chip` do protótipo |
| Agg row | `flex items-baseline justify-between pb-3 border-b border-dashed border-border/50` | `.agg__row` (linhas tracejadas, CA-04) |
| Agg label | `text-sm text-muted-foreground` | `.agg__label` |
| Agg value | `text-[22px] font-medium tabular-nums tracking-tight` | `.agg__value` |
| Valor gain | `text-[var(--gain)]` | Verde semântico |
| Valor loss | `text-[var(--loss)]` | Vermelho semântico |
| Valor neutral | `text-foreground` | Sem polaridade |
| Sufixo tier-weighted | `text-[0.62em] text-muted-foreground ml-1.5 font-normal` | `.agg__value u` |
| Table header | `text-[10px] uppercase tracking-wider text-muted-foreground font-medium` | `var(--t-micro)` / DESIGN.md |
| Table td | `text-sm px-4 py-3 border-b border-border/50 text-right tabular-nums` | `.detail-table` |
| Ticker em tabela | `font-semibold` | Ênfase de identidade (CA-05/06) |
| Date em tabela | `text-muted-foreground` | Metadado |
| Badge "X% rate" | `text-[10px] px-1.5 py-0.5 rounded-sm border border-border/50 bg-card text-muted-foreground tabular-nums` | `.badge` do design-system |
| Empty container | `flex-1 flex items-center justify-center p-8` | Centragem vertical+horizontal (CA-07) |
| Empty texto/ícone | `text-muted-foreground` / ícone `text-muted-foreground/40` | `.empty` / `--faint-foreground` |
| Chip dropdown chevron | SVG inline muted | Seta do `<select>` (protótipo) |
| Sinal negativo | `−` (U+2212) via `fmtEUR` | CA-10 |
| Números | `tabular-nums` | Alinhamento (CA-10) |
| Rise entrance | `.rise .d0`–`.d3` | Escalonamento via `useAnimations` |

---

## Estados e Feedback Visual

| Estado | Comportamento Visual |
|--------|---------------------|
| Show sample data OFF (default) | KPIs `€0.00` (sem neon); ambos os painéis em estado vazio; subs `From 0 sale events` / `From 0 dividend events` |
| Show sample data ON + 2026 | KPIs `€219.16` / `€207.57` / `€11.59`; painéis com dados; cartão 1 com `neon-loss` |
| Show sample data ON + 2025/2024 | KPIs `€0.00`; ambos os painéis vazios (sem dados mock para esses anos, D3) |
| Capital Gains = Aggregate (default) | Botão "Aggregate" `seg__btn--on` (teal); body mostra as 4 linhas agregadas |
| Capital Gains = Detailed | Botão "Detailed" activo; body mostra a tabela de 6 colunas |
| Selector seg ↔ radio TweaksPanel | Mudar num actualiza o outro (estado `cgView` partilhado) |
| Trocar Tax Year | "Sum for {year}" e textos de estado vazio actualizam para o ano corrente |
| Capital Gains vazio | Ícone `emptyTrend` + `No taxable sales found for {year}` centrado |
| Dividend Tax vazio | Ícone `emptyCoins` + `No dividend income found for {year}` centrado |
| Help icon hover | Cor `text-muted-foreground` → `text-primary` |
| Chip dropdown hover | Borda `border-border/50` → `border-border` (mais forte) |
| Net realised gain ≥ 0 | Cor `--gain` com sinal `+` |
| Net realised gain < 0 | Cor `--loss` com sinal `−` |
| Animations ON (default) | `.rise .d1`–`.d3` activos (d0 é o topbar do layout) |
| Animations OFF | Elementos aparecem sem transição (classe `rise` omitida) |
| Nav "Tax Calculator" activo | `bg-sidebar-accent text-primary border-l-2 border-primary pl-[10px]` |

---

## Animações de Entrada

| Elemento | Classe | Delay |
|---------|--------|-------|
| Topbar date | `rise d0` | 0ms (já no `Topbar` do layout) |
| Page Head | `rise d1` | 60ms |
| KPI Strip | `rise d2` | 120ms |
| Panel Grid | `rise d3` | 180ms |

Usar o hook `useAnimations()` (`src/hooks/useAnimations.ts`, verificado: retorna `{ enabled }`). Padrão estabelecido:
```tsx
const { enabled } = useAnimations();
const rise = enabled ? "rise" : "";
// aplicar: className={`${rise} d2`}
```
As classes `rise`, `d0`–`d3` já existem em `globals.css` (usadas em Holdings/Performance/Transactions). **Não redefinir.** CA-10 mapeia exactamente: d0 topbar, d1 page-head, d2 kpi-strip, d3 panel-grid.

---

## Responsividade (CA-11)

| Breakpoint | KPI Strip | Panel Grid | Tabelas | Sidebar |
|-----------|----------|-----------|---------|---------|
| `≥ 1100px` (base/xl) | 3 col `1.4fr 1fr 1fr` | 2 col `1fr 1fr` | layout completo | visível |
| `≤ 1100px` | 2 col; cartão 1 ocupa linha toda (`grid-column: 1 / -1`) | 1 col | scroll horizontal se necessário | visível |
| `≤ 700px` | 1 col | 1 col | scroll horizontal | oculta (já no layout: `hidden md:flex`) |

**Implementação do KPI strip responsivo:** o protótipo usa media queries CSS. Em Tailwind, traduzir para:
- base (`< 1100px` ≈ usar breakpoint custom ou `max-`): 2 colunas, cartão 1 com `col-span-2`
- `xl:` (≥ 1280px) ou breakpoint `[1100px]`: 3 colunas `grid-cols-[1.4fr_1fr_1fr]`

**Nota factual sobre breakpoints:** o protótipo usa `1100px` e `700px`. Os breakpoints Tailwind padrão são `md:768`, `lg:1024`, `xl:1280`. Para fidelidade, o Frontend pode usar **arbitrary breakpoints** (`max-[1100px]:`, `max-[700px]:`) ou aproximar com `lg:`/`md:`. Recomendado: usar `max-[1100px]:` e `max-[700px]:` para igualar o protótipo exactamente, **ou** mapear `1100px→lg` e `700px→md` (a sidebar já usa `md` para colapsar). Documentar a escolha; o resultado visual deve respeitar a tabela acima.

**Scroll horizontal das tabelas:** wrapper `overflow-x-auto` em volta de cada `<table>` (CA-05, CA-06, CA-11), **não** no `.panel` raiz (preservar `rounded-lg` + `overflow-hidden` do painel).

---

## Notas para o Frontend

### Rota (Server Component stub)
```tsx
// src/app/(dashboard)/tax-calculator/page.tsx
import { TaxCalculatorPage } from "@/components/tax-calculator/TaxCalculatorPage";

export default function TaxCalculatorRoute() {
  return <TaxCalculatorPage />;
}
```

### Estrutura de ficheiros a criar
```
src/
  app/(dashboard)/tax-calculator/
    page.tsx                       ← Server Component stub
  components/tax-calculator/
    TaxCalculatorPage.tsx          ← Client root + estado (useSampleData, cgView, year)
    TaxPageHead.tsx                ← h1 + help + TaxYearChip
    TaxKpiStrip.tsx                ← 3 cartões fat (grid 1.4fr 1fr 1fr)
    CapitalGainsPanel.tsx          ← header + SegSelector + Aggregate/Detailed + empty
    DividendTaxPanel.tsx           ← agregados + tabela + empty
    TaxEmptyState.tsx              ← icon + message parametrizável
    TaxTweaksPanel.tsx             ← FAB Show sample data + CG view radio
    mock-data.ts                   ← SAMPLE_EVENTS_2026, TAX_SETTINGS, rateForHoldYears, fmtEUR, fmtDate
```
(`SegSelector` pode ser inline em `CapitalGainsPanel.tsx` ou ficheiro próprio.)

### Tipos derivados
```ts
interface CgRow extends SaleEvent { gain: number; rate: number; tax: number; }
interface DivRow extends DividendEvent { tax: number; }
```

### Determinismo (Requisito Não-Funcional)
Toda a matemática é pura e determinística — os mesmos inputs produzem sempre os mesmos valores. Os valores de referência (CA-02/04/05/06) servem de oráculo. Tolerância de arredondamento ao cêntimo é aceitável (ex.: €207.56 vs €207.57) desde que resulte da mesma fórmula `max(0, gain) * rate/100` arredondada a 2 casas.

### Sem chamadas de rede
A página renderiza 100% com dados mock — nenhuma chamada a API, Supabase, Yahoo ou Anthropic. `TaxCalculatorPage` é puramente client-side com estado local.

### Acessibilidade
- `<h1>` único por página ("Tax Calculator")
- Help button: `aria-label="How is this calculated?"` além do `title`
- `<select>` do ano: `<label>` envolvente ou `aria-label="Tax Year"`
- Seg selector: botões com `aria-pressed`; radio do TweaksPanel idem
- Tabelas: `<table>` com `<caption className="sr-only">` descritiva; `<th scope="col">`
- Toggle "Show sample data": `role="switch" aria-checked` (padrão do `Toggle` de `TxTweaksPanel`)
- Empty states: ícones `aria-hidden="true"`, texto legível por screen reader

### Fronteira servidor/cliente
Todos os componentes de `tax-calculator/` excepto `page.tsx` são Client Components (`"use client"`). Nenhum import de `@/lib/anthropic` ou `@/lib/yahoo-finance` (server-only) — não aplicável aqui (sem backend). `mock-data.ts` é isomórfico (sem APIs de browser/server), pode ser importado por qualquer um.

### Pontos de fidelidade ao protótipo (não desviar)
1. **`fmtEUR` usa `en-GB`** (não pt-PT) — requisito explícito do working item
2. Sinal negativo `−` (U+2212), nunca hífen `-`
3. KPI 1 valor: `neon-loss` é text-shadow sobre texto `--foreground` (não mudar cor base para `--loss`)
4. `min-h-[340px]` igual em ambos os painéis
5. Grid KPI `1.4fr 1fr 1fr` (cartão 1 mais largo)
6. Linhas agregadas com `border-dashed`, última sem borda
7. Sufixo `tier-weighted` em `0.62em` muted no "Capital gains tax due"
8. Badge dividend rate arredondado a inteiro: `28% rate`

### Tokens já verificados (sem alterações a `globals.css`)
- `neon-loss` — existe (`globals.css:192`, text-shadow vermelho) ✅
- `--gain` / `--loss` — existem (`globals.css:123-124`) ✅
- `--chart-3` (âmbar, ícone Dividend Tax) — existe (`globals.css:138`) ✅
- `.rise`, `.d0`–`.d3` — existem (usadas nas páginas redesenhadas) ✅

**Nenhuma variável CSS nova é necessária** para esta página. Diverge da Performance (que precisou de `--gain-soft`/`--loss-soft` para badges ROI) — aqui não há badges com fundo semântico suave.
