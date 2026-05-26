# Especificação Visual — Dashboard Visual Redesign

**Working Item:** `.claude/working-items/dashboard-visual-redesign.md`
**DESIGN.md:** consultado ✅

---

## Resumo Visual

O redesenho transforma o dashboard de um stub funcional mínimo numa interface financeira de nível profissional: shell de navegação completa (sidebar + topbar sem logout), secção hero com patrimônio total em grande escala neon, grid de KPIs contígua, chart Recharts de evolução do portfólio e strip de Top Movers. Toda a identidade é dark-only com IBM Plex Mono, acento Teal e efeitos neon pontuais seguindo o princípio de hierarquia: no máximo 2–3 elementos a brilhar por página. A experiência de animação é controlável pelo utilizador via toggle em Settings, com estado persistido em `localStorage`.

---

## Componentes a Criar

### Sidebar (refactorizar existente)
- **Localização:** `src/components/layout/Sidebar.tsx`
- **Tipo:** Client Component (precisa de `usePathname` e lógica de placeholder)
- **Layout:** `flex flex-col` com altura total `h-screen`, sticky `top-0`. Largura fixa `w-[220px]`. Estrutura interna: Brand block → Nav items → spacer flex-1 → Settings no fundo.
- **Tokens CSS:** `bg-sidebar`, `border-r border-sidebar-border/60`, `text-sidebar-foreground`
- **Classes neon:** Brand mark usa `neon-primary` no `box-shadow` (glow do ícone "F"); item activo usa `neon-border-primary` aplicado como `border-l-2 border-primary` + fundo `bg-sidebar-accent`
- **shadcn/ui:** nenhum (navegação pura com `<Link>` Next.js)
- **Estados visuais:**
  - **Activo:** `bg-sidebar-accent text-primary font-medium border-l-2 border-primary` com `pl-[10px]`
  - **Placeholder (inactivo):** `opacity-40 cursor-not-allowed pointer-events-none` — cor `text-sidebar-foreground/40`, sem hover
  - **Hover (links activos):** `hover:bg-sidebar-accent hover:text-sidebar-foreground`
- **Comportamento:**
  - Brand mark: quadrado `28×28px` `rounded-[4px] bg-primary text-primary-foreground font-bold text-[14px]` com `box-shadow: 0 0 14px oklch(0.72 0.17 185 / 40%)`
  - Brand name: `text-sm font-medium tracking-wide` — "FINTrack" em `text-foreground`, "/ v0.1" em `text-muted-foreground`
  - Ícones SVG inline `16×16px` `stroke="currentColor" stroke-width="1.5"` (ver lista de ícones abaixo)
  - Items de nav: `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors`
  - Settings fica no fundo, antes do `flex-1` spacer não — Settings vai **após** `flex: 1` (empurrado para baixo)
  - Responsivo: em `max-width: 700px` a sidebar oculta-se (`hidden md:flex`) — sem drawer por agora (out-of-scope)

**Lista de itens de navegação e ícones SVG:**

| Label | Rota | Ícone (path SVG 16×16) | Estado |
|-------|------|------------------------|--------|
| Dashboard | `/dashboard` | `<rect x="2" y="2" width="5.5" height="5.5"/><rect x="8.5" y="2" width="5.5" height="5.5"/><rect x="2" y="8.5" width="5.5" height="5.5"/><rect x="8.5" y="8.5" width="5.5" height="5.5"/>` | Activo |
| Holdings | `#` | `<circle cx="8" cy="8" r="6"/><path d="M8 2v6l5 3"/>` | Placeholder |
| Transactions | `#` | `<path d="M3 5h10l-3-3"/><path d="M13 11H3l3 3"/>` | Placeholder |
| Performance | `#` | `<path d="M2 12l4-4 3 2 5-6"/><path d="M10 4h4v4"/>` | Placeholder |
| Tax Calculator | `#` | `<rect x="3" y="2" width="10" height="12"/><path d="M5 5h6M5 8h2M9 8h2M5 11h2M9 11h2"/>` | Placeholder |
| Settings | `/settings` | `<circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/>` | Activo |

