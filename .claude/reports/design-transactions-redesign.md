# Especificação Visual — Transactions Page

**Working Item:** `.claude/working-items/transactions-redesign.md`
**Protótipo:** `.claude/design-handoff/project/Transactions.html` + `tx-app.jsx`
**DESIGN.md:** consultado
**Referência de formato:** `design-holdings-redesign.md`

---

## Resumo Visual

A página `/transactions` é um terminal de registo financeiro — densa, ordenada, com cor semântica pontual. O layout é tri-camada vertical: filter row → type tabs → tabela + footer, tudo dentro de um único `tx-card` com superfície `bg-card`. O page head flutua acima do card com título e acções (Import, Add Manually). O painel de tweaks (TweaksPanel) é um widget flutuante no canto inferior direito que controla densidade e colunas opcionais. A intenção visual é "livro-razão digital" — IBM Plex Mono em tudo, badges semânticos por tipo de operação, cor reservada para o que importa (ganho/perda no Total, tab activa em teal, modo de edição em danger red).

---

## Hierarquia Visual da Página

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (220px sticky)   │  MAIN COLUMN (flex-1)                        │
│  ──────────────────────── │  ─────────────────────────────────────────── │
│  [F] FINTrack / v0.1      │  TOPBAR: day · date · [neon-dot] LIVE        │
│                            │  ─────────────────────────────────────────── │
│  Dashboard                │  MAIN (p-6, flex-col gap-5)                  │
│  Holdings                 │                                               │
│  Transactions ←── ACTIVO │  PAGE HEAD (rise d1)                         │
│    badge: 13              │  ┌───────────────────────────────────────┐  │
│  Performance              │  │ Transactions        [?] [↑ Import]    │  │
│  Tax Calculator           │  │                     [+ Add Manually]  │  │
│                            │  └───────────────────────────────────────┘  │
│  Settings                 │                                               │
└───────────────────────────│  TX CARD (rise d2) — bg-card border rounded  │
                             │  ┌─────────────────────────────────────────┐ │
                             │  │ FILTER ROW (px-5 py-4 border-b)         │ │
                             │  │  [📅 From] [📅 To] [🔍 Ticker] [Type ▾]│ │
                             │  │                          [✏ Edit]        │ │
                             │  │─────────────────────────────────────────│ │
                             │  │ TYPE TABS (grid-cols-6 border-b)         │ │
                             │  │  [All 13] [Buy/Sell 7*] [Cash 2]         │ │
                             │  │  [Conv 1] [Dividend 2] [Interest 1]      │ │
                             │  │──────────────────────────── (* activa)   │ │
                             │  │ TABLE (overflow-x-auto)                  │ │
                             │  │  Date  Ticker  Type  Qty  Price  FX  Fee│ │
                             │  │  Total                                   │ │
                             │  │  [linhas com badges coloridos]           │ │
                             │  │─────────────────────────────────────────│ │
                             │  │ FOOTER: Total: 7 transactions  Show: 20▾│ │
                             │  └─────────────────────────────────────────┘ │
                             │                                               │
                             │  TWEAKS PANEL (fixed bottom-right, z-top)    │
                             └───────────────────────────────────────────────┘