---

### Topbar (refactorizar Navbar existente)
- **Localização:** `src/components/layout/Topbar.tsx` (renomear de `Navbar.tsx` ou criar novo e actualizar `layout.tsx`)
- **Tipo:** Client Component (data dinâmica via `new Date()`)
- **Layout:** `flex items-center justify-between h-14 px-6` com `border-b border-border/60 bg-background`
- **Tokens CSS:** `bg-background`, `border-b border-sidebar-border/60`, `text-muted-foreground`, `text-foreground`
- **Classes neon:** nenhuma — topbar é superfície neutra
- **shadcn/ui:** nenhum
- **Estados visuais:** estático (sem loading)
- **Comportamento:**
  - Lado esquerdo: data actual — formato `<b class="uppercase tracking-wider text-[10px] text-foreground">TUESDAY</b> 25 · MAY · 2026` em `text-xs text-muted-foreground tracking-wide`
  - Lado direito: status de sync — `<b class="text-foreground font-medium">Sync</b> · 2 min ago` em `text-[10px] uppercase tracking-wider text-muted-foreground`
  - **Sem botão de logout** — removido do topbar (logout vive em Settings)
  - Animação de entrada `.rise .d0` / `.rise .d1` se `animations-enabled` estiver activo

---

### DashboardPage (refactorizar página existente)
- **Localização:** `src/app/(dashboard)/dashboard/page.tsx`
- **Tipo:** Server Component (dados passados como props para sub-componentes)
- **Layout:** `flex flex-col gap-8 p-6` — padding de página 24px, gap entre secções 32px

---

### HeroSection
- **Localização:** `src/components/dashboard/HeroSection.tsx`
- **Tipo:** Client Component (recebe dados como props; animações dependem de hook do cliente)
- **Layout:** `grid grid-cols-[1.15fr_1fr] gap-12 items-end pb-8 border-b border-border/40` — em mobile/tablet (`max-width: 1100px`) colapsa para `grid-cols-1`
- **Tokens CSS:** `text-foreground`, `text-muted-foreground`, `text-[var(--gain)]`, `text-[var(--loss)]`
- **Classes neon:** `neon-primary-text` no número de patrimônio; `neon-dot` no indicador LIVE; `neon-gain` / `neon-loss` no delta badge
- **shadcn/ui:** nenhum (custom)
- **Estados visuais:**
  - **Loading:** Skeleton `h-20 w-64 animate-pulse rounded-md bg-muted` para o número; `h-4 w-32 animate-pulse` para o delta
  - **Com dados:** ver estrutura abaixo
- **Comportamento:**
  - Label LIVE: `flex items-center gap-3 mb-3` — `<span class="neon-dot"/>` + `"LIVE"` em `text-[10px] uppercase tracking-wider text-foreground` + `"·"` + `"Total net worth — EUR"` em `text-[10px] text-muted-foreground`
  - Número de patrimônio: `clamp(56px,8vw,96px)` font-size, `font-weight: 500`, `line-height: 0.95`, `tabular-nums`, `tracking-tight` — estrutura: `<span class="text-[0.42em] text-muted-foreground font-normal mr-3">€</span><span>[inteiro]</span><span class="text-muted-foreground font-normal">.[decimais]</span>`
  - Delta: `flex items-center gap-3 mt-4 text-xs` — badge pill `rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--gain)]/15 text-[var(--gain)] neon-gain` para ganho, `bg-[var(--loss)]/15 text-[var(--loss)] neon-loss` para perda + percentagem + `"since inception"` em `text-muted-foreground`

---

### KpiGrid
- **Localização:** `src/components/dashboard/KpiGrid.tsx`
- **Tipo:** Client Component (animações)
- **Layout:** Grid `2×2` com bordas internas formando grelha fechada. `grid grid-cols-2 border-l border-t border-border/40` — cada KPI: `border-r border-b border-border/40 p-4 flex flex-col gap-2 bg-card/40`; segundo de cada linha: `border-r-0`; últimas duas células: `border-b-0`
- **Tokens CSS:** `bg-card/40`, `border-border/40`, `text-muted-foreground`, `text-foreground`, `text-[var(--loss)]`, `text-[var(--gain)]`
- **Classes neon:** nenhuma (KPIs são secção de suporte; neon apenas no hero)
- **shadcn/ui:** nenhum
- **Estados visuais:**
  - **Loading:** `Skeleton h-6 w-20 animate-pulse` para cada valor
  - **Com dados:** label micro uppercase + valor 24px + sub micro
- **Comportamento:**
  - KPI label: `text-[10px] uppercase tracking-wider text-muted-foreground`
  - KPI valor: `text-2xl font-medium tabular-nums leading-none mt-1` — valores negativos em `text-[var(--loss)]`, positivos em `text-[var(--gain)]`, neutros em `text-foreground`
  - KPI sub: `text-[10px] text-muted-foreground/70 tracking-wide`
  - **4 KPIs fixos:** Invested capital / Cash reserve / Open positions / Day P&L

---

### PortfolioChart
- **Localização:** `src/components/dashboard/PortfolioChart.tsx`
- **Tipo:** Client Component (Recharts é client-only)
- **Layout:** `bg-card border border-border/40 rounded-lg p-5` — cabeçalho `flex items-end justify-between mb-4`, área do chart `h-[320px] w-full`, rodapé `flex justify-between mt-3 pt-3 border-t border-border/40`
- **Tokens CSS:** `bg-card`, `border-border/40`, `text-muted-foreground`, `text-foreground`
- **Classes neon:** nenhuma no container; linha do gráfico usa `stroke="var(--primary)"` (teal)
- **shadcn/ui:** nenhum; usa `recharts` — `AreaChart` ou `LineChart` + `Area`/`Line` + `XAxis` + `YAxis` + `CartesianGrid` + `Tooltip` + `ResponsiveContainer`
- **Estados visuais:**
  - **Loading:** Skeleton `h-[320px] w-full animate-pulse rounded-md bg-muted`
  - **Com dados:** chart renderizado
- **Comportamento:**
  - Cabeçalho esquerdo: título `"Portfolio"` + `<span class="text-muted-foreground">over time</span>` em `text-[22px] font-medium tracking-tight leading-none mb-2`; baixo: legenda `flex items-center gap-4` — item com linha `14px×2px bg-primary` (solid) + `"Portfolio value"` e linha tracejada (repeating-gradient com `text-muted-foreground`) + `"Total invested"`; + `"EUR · daily close"` em `text-[10px]`
  - Cabeçalho direito: selector de timeframe — segmented control `flex gap-1 bg-muted/50 rounded-md p-1` com botões `px-2 py-1 text-[11px] rounded-sm transition-colors` — activo: `bg-card text-foreground font-medium`; inactivo: `text-muted-foreground hover:text-foreground`; timeframes: `1D 1W 1M 3M YTD 1Y ALL`
  - `ResponsiveContainer width="100%" height={320}`
  - `CartesianGrid` stroke `var(--border)` opacidade 40%, horizontal only
  - `XAxis` tick `text-[10px] text-muted-foreground fill-current`; `YAxis` tick à direita, mesmo estilo
  - `Tooltip` custom: `bg-popover border border-border/60 rounded-md px-3 py-2 text-xs` — data em `text-[10px] uppercase tracking-wider text-muted-foreground`; valor em `text-base font-medium tabular-nums`
  - Linha portfolio: `stroke="var(--primary)" strokeWidth={2}` — `Area` com `fill="url(#portfolioGradient)"` (gradiente `from oklch(0.72 0.17 185 / 22%) to transparent`)
  - Linha invested: `stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="4 3"`
  - Rodapé: `"Updated continuously"` e `"Source — broker statements & live quotes"` em `text-[10px] uppercase tracking-wide text-muted-foreground/50`
  - Dados: mock array de 90 pontos `{ date: string, portfolio: number, invested: number }` enquanto integração real não existe