```

**Hierarquia de destaque:**
1. **Type badge na coluna Type** — leitura imediata da operação (BUY verde, SELL vermelho, DIV âmbar, etc.)
2. **Coluna Total** — cor semântica: `--loss` para negativo, `--gain` para DIV/INT, neutro restantes
3. **Tab activa** — underline teal com glow + fundo muted, única cor de destaque na navegação por tipos
4. **Botão "Edit" activo** — passa para `btn--primary` (teal) sinalizando modo de edição
5. **Botão "Delete (n)"** — danger styling (fundo loss sutil, borda e texto `--loss`) — atenção sem pânico
6. **Metadados** (headers da tabela, labels dos filtros, footer count) — `text-muted-foreground`

---

## Componentes a Criar

### TransactionsPage
- **Localização:** `src/components/transactions/TransactionsPage.tsx`
- **Tipo:** Client Component (`"use client"`)
- **Layout:** `flex flex-col gap-5` dentro do `<main>` do layout dashboard. Contém: `TxPageHead`, `TxCard`.
- **Tokens CSS:** `bg-background`, `text-foreground`
- **Classes neon:** nenhuma directamente — delegadas aos filhos
- **shadcn/ui:** nenhum directamente
- **Estados visuais:** sem loading nesta fase (dados mock)
- **Comportamento:** Componente raiz que mantém estado global da página:
  - `activeTab: TabKey` — default `'bs'`
  - `fromDate: string`, `toDate: string` — default `''`
  - `tickerQuery: string` — default `''`
  - `typeFilter: string` — default `'all'`
  - `editMode: boolean` — default `false`
  - `selected: Set<string>` — default `new Set()`
  - `sort: { col: SortCol; dir: SortDir }` — default `{ col: 'date', dir: 'desc' }`
  - `pageSize: number` — default `20`
  - `density: Density` — default `'comfortable'`
  - `showFx: boolean` — default `true`
  - `showFees: boolean` — default `true`
  - Passa props para `TxPageHead` e `TxCard`
  - Usa `useAnimations()` para controlar classes `rise` e delay classes
  - Calcula `counts` (contagem por tab com filtros globais mas sem filtro da tab) via `useMemo`
  - Calcula `filtered` (transacções filtradas + ordenadas) via `useMemo`
  - Calcula `paged` = `filtered.slice(0, pageSize)` via `useMemo`

---

### mock-data (módulo de dados)
- **Localização:** `src/components/transactions/mock-data.ts`
- **Tipo:** Módulo utilitário (sem JSX)
- **Comportamento:** Exporta:
  - `TRANSACTIONS: Transaction[]` — exactamente os 13 registos do working item
  - `TYPE_TABS: TabDefinition[]` — array dos 6 tabs com `key`, `label`, `match`
  - `TYPE_LABEL: Record<TransactionType, string>` — `{ buy: 'BUY', sell: 'SELL', ... }`
  - Funções auxiliares: `fmt(n, cur, opts?)`, `fmtDate(iso: string): string`

  **Tipo `Transaction`:**
  ```ts
  interface Transaction {
    id: string;
    date: string;       // ISO 'YYYY-MM-DD'
    ticker: string;
    type: TransactionType;
    qty: number | null;
    price: number | null;
    cur: string;        // 'EUR' | 'USD' | 'GBP'
    fx: number;
    fee: number;
    total: number;
    label?: string;     // para CASH / INT sem ticker real
  }

  type TransactionType = 'buy' | 'sell' | 'cash' | 'conv' | 'div' | 'int';

  interface TabDefinition {
    key: TabKey;
    label: string;
    match: (tx: Transaction) => boolean;
  }

  type TabKey = 'all' | 'bs' | 'cash' | 'conv' | 'div' | 'int';
  type SortCol = 'date' | 'ticker' | 'type' | 'qty' | 'price' | 'fx' | 'fee' | 'total';
  type SortDir = 'asc' | 'desc';
  type Density = 'compact' | 'comfortable' | 'spacious';
  ```

  **Dados mock (13 transacções — exactamente do working item):**
  ```ts
  const TRANSACTIONS: Transaction[] = [
    { id:'t1',  date:'2026-04-02', ticker:'VWCE',    type:'buy',  qty:15,   price:12.00,   cur:'EUR', fx:1.0000, fee:0.00, total:180.00 },
    { id:'t2',  date:'2026-02-05', ticker:'AMAT',    type:'buy',  qty:12,   price:556.00,  cur:'GBP', fx:1.0000, fee:0.00, total:6672.00 },
    { id:'t3',  date:'2025-12-10', ticker:'PPLT',    type:'buy',  qty:123,  price:1233.00, cur:'USD', fx:1.1628, fee:0.00, total:151659.00 },
    { id:'t4',  date:'2026-04-22', ticker:'CSPX',    type:'buy',  qty:14,   price:480.20,  cur:'EUR', fx:1.0000, fee:1.20, total:6723.80 },
    { id:'t5',  date:'2026-03-18', ticker:'MSFT',    type:'buy',  qty:5,    price:320.00,  cur:'USD', fx:1.0871, fee:0.50, total:1740.86 },
    { id:'t6',  date:'2026-03-30', ticker:'TSLA',    type:'sell', qty:4,    price:245.00,  cur:'USD', fx:1.0871, fee:0.50, total:1065.86 },
    { id:'t7',  date:'2026-03-12', ticker:'GLD',     type:'sell', qty:6,    price:198.20,  cur:'USD', fx:1.0871, fee:0.50, total:1293.41 },
    { id:'t8',  date:'2026-01-15', ticker:'—',       type:'cash', qty:null, price:null,    cur:'EUR', fx:1.0000, fee:0.00, total:5000.00,    label:'Deposit · IBKR' },
    { id:'t9',  date:'2026-02-28', ticker:'—',       type:'cash', qty:null, price:null,    cur:'EUR', fx:1.0000, fee:0.00, total:-1200.00,   label:'Withdrawal' },
    { id:'t10', date:'2026-02-04', ticker:'EUR→USD', type:'conv', qty:1000, price:1.087,   cur:'USD', fx:1.0871, fee:1.50, total:1087.00,    label:'EUR → USD' },
    { id:'t11', date:'2026-03-01', ticker:'CSPX',    type:'div',  qty:null, price:null,    cur:'EUR', fx:1.0000, fee:0.00, total:24.40 },
    { id:'t12', date:'2026-04-01', ticker:'VWCE',    type:'div',  qty:null, price:null,    cur:'EUR', fx:1.0000, fee:0.00, total:12.80 },
    { id:'t13', date:'2026-03-31', ticker:'—',       type:'int',  qty:null, price:null,    cur:'EUR', fx:1.0000, fee:0.00, total:8.16,       label:'Cash interest' },
  ];
  ```

  **Função `fmt`:**
  ```ts
  const SYMBOL: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' };
  function fmt(n: number | null, cur: string, opts?: { signed?: boolean; dec?: number }): string
  // se null → '—'
  // signed: true → prefixo '+' para positivos, '−' para negativos
  // dec: casas decimais (default 2)
  // ex: fmt(180, 'EUR') → '€180.00'
  // ex: fmt(-1200, 'EUR', { signed: true }) → '−€1,200.00'
  ```

  **Função `fmtDate`:**
  ```ts
  function fmtDate(iso: string): string
  // '2026-04-02' → '02/04/2026'
  ```

---

### TxPageHead
- **Localização:** `src/components/transactions/TxPageHead.tsx`
- **Tipo:** Client Component (precisa de `useAnimations`)
- **Layout:** `flex items-center justify-between gap-5` — título à esquerda, acções à direita
- **Tokens CSS:** `text-foreground` (título), `text-muted-foreground` (meta)
- **Classes neon:** nenhuma — o neon está no sidebar badge e no tx-card
- **shadcn/ui:** `Button` (variants `ghost` e `default`)
- **Comportamento:**
  - Título `<h1>`: `text-2xl font-medium tracking-tight leading-none` — texto "Transactions"
  - Acções (`flex items-center gap-2`):
    - Botão "?" (Help): `Button variant="ghost" size="icon"` — ícone círculo com `?` — stub visual
    - Botão "Import": `Button variant="ghost"` com ícone upload SVG 14×14 + texto "Import" — stub visual, sem funcionalidade
    - Botão "Add Manually": `Button variant="default"` (teal) com ícone `+` SVG 14×14 + texto "Add Manually" — stub visual nesta fase
  - Animação: `rise d1` quando animations ON

  **Ícones inline (SVGs 14×14, stroke="currentColor"):**
  ```
  Upload:  <path d="M2 11v1.5h10V11"/><path d="M7 2v8M4 5l3-3 3 3"/>
  Plus:    <path d="M7 2v10M2 7h10"/>
  Help:    <circle cx="8" cy="8" r="6.5"/><path d="M6 6.5c0-1 1-2 2-2s2 1 2 2-2 1.5-2 2.5M8 11.5v.01"/>
  ```

---

### TxCard
- **Localização:** `src/components/transactions/TxCard.tsx`
- **Tipo:** Client Component
- **Layout:** `bg-card border border-border/50 rounded-lg overflow-hidden flex flex-col`
- **Tokens CSS:** `bg-card`, `border-border/50`, `rounded-lg`
- **Classes neon:** nenhuma no card em si
- **shadcn/ui:** nenhum
- **Estados visuais:** sem loading (dados mock)
- **Comportamento:**
  - Props recebidas: `filtered`, `paged`, `counts`, `activeTab`, `onTabChange`, `fromDate`, `toDate`, `tickerQuery`, `typeFilter`, `onFromDateChange`, `onToDateChange`, `onTickerQueryChange`, `onTypeFilterChange`, `editMode`, `onEditModeToggle`, `selected`, `onToggleOne`, `onToggleAll`, `onDelete`, `sort`, `onSort`, `pageSize`, `onPageSizeChange`, `density`, `showFx`, `showFees`
  - Contém em sequência: `FilterRow`, `TypeTabs`, `TxTable` ou `EmptyState`, `TxFooter`
  - Animação: `rise d2` no card wrapper quando animations ON

---

### FilterRow
- **Localização:** `src/components/transactions/FilterRow.tsx` (ou sub-componente interno de TxCard)
- **Tipo:** Client Component
- **Layout:** `flex items-center justify-between px-5 py-4 border-b border-border/50 gap-4 flex-wrap`
  - Esquerda: `flex items-center gap-2 flex-wrap` — 4 input chips
  - Direita: `flex items-center gap-2` — botões de acção do edit mode
- **Tokens CSS:**
  - Chip container: `bg-muted border border-border hover:border-border/70 rounded-md px-3 py-[7px] inline-flex items-center gap-2 min-h-[32px] text-sm cursor-pointer transition-colors`
  - Input dentro do chip: `bg-transparent border-none outline-none text-foreground font-mono text-sm w-[110px] placeholder:text-muted-foreground`
  - Select dentro do chip: `bg-transparent border-none outline-none text-foreground font-mono text-sm cursor-pointer appearance-none pr-4 bg-no-repeat bg-right` mais uma classe arbitrária de background-image com chevron via data-URI (sintaxe literal omitida — não escrever a classe `url()` em ficheiros escaneados pelo Tailwind, ver bug do build)
- **shadcn/ui:** nenhum (chips manuais, conforme protótipo)
- **Comportamento:**

  **4 chips de filtro (esquerda):**
  | # | Ícone | Tipo | Placeholder/Label | Estado |
  |---|-------|------|-------------------|--------|
  | 1 | CalendarIcon 14px | `<input type="date">` | "From" | controlado por `fromDate` |
  | 2 | CalendarIcon 14px | `<input type="date">` | "To" | controlado por `toDate` |
  | 3 | FilterIcon 14px | `<input type="text">` | "Filter by ticker" | controlado por `tickerQuery` |
  | 4 | — | `<select>` | "All Types" | controlado por `typeFilter` |

  **Select "All Types" — opções:**
  ```
  all     → All Types
  buy     → Buy
  sell    → Sell
  cash    → Cash Movement
  conv    → Conversion
  div     → Dividend
  int     → Interest
  ```

  **Acções (direita):**
  - Botão "Edit" (sempre visível): `variant={editMode ? 'primary' : 'ghost'}` com ícone pencil 14×14 + "Edit". Quando activo: `bg-primary/10 border border-primary/40 text-primary` (style inline ou classe btn--primary adaptada)
  - Em edit mode, adicionalmente:
    - Botão "Select All (n)": `variant="ghost"` com CheckBox mini + texto `"Select All ({paged.length})"`. CheckBox estado: `'on'` se todos seleccionados, `'mixed'` se alguns, `'off'` se nenhum.
    - Botão "Delete (n)": `bg-[var(--loss)]/12 border border-[var(--loss)]/40 text-[var(--loss)]` + ícone trash 14×14 + `"Delete ({selected.size})"`. `disabled={selected.size === 0}` → `opacity-50 cursor-not-allowed`

  **Ícones inline (14×14):**
  ```
  Calendar: <rect x="1.5" y="2.5" width="11" height="10" rx="0.5"/><path d="M1.5 5h11M4 1.5v2M10 1.5v2"/>
  Filter:   <path d="M1.5 2.5h11l-4 5v4l-3 1.5v-5.5z"/>
  Pencil:   <path d="M1.5 12.5l1-3 7-7 2 2-7 7z"/><path d="M8.5 3.5l2 2"/>
  Trash:    <path d="M2.5 3.5h9M5 3.5v-1.5h4v1.5M3.5 3.5l.5 9h6l.5-9"/>
  ```

---

### TypeTabs
- **Localização:** `src/components/transactions/TypeTabs.tsx` (ou sub-componente interno de TxCard)
- **Tipo:** Client Component
- **Layout:**
  - Container: `grid grid-cols-6 bg-background border-b border-border/50`
  - Em `max-width: 900px` → `grid-cols-3` (via classe Tailwind responsiva `grid-cols-3 md:grid-cols-6`)
- **Tokens CSS:**
  - Tab inactiva: `px-4 py-4 bg-transparent border-none text-muted-foreground font-mono text-sm font-medium cursor-pointer transition-colors border-r border-border/50 inline-flex items-center justify-center gap-2 tracking-wide hover:text-foreground hover:bg-muted/50`
  - Tab activa: `text-foreground bg-muted/60 relative` + pseudo-elemento `::after` com linha inferior teal
  - Última tab: sem `border-r`
  - Em 3 colunas (responsive): linha inferior interna `border-b border-border/50` nas primeiras 3 tabs
- **Classes neon:** tab activa tem `::after { background: var(--primary); box-shadow: 0 0 8px oklch(0.72 0.17 185 / 60%) }` — implementado via style inline ou CSS module
- **Comportamento:**
  - Props: `tabs: TabDefinition[]`, `activeTab: TabKey`, `counts: Record<TabKey, number>`, `onTabChange: (key: TabKey) => void`
  - Renderiza 6 botões — um por tab — com label + badge de contagem

  **Badge de contagem por tab:**
  - Inactiva: `bg-card text-muted-foreground border border-border/50 rounded-sm text-[10px] px-[5px] py-[1px] tabular-nums tracking-wide`
  - Activa: `text-primary border-primary/40 bg-primary/10 rounded-sm text-[10px] px-[5px] py-[1px] tabular-nums tracking-wide`

  **6 tabs com labels e counts (dados mock sem filtros):**
  | key | label | count |
  |-----|-------|-------|
  | all | All | 13 |
  | bs | Buy / Sell | 7 |
  | cash | Cash Movement | 2 |
  | conv | Conversion | 1 |
  | div | Dividend | 2 |
  | int | Interest | 1 |

---

### TypeBadge
- **Localização:** `src/components/transactions/TypeBadge.tsx`
- **Tipo:** Componente puro (pode ser função simples)
- **Layout:** `inline-flex px-2 py-[3px] rounded-sm text-[10px] font-semibold tracking-wider uppercase font-variant-numeric-tabular`
- **Tokens CSS por variante:**

  | type | fundo | texto | borda |
  |------|-------|-------|-------|
  | buy  | `bg-[var(--gain)]/12` | `text-[var(--gain)]` | `border border-[var(--gain)]/40` |
  | sell | `bg-[var(--loss)]/12` | `text-[var(--loss)]` | `border border-[var(--loss)]/40` |
  | cash | `bg-muted` | `text-muted-foreground` | `border border-border/70` |
  | conv | `bg-[#38BDF8]/12` | `text-chart-5` | `border border-[#38BDF8]/40` |
  | div  | `bg-[#F59E0B]/12` | `text-chart-3` | `border border-[#F59E0B]/40` |
  | int  | `bg-[#8B5CF6]/12` | `text-chart-2` | `border border-[#8B5CF6]/40` |

- **Labels:**
  | type | label exibido |
  |------|--------------|
  | buy  | BUY |
  | sell | SELL |
  | cash | CASH |
  | conv | CONV |
  | div  | DIV |
  | int  | INT |

- **Props:** `type: TransactionType`

---

### CheckBox
- **Localização:** `src/components/transactions/CheckBox.tsx`
- **Tipo:** Componente puro
- **Layout:** `inline-grid place-items-center w-4 h-4 rounded-[3px] border cursor-pointer transition-colors flex-shrink-0`
- **Tokens CSS por estado:**

  | estado | border | background | after |
  |--------|--------|------------|-------|
  | off | `border-border/70 hover:border-primary` | `bg-muted` | nenhum |
  | on | `border-primary` | `bg-primary` + `box-shadow: 0 0 8px oklch(0.72 0.17 185 / 40%)` | checkmark branco (4×8, border 2px, rotate 45deg) |
  | mixed | `border-primary` | `bg-primary` | traço horizontal branco (8×2) |

- **Props:** `state: 'off' | 'on' | 'mixed'`, `onClick: () => void`, `label?: string` (para `aria-label`)

---

### TxTable
- **Localização:** `src/components/transactions/TxTable.tsx`
- **Tipo:** Client Component
- **Layout:** `<div className="overflow-x-auto">` envolvendo `<table className="w-full border-collapse">`
- **Tokens CSS:**
  - `<thead th>`: `text-left px-4 py-3 border-b border-border/40 text-[10px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap`
  - `<thead th>.num-col`: `text-right`
  - `<thead th>.center`: `text-center`
  - `<thead th>:first-child`: `pl-5`
  - `<thead th>:last-child`: `pr-5`
  - `<tbody td>`: `px-4 py-4 border-b border-border/40 tabular-nums text-sm align-middle`
  - `<tbody td>.num-col`: `text-right`
  - `<tbody td>:first-child`: `pl-5`
  - `<tbody td>:last-child`: `pr-5`
  - `<tbody tr>`: `transition-colors hover:bg-muted/40`
  - `<tbody tr>.selected`: `bg-primary/8 hover:bg-primary/12`
  - `<tbody tr>:last-child td`: `border-b-0`
- **Density classes:**
  - `compact`: td `px-3 py-2 text-xs`, th `px-3 py-2`
  - `comfortable`: td `px-4 py-4 text-sm` (default)
  - `spacious`: td `px-4 py-5 text-sm`, th `px-4 py-4`
- **Classes neon:** nenhuma no componente wrapper — cor semântica nas células
- **shadcn/ui:** nenhum
- **Props:** `rows: Transaction[]`, `editMode: boolean`, `selected: Set<string>`, `sort: SortState`, `onSort: (col: SortCol) => void`, `onToggleOne: (id: string) => void`, `onToggleAll: () => void`, `allOnPageSelected: boolean`, `someSelected: boolean`, `density: Density`, `showFx: boolean`, `showFees: boolean`

  **8 colunas (+ opcional checkbox em edit mode):**
  | Coluna | sortCol | Alinhamento | Notas |
  |--------|---------|-------------|-------|
  | (Checkbox) | — | center | apenas em `editMode`; header: CheckBox com estado all/mixed/off |
  | Date | `'date'` | esquerda | `fmtDate(tx.date)` — DD/MM/YYYY |
  | Ticker | `'ticker'` | esquerda | `font-semibold tracking-wide`; para CASH/INT mostrar `tx.label \|\| tx.ticker` |
  | Type | `'type'` | esquerda | `<TypeBadge type={tx.type} />` |
  | Quantity | `'qty'` | direita | `tx.qty ?? '—'`; null → `—` |
  | Price | `'price'` | direita | `fmt(tx.price, tx.cur)` |
  | Exchange Rate | `'fx'` | direita | `tx.fx.toFixed(4)` — visível apenas se `showFx` |
  | Fee | `'fee'` | direita | `fmt(tx.fee, 'EUR')` — visível apenas se `showFees`; pequeno ícone info no header |
  | Total | `'total'` | direita | cor semântica (ver abaixo) |

  **Cor semântica da coluna Total:**
  - `tx.total < 0` → `text-[var(--loss)]`
  - `tx.type === 'div' || tx.type === 'int'` → `text-[var(--gain)]`
  - restantes → `text-foreground`
  - Sinal explícito `signed: true` para CASH e SELL

  **Sort arrows no header:**
  - Coluna activa descendente: `▼` em `text-primary`
  - Coluna activa ascendente: `▲` em `text-primary`
  - Coluna inactiva: `↕` em `text-muted-foreground/50`
  - Header sortable: `cursor-pointer transition-colors hover:text-foreground`

  **Acessibilidade:**
  - `<table>` com `<caption className="sr-only">Histórico de transacções</caption>`
  - `aria-sort="ascending" | "descending" | "none"` nos `<th>` sortáveis
  - Buttons dentro dos `<th>` sortáveis em vez de onClick directo no th

---

### EmptyState
- **Localização:** `src/components/transactions/EmptyState.tsx` (ou inline no TxCard)
- **Tipo:** Componente puro
- **Layout:** `py-16 text-center text-muted-foreground flex flex-col items-center gap-3`
- **Tokens CSS:** `text-muted-foreground`, título `text-foreground font-medium`
- **shadcn/ui:** nenhum
- **Comportamento:**
  - Ícone SVG 32×32 de lista vazia em `text-muted-foreground/40`
  - `<p className="text-base font-medium text-foreground">No transactions match your filters</p>`
  - `<p className="text-sm text-muted-foreground">Try clearing the date range or ticker filter</p>`

---

### TxFooter
- **Localização:** `src/components/transactions/TxFooter.tsx` (ou sub-componente interno)
- **Tipo:** Client Component
- **Layout:** `flex items-center justify-between px-5 py-4 border-t border-border/50 bg-background gap-4`
- **Tokens CSS:** `text-sm text-muted-foreground`
- **shadcn/ui:** nenhum
- **Comportamento:**
  - Esquerda: contador `"Total: {filtered.length} transactions"` com count em `font-medium text-foreground`; se `selected.size > 0`, adiciona ` · {selected.size} selected` com count em `text-primary`
  - Direita: `flex items-center gap-3` — label "Show:" + chip select com opções 10/20/50/100

  **Selector de page size:**
  ```tsx
  <label className="bg-muted border border-border/50 rounded-md px-2 py-1 inline-flex items-center gap-1">
    <select value={pageSize} onChange={...} className="bg-transparent border-none outline-none text-foreground font-mono text-sm cursor-pointer">
      <option value={10}>10</option>
      <option value={20}>20</option>
      <option value={50}>50</option>
      <option value={100}>100</option>
    </select>
  </label>
  ```

---

### TweaksPanel (adaptado para Transactions)
- **Localização:** Não criar novo ficheiro — a lógica vive em `TransactionsPage.tsx` (estado) e num painel inline ou componente `TxTweaksPanel.tsx`
- **Tipo:** Client Component
- **Layout:** Botão de toggle fixo no canto inferior direito (`fixed bottom-4 right-4 z-50`) + panel flutuante (`fixed bottom-16 right-4 w-64 z-50 bg-card border border-border/50 rounded-lg shadow-xl p-4 flex flex-col gap-4`)
- **Tokens CSS:** `bg-card border-border/50 rounded-lg`, sectores com `text-[10px] uppercase tracking-wider text-muted-foreground`
- **shadcn/ui:** nenhum
- **Comportamento:**
  - Botão de toggle: ícone de sliders (3 linhas horizontais com circles) — `Button variant="outline" size="icon"` ou equivalente manual
  - Estado `panelOpen: boolean` local
  - Ao abrir: revela painel com animação sutil fade/slide

  **Conteúdo do painel:**
  - Secção "Display":
    - Radio "Density": 3 opções `compact | comfortable | spacious` — comfortable activa por defeito
    - Visual: segmented control (`inline-flex border border-border/50 rounded-md overflow-hidden`) com 3 botões
    - Botão activo: `bg-primary/10 text-primary font-medium text-xs px-3 py-1.5`
    - Botão inactivo: `bg-transparent text-muted-foreground text-xs px-3 py-1.5 hover:bg-muted/60`
  - Secção "Columns":
    - Toggle "Show exchange rate" — default ON — usa padrão `ShowSoldToggle` existente
    - Toggle "Show fees" — default ON — usa padrão `ShowSoldToggle` existente

  **Reutilizar `ShowSoldToggle` pattern** de `src/components/holdings/ShowSoldToggle.tsx` para os toggles do painel.

---

## Componentes a Modificar

### Sidebar
- **Localização:** `src/components/layout/sidebar.tsx`
- **Alteração:** No array `NAV_ITEMS`, o item "Transactions" passa de `{ href: "#", active: false }` para `{ href: "/transactions", active: true }`.
- **Adicionar badge de contagem:** O item "Transactions" exibe um badge com o número total de transacções (hardcoded `13` nesta fase com mock data).
- **Implementação do badge:** `<span className="ml-auto text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm tabular-nums border border-border/50">{count}</span>` — dentro do Link, após o label.
- **Impacto visual:** O item "Transactions" deixa de estar desactivado e passa a ser um `<Link>` real com badge de contagem. Quando o utilizador está em `/transactions`, o item exibe o indicador visual activo: `bg-sidebar-accent text-primary font-medium border-l-2 border-primary pl-[10px]`.

---

## Estrutura de Ficheiros a Criar

```
src/
  app/(dashboard)/transactions/
    page.tsx                              ← Server Component (stub, monta TransactionsPage)
  components/transactions/
    TransactionsPage.tsx                  ← Client Component root + state
    TxPageHead.tsx                        ← Título + acções (Import, Add Manually)
    TxCard.tsx                            ← Wrapper do card principal
    FilterRow.tsx                         ← 4 chips de filtro + acções edit mode
    TypeTabs.tsx                          ← Grid de 6 tabs com badge de contagem
    TypeBadge.tsx                         ← Badge inline por tipo de transacção
    CheckBox.tsx                          ← Custom checkbox (off/on/mixed)
    TxTable.tsx                           ← Tabela ordenável com densidade variável
    EmptyState.tsx                        ← Estado vazio quando filtros vaziam tabela
    TxFooter.tsx                          ← Footer com count + selector page size
    TxTweaksPanel.tsx                     ← Painel flutuante: densidade + colunas opcionais
    mock-data.ts                          ← 13 transacções + helpers fmt/fmtDate
```

**Layout da rota `/transactions`:**
A rota `/transactions` usa o mesmo `DashboardLayout` (`src/app/(dashboard)/layout.tsx`) que todas as outras páginas protegidas. Não criar novo layout — apenas criar `src/app/(dashboard)/transactions/page.tsx` como Server Component que renderiza `<TransactionsPage />`.

---

## Tokens e Classes Utilizados

| Elemento | Token/Classe | Motivo |
|----------|-------------|--------|
| Background da página | `bg-background` | Camada base do layout |
| TX card | `bg-card border-border/50 rounded-lg` | Superfície card — consistência DESIGN.md |
| Filter row/footer border | `border-border/50` | Separação visual interna |
| Input chip container | `bg-muted border-border rounded-md` | Superfície secundária — inputs |
| Input chip hover | `hover:border-border/70` | Feedback interactivo subtil |
| Type tab grid | `bg-background border-b border-border/50` | Background recuado vs card |
| Tab activa | `bg-muted/60 text-foreground` | Sinalização de estado activo |
| Tab activa underline | `bg-primary box-shadow: glow-primary` | Acento teal — único elemento neon aqui |
| Tab count activa | `text-primary bg-primary/10 border-primary/40` | Secundário do acento teal |
| Tab count inactiva | `text-muted-foreground bg-card border-border/50` | Hierarquia inferior |
| Table header | `text-[10px] uppercase tracking-wider text-muted-foreground` | Padrão DESIGN.md tabelas |
| Table row hover | `hover:bg-muted/40` | Feedback interactivo subtil |
| Table row selected | `bg-primary/8 hover:bg-primary/12` | Sinalização de selecção sem agressividade |
| Table row separator | `border-b border-border/40` | Estrutura de leitura |
| Ticker cell | `font-semibold tracking-wide` | Identidade primária do activo |
| TypeBadge BUY | `bg-[var(--gain)]/12 text-[var(--gain)] border-[var(--gain)]/40` | Semântica financeira positiva |
| TypeBadge SELL | `bg-[var(--loss)]/12 text-[var(--loss)] border-[var(--loss)]/40` | Semântica financeira negativa |
| TypeBadge CASH | `bg-muted text-muted-foreground border-border/70` | Neutro — sem polaridade |
| TypeBadge CONV | `bg-[#38BDF8]/12 text-chart-5 border-[#38BDF8]/40` | Azul céu — operação técnica |
| TypeBadge DIV | `bg-[#F59E0B]/12 text-chart-3 border-[#F59E0B]/40` | Âmbar — rendimento passivo |
| TypeBadge INT | `bg-[#8B5CF6]/12 text-chart-2 border-[#8B5CF6]/40` | Violeta — rendimento de juros |
| Total negativo | `text-[var(--loss)]` | Semântica de perda |
| Total DIV/INT | `text-[var(--gain)]` | Semântica de ganho |
| Total neutro | `text-foreground` | Sem polaridade |
| Sort arrow activo | `text-primary` | Acento teal no sort activo |
| Sort arrow inactivo | `text-muted-foreground/50` | Hierarquia secundária |
| Botão Edit activo | `bg-primary/10 border-primary/40 text-primary` | Sinalização de modo activo |
| Botão Delete | `bg-[var(--loss)]/12 border-[var(--loss)]/40 text-[var(--loss)]` | Danger sem agressividade |
| Botão Delete disabled | `opacity-50 cursor-not-allowed` | Estado desabilitado |
| Checkbox ON | `bg-primary border-primary box-shadow: glow-primary` | Acento teal na selecção |
| Footer count | `text-sm text-muted-foreground` | Hierarquia terciária |
| Footer count total | `font-medium text-foreground` | Destaque no número |
| Footer selected count | `text-primary` | Acento teal no count de selecção |
| Tweaks panel | `bg-card border-border/50 rounded-lg shadow-xl` | Superfície flutuante sobre tudo |
| Tweaks segment activo | `bg-primary/10 text-primary font-medium` | Sinalização de opção activa |
| Badge sidebar | `bg-muted text-muted-foreground border-border/50` | Contagem de transacções subtil |
| Números | `tabular-nums font-mono` | Alinhamento em colunas — DESIGN.md |
| Rise entrance | `.rise .d0` a `.rise .d2` | Animação escalonada controlada por `useAnimations` |

---

## Estados e Feedback Visual

| Estado | Comportamento Visual |
|--------|---------------------|
| Tab "Buy / Sell" default | Tab `bs` activa com underline teal e count badge teal ao carregar |
| Tab activa hover | `hover:bg-muted/60` nas tabs inactivas |
| Filtro data activo | Input date chip mostra data seleccionada |
| Filtro ticker activo | Input text chip mostra query digitada |
| Filtro tipo activo | Select chip mostra tipo seleccionado |
| Filtros sem resultados | Tabela substituída por `EmptyState` centrado |
| Filtros com resultados | Tabela normal com count no footer actualizado |
| Sort ascending | Header mostra `▲` em `text-primary` |
| Sort descending | Header mostra `▼` em `text-primary` |
| Sort inactivo | Header mostra `↕` em `text-muted-foreground/50` |
| Sort default | Coluna Date descendente |
| Linha hover | `bg-muted/40` transitioning 140ms |
| Linha seleccionada | `bg-primary/8` |
| Linha seleccionada hover | `bg-primary/12` |
| Edit mode OFF | Tabela sem coluna checkbox; botão "Edit" em ghost |
| Edit mode ON | Botão "Edit" em `bg-primary/10 text-primary`; coluna checkbox visível; "Select All (n)" e "Delete (n)" aparecem |
| Select All (nenhum) | CheckBox no header em estado `'off'`; CheckBox no "Select All" em `'off'` |
| Select All (alguns) | CheckBox no header em estado `'mixed'` (traço horizontal) |
| Select All (todos) | CheckBox no header em estado `'on'` (check teal) |
| Delete (n=0) | Botão com `opacity-50 cursor-not-allowed disabled` |
| Delete (n>0) | Botão activo com danger styling; click → `alert('Would delete N transaction(s)')` |
| Sair edit mode | Selecção limpa, checkbox column desaparece, botão volta ao ghost |
| Page size change | Footer selector actualiza imediatamente `pageSize` → `paged` actualiza |
| Tweaks panel fechado | Botão de toggle fixo no canto inferior direito (ícone sliders) |
| Tweaks panel aberto | Painel flutuante aparece acima do botão com fade-in |
| Density compact | Tabela com `py-2 text-xs` nas células |
| Density comfortable | Tabela com `py-4 text-sm` (default) |
| Density spacious | Tabela com `py-5 text-sm` nas células |
| Show FX OFF | Coluna "Exchange Rate" oculta da tabela |
| Show Fees OFF | Coluna "Fee" oculta da tabela |
| Nav "Transactions" activo | `bg-sidebar-accent text-primary border-l-2 border-primary pl-[10px]` + badge count `13` |
| Animações ON | `.rise .d0`–`.d2` activos nos elementos da página |
| Animações OFF | Elementos aparecem imediatamente sem transição |

---

## Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| `< 700px` | Sidebar oculta (`hidden md:flex` já no sidebar.tsx) — layout passa a coluna única |
| `< 900px` | Type tabs colapsa de `grid-cols-6` para `grid-cols-3` — `grid-cols-3 md:grid-cols-6` |
| `< 1200px` | Filter row passa de flex-row para flex-column — `flex-col md:flex-row` ou `@media max-width: 1200px { flex-direction: column }` |
| Tabela | `overflow-x: auto` no wrapper — scroll horizontal em viewports estreitos sem quebra de colunas |
| TweaksPanel | Fixed positioning — sempre acessível independente do scroll |

---

## Animações de Entrada

Usar o mesmo mecanismo `useAnimations()` / classes `rise dN` do Dashboard e Holdings:

```tsx
const { enabled: animationsEnabled } = useAnimations();
const rise = animationsEnabled ? 'rise' : '';

// TxPageHead → className={`${rise} d1`}
// TxCard     → className={`tx-card ${rise} d2`}
```

As classes `rise`, `d0`–`d5` estão definidas em `globals.css` sob `.animations-enabled`. A animação `rise` faz `opacity: 0 → 1` + `translateY(6px → 0)` em 600ms `cubic-bezier(.2,.7,.2,1)`. Respeita o toggle de Settings via `localStorage`.

---

## Notas para o Frontend

### Gestão de estado
Todo o estado vive em `TransactionsPage.tsx` e flui como props para os filhos. Não usar contexto React — complexidade desnecessária para esta feature. O padrão é idêntico ao `HoldingsPage.tsx`.

### Filtros combinados (AND lógico)
```ts
function passGlobalFilters(tx: Transaction): boolean {
  if (fromDate && tx.date < fromDate) return false;
  if (toDate   && tx.date > toDate)   return false;
  if (tickerQuery && !tx.ticker.toLowerCase().includes(tickerQuery.toLowerCase())) return false;
  if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
  return true;
}
```

### Contagem por tab
Calculada com filtros globais activos mas sem considerar o filtro da própria tab:
```ts
const counts = useMemo(() => {
  const out: Record<TabKey, number> = {} as Record<TabKey, number>;
  TYPE_TABS.forEach((tab) => {
    out[tab.key] = TRANSACTIONS.filter(
      (tx) => tab.match(tx) && passGlobalFilters(tx)
    ).length;
  });
  return out;
}, [fromDate, toDate, tickerQuery, typeFilter]);
```

### Tipo `SortState`
```ts
type SortCol = 'date' | 'ticker' | 'type' | 'qty' | 'price' | 'fx' | 'fee' | 'total';
type SortDir = 'asc' | 'desc';
interface SortState { col: SortCol; dir: SortDir; }
```

### Célula Ticker para CASH / INT
```tsx
const displayTicker = (tx.type === 'cash' || tx.type === 'int')
  ? (tx.label ?? tx.ticker)
  : tx.ticker;
```

### Coluna Total — cor e sinal
```tsx
const totalColor =
  tx.total < 0 ? 'text-[var(--loss)]'
  : (tx.type === 'div' || tx.type === 'int') ? 'text-[var(--gain)]'
  : 'text-foreground';

const isSigned = tx.type === 'cash' || tx.type === 'sell' || tx.type === 'div' || tx.type === 'int';
const totalFormatted = fmt(tx.total, tx.cur, { signed: isSigned });
```

### Formatação de moeda — locale pt-PT
Para consistência com o restante da app, usar `pt-PT` (conforme `design-holdings-redesign.md`):
```ts
new Intl.NumberFormat('pt-PT', { style: 'currency', currency: cur }).format(n)
```
Ou a função auxiliar `fmt` do mock-data que usa `toLocaleString('en-GB')` conforme protótipo — a decisão final fica com o Frontend mantendo consistência com o já implementado.

### Custom CSS Property para border nos TypeBadges
Os badges CONV, DIV, INT usam cores hexadecimais hardcoded (`#38BDF8`, `#F59E0B`, `#8B5CF6`). Usar `style` inline para as bordas já que Tailwind não resolve dinâmicos com `rgba()`:
```tsx
style={{ background: 'rgba(56,189,248,0.12)', borderColor: 'rgba(56,189,248,0.4)' }}
```

### TweaksPanel — não reutilizar o da design-handoff
O `tweaks-panel.jsx` do protótipo é específico para o design-canvas. Em React/Next.js, implementar um painel manual simples com `useState(panelOpen)` — sem a infraestrutura de postMessage do protótipo.

### Acessibilidade dos TypeTabs
```tsx
<div role="tablist" aria-label="Filtrar por tipo de transacção">
  {TYPE_TABS.map((tab) => (
    <button
      key={tab.key}
      role="tab"
      aria-selected={activeTab === tab.key}
      aria-controls="tx-table"
      onClick={() => onTabChange(tab.key)}
    >
```

### z-index e overflow
- `TxCard` tem `overflow-hidden` para o `rounded-lg`
- O wrapper `overflow-x-auto` da tabela deve ser um `<div>` interno — não directamente no card — para evitar que o `overflow-hidden` do card corte o scroll horizontal
- `TweaksPanel` tem `z-50` para flutuar sobre a tabela e quaisquer dropdowns

### Ordenação — padrão existente
Seguir exactamente o padrão de `HoldingsPage.tsx`:
```ts
function handleSort(col: SortCol) {
  setSort((prev) => ({
    col,
    dir: prev.col === col ? (prev.dir === 'asc' ? 'desc' : 'asc') : 'desc',
  }));
}
```