---

### TopMoversSection
- **Localização:** `src/components/dashboard/TopMoversSection.tsx`
- **Tipo:** Client Component (animações; dados como props)
- **Layout:** Secção com cabeçalho `flex items-baseline justify-between mb-4` + grid `grid grid-cols-5 bg-card border border-border/40 rounded-lg`
- **Tokens CSS:** `bg-card`, `border-border/40`, `text-foreground`, `text-muted-foreground`, `text-[var(--gain)]`, `text-[var(--loss)]`
- **Classes neon:** `neon-gain` / `neon-loss` na percentagem do mover em destaque
- **shadcn/ui:** nenhum
- **Estados visuais:**
  - **Loading:** 5 skeletons `h-[100px] animate-pulse bg-muted/40`
  - **Vazio:** texto centralizado `text-muted-foreground text-sm` — `"No positions to display"`
  - **Com dados:** grid de 5 movers
- **Comportamento:**
  - Cabeçalho: `"Top movers"` `text-[22px] font-medium tracking-tight` + `<span class="text-muted-foreground">· today</span>`; link `"See all watchlist →"` em `text-xs text-muted-foreground hover:text-primary transition-colors`
  - Cada mover: `border-r border-border/40 last:border-r-0 p-4 flex flex-col gap-2 min-w-0`
  - Mover head: `flex items-baseline justify-between` — ticker `text-sm font-semibold tracking-wide` + preço `text-[10px] text-muted-foreground tabular-nums`
  - Nome: `text-xs text-muted-foreground truncate`
  - Percentagem: `text-[22px] font-medium leading-none tracking-tight tabular-nums mt-2` + `<small class="text-[0.55em] opacity-80 ml-0.5">%</small>` — positivo: `text-[var(--gain)]`, negativo: `text-[var(--loss)]`
  - Sparkline: `h-[22px] opacity-85` — micro SVG ou mini `LineChart` Recharts sem eixos
  - Responsivo `max-width:1100px`: `grid-cols-3`, 3.º sem `border-r`, 4.º e 5.º com `border-t border-border/40`

---

### AnimationsToggle
- **Localização:** `src/components/settings/AnimationsToggle.tsx`
- **Tipo:** Client Component (`'use client'` — lê/escreve `localStorage`)
- **Layout:** Card settings existente em `/settings` — adicionar novo bloco `bg-card rounded-xl border border-border/50 p-6 max-w-lg w-full mt-4`
- **Tokens CSS:** `bg-card`, `border-border/50`, `text-foreground`, `text-muted-foreground`
- **Classes neon:** nenhuma
- **shadcn/ui:** `Switch` (ou toggle customizado com `role="switch"`) + `Label`
- **Estados visuais:**
  - **ON:** Switch checked, cor `bg-primary`
  - **OFF:** Switch unchecked, cor `bg-muted`
  - **Loading/hydration:** `defaultChecked` lido do `localStorage` no `useEffect` (evitar flash)
- **Comportamento:**
  - Label: `"Animações de entrada"` em `text-sm font-medium text-foreground`
  - Descrição: `"Efeitos fade-in e slide-up ao carregar o dashboard"` em `text-xs text-muted-foreground mt-1`
  - Toggle escreve `localStorage.setItem('fintrack_animations_enabled', 'true'/'false')`
  - Ao mudar para OFF: remove a classe `animations-enabled` do `<body>`; ao mudar para ON: adiciona
  - Sem reload de página
  - Chave localStorage: `fintrack_animations_enabled`

---

### useAnimations Hook
- **Localização:** `src/hooks/useAnimations.ts`
- **Tipo:** Hook cliente
- **Comportamento:**
  - Lê `localStorage.getItem('fintrack_animations_enabled')` — default `'true'` (animações ON por defeito)
  - Retorna `{ enabled: boolean }` e aplica classe `animations-enabled` no `document.body` quando `enabled === true`
  - Usado por componentes do dashboard para aplicar classes condicionalmente: `enabled ? 'rise d0' : ''`

---

## Componentes a Modificar

### Navbar → Topbar
- **Localização:** `src/components/layout/navbar.tsx`
- **Alteração:** Remover botão "Sair" / logout. Adicionar data actual (lado esquerdo) e status de sync (lado direito). Renomear componente para `Topbar` e ficheiro para `topbar.tsx`.
- **Impacto visual:** O topbar deixa de ter botão, passando a mostrar informação contextual (data + status), alinhado com o protótipo.

### DashboardLayout
- **Localização:** `src/app/(dashboard)/layout.tsx`
- **Alteração:** Actualizar import de `Navbar` para `Topbar`. Adicionar fundo com grid terminal subtil via pseudo-elemento (`body::before` ou classe utilitária). Layout principal: `grid grid-cols-[220px_1fr]` em vez de `flex`.
- **Impacto visual:** A grelha terminal confere profundidade ao fundo sem distrair dos dados.

### SettingsPage
- **Localização:** `src/app/(dashboard)/settings/page.tsx`
- **Alteração:** Adicionar novo bloco card com `AnimationsToggle` após o card de Sessão.
- **Impacto visual:** Utilizador vê nova opção "Animações de entrada" na página de Configurações.

### DashboardPage
- **Localização:** `src/app/(dashboard)/dashboard/page.tsx`
- **Alteração:** Substituir o conteúdo actual (2 cards simples + div) pela composição completa: `<HeroSection>` + `<PortfolioChart>` + `<TopMoversSection>`. Dados mock passados como props.
- **Impacto visual:** Dashboard passa de stub mínimo para interface completa com hero, chart e movers.

---

## Hierarquia Visual da Página

**Topo absoluto — Sidebar (esquerda, coluna 220px, altura total):**
Fundo `--sidebar` levemente mais escuro que o background. Brand mark teal com glow sutil. Itens de nav com ícones 16px. Dashboard activo (teal + neon border). Placeholders em 40% de opacidade. Settings empurrado para o fundo da coluna.

**Topbar (cabeçalho do main, 56px de altura):**
Data à esquerda (dia em maiúsculas bold, resto muted) — status de sync à direita (muted). Sem logout. Funciona como âncora contextual, não como acção.

**Hero Section (primeiro elemento do main):**
Ocupa a largura total, dividida em 1.15fr (patrimônio) + 1fr (KPIs). O número de patrimônio é o elemento de maior destaque da página inteira — fonte enorme `clamp(56px, 8vw, 96px)` com `neon-primary-text`. O `neon-dot` LIVE é o segundo destaque (pulsante). O delta badge confirma a direcção (verde/vermelho). Os KPIs à direita são informação de suporte: menor, sem glow.

**Chart Section (segundo elemento):**
Card com título e selector de timeframe. A linha de portfolio em teal é o elemento visual principal do chart. A linha de invested é muted/tracejada. Gradiente de área subtil. Nenhum glow — o chart é denso em informação e não precisa de destaque adicional.

**Top Movers Section (terceiro elemento):**
Grid de 5 colunas com bordas internas. As percentagens são os elementos de maior leitura imediata — grandes e coloridas (gain/loss). Sparklines fornecem contexto rápido de tendência. Cabeçalho simples com link "See all".

---

## Tokens e Classes Utilizados

| Elemento | Token/Classe | Motivo |
|----------|-------------|--------|
| Fundo da página | `bg-background` | Camada base `#0B0D18` |
| Fundo da sidebar | `bg-sidebar` | `#0E111C` — diferente do bg para criar separação |
| Fundo de cards | `bg-card` | `#101421` — superfície elevada |
| Bordas de cards | `border-border/40` | Bordas sutis 40% opacidade |
| Brand mark glow | `box-shadow: 0 0 14px oklch(0.72 0.17 185 / 40%)` | Glow teal no ícone de marca |
| Item sidebar activo | `bg-sidebar-accent text-primary border-l-2 border-primary` | Indicador de página activa |
| Item sidebar placeholder | `opacity-40 cursor-not-allowed pointer-events-none` | Distinção visual de funcionalidade futura |
| Número de patrimônio | `neon-primary-text` | Destaque máximo — dado mais crítico da página |
| Badge delta positivo | `text-[var(--gain)] bg-[var(--gain)]/15 neon-gain` | Semântica financeira com glow |
| Badge delta negativo | `text-[var(--loss)] bg-[var(--loss)]/15 neon-loss` | Semântica financeira com glow |
| Indicador LIVE | `neon-dot` | Sinaliza dados em tempo real |
| KPI valores negativos | `text-[var(--loss)]` | Day P&L negativo |
| Linha portfolio (chart) | `stroke="var(--primary)"` | Acento principal nos dados de série |
| Linha invested (chart) | `stroke="var(--muted-foreground)"` | Linha de suporte — hierarquia visual |
| Grid do chart | `stroke="var(--border)"` opacidade 40% | Auxiliar, não distrair |
| Tooltip do chart | `bg-popover border border-border/60` | Consistência com padrão de dropdowns |
| Percentagem dos movers | `text-[var(--gain)]` / `text-[var(--loss)]` | Leitura rápida de direcção |
| Labels micro (KPI, topbar) | `text-[10px] uppercase tracking-wider text-muted-foreground` | Hierarquia tipográfica mínima |
| Texto principal | `text-foreground` | `#E6E9F3` |
| Texto muted | `text-muted-foreground` | `#717799` — labels, metadados |
| Valores numéricos | `tabular-nums font-mono` | Alinhamento em colunas de dados |
| Divisores de secção | `neon-divider` (já existente) | Gradiente teal — transições suaves entre secções |
| Animações de entrada | classe `.rise` com delays `.d0`–`.d5` condicionada por `animations-enabled` | Fade-in + slide-up controlável |

---

## Estados e Feedback Visual

| Estado | Comportamento Visual |
|--------|---------------------|
| Carregamento (patrimônio) | Skeleton `h-20 w-56 animate-pulse rounded-md bg-muted` |
| Carregamento (KPIs) | 4× Skeleton `h-6 w-20 animate-pulse bg-muted rounded` |
| Carregamento (chart) | Skeleton `h-[320px] w-full animate-pulse rounded-md bg-muted` |
| Carregamento (movers) | 5× Skeleton `h-[100px] animate-pulse bg-muted/40` |
| Sem posições (chart) | Placeholder com dados mock — chart sempre visível em fase de protótipo |
| Sem posições (movers) | Texto centralizado `text-sm text-muted-foreground` — `"No positions to display"` |
| Erro de dados | Sem modal; texto `text-[var(--loss)] text-sm` dentro do card afectado |
| Sync actualizado | `neon-dot` pulsante no topbar + texto "Sync · X min ago" |
| Animações OFF | Classes `.rise .d*` não aplicadas; elementos aparecem sem transição |
| Animações ON | Classes `.rise .d0` a `.rise .d5` com delays 0→340ms — fade-in + translateY(6px→0) |
| Toggle animações | `Switch` em Settings actualiza `localStorage` e `document.body.classList` sem reload |
| Item sidebar placeholder | Opacidade 40%, cursor `not-allowed`, sem hover state — comunica "em breve" |
| Item sidebar activo | Border-left 2px teal + background muted + texto teal |

---

## Notas para o Frontend

### Fundo com grid terminal
O protótipo usa um `body::before` com grid de linhas finas `rgba(230,233,243,0.025)` `56px×56px`. Implementar como classe utilitária em `globals.css` (ex: `.terminal-grid`) ou directamente no `layout.tsx` com um `div` absoluto `pointer-events-none z-0`. Todo o conteúdo fica em `z-1` relativo.

### Grid de layout principal
O `DashboardLayout` deve usar `grid grid-cols-[220px_1fr] min-h-screen` em vez de `flex`. A sidebar ocupa a coluna esquerda; o main `flex flex-col` ocupa a direita. Em mobile (`<700px`): `grid-cols-1` e sidebar `hidden`.

### Animações de entrada — implementação
Definir `@keyframes rise` em `globals.css`:
```css
@keyframes rise {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.rise { animation: rise 600ms cubic-bezier(.2,.7,.2,1) both; }
.d0 { animation-delay: 0ms; }
.d1 { animation-delay: 60ms; }
.d2 { animation-delay: 120ms; }
.d3 { animation-delay: 180ms; }
.d4 { animation-delay: 260ms; }
.d5 { animation-delay: 340ms; }
```
A classe `animations-enabled` no `<body>` activa estas animações. Sem essa classe, os elementos aparecem directamente (sem transição). O hook `useAnimations()` gere a lógica de leitura do `localStorage` e aplicação da classe no `body`.

### PortfolioChart — dados mock
Enquanto a integração real não existe, o componente recebe props `data?: ChartPoint[]`. Se `data` for vazio ou ausente, usar 90 pontos mock gerados no próprio componente. O selector de timeframe filtra os dados localmente (1D=últimos 1, 1W=7, etc.). Estado do timeframe em `useState`.

### Recharts e Server Components
`PortfolioChart` deve ser `'use client'` pois Recharts não é server-safe. Pode ser importado num Server Component via `dynamic(() => import(...), { ssr: false })` se necessário.

### Responsividade
- `>1100px`: layout completo (hero em 2 colunas, movers em 5 colunas)
- `768px–1100px`: hero colapsa para 1 coluna, movers em 3 colunas
- `<700px`: sidebar escondida, layout em coluna única

### Acessibilidade
- Links placeholder com `href="#"` devem ter `aria-disabled="true"` e `tabIndex={-1}` para não serem focáveis
- Todos os ícones SVG com `aria-hidden="true"` (decorativos)
- Valores monetários: `<span aria-label="2243 euros e 65 cêntimos">€ 2,243.65</span>` onde possível
- Switch de animações: `role="switch"` com `aria-checked` correcto
- Contraste mínimo 4.5:1 para texto principal sobre background (variáveis oklch já respeitam isso)

### Ordem de z-index
```
z-0: terminal-grid (pseudo-elemento de fundo)
z-1: conteúdo da página
z-10: sidebar (em mobile se usar drawer)
z-50: tooltips, popovers
```

### Ficheiros a actualizar/criar
| Acção | Ficheiro |
|-------|---------|
| Criar | `src/components/dashboard/HeroSection.tsx` |
| Criar | `src/components/dashboard/KpiGrid.tsx` |
| Criar | `src/components/dashboard/PortfolioChart.tsx` |
| Criar | `src/components/dashboard/TopMoversSection.tsx` |
| Criar | `src/components/settings/AnimationsToggle.tsx` |
| Criar | `src/hooks/useAnimations.ts` |
| Refactorizar | `src/components/layout/Sidebar.tsx` (6 itens, placeholders) |
| Refactorizar | `src/components/layout/navbar.tsx` → `topbar.tsx` (sem logout, com data/sync) |
| Refactorizar | `src/app/(dashboard)/layout.tsx` (grid layout, import Topbar) |
| Refactorizar | `src/app/(dashboard)/dashboard/page.tsx` (composição completa) |
| Modificar | `src/app/(dashboard)/settings/page.tsx` (adicionar AnimationsToggle) |
| Modificar | `src/app/globals.css` (adicionar `@keyframes rise`, `.rise`, `.d0`–`.d5`, `.terminal-grid`) |
