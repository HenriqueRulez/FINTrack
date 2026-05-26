# Relatório Frontend — Dashboard Visual Redesign

**Especificação Visual:** `.claude/reports/design-dashboard-visual-redesign.md`
**Working Item:** `.claude/working-items/dashboard-visual-redesign.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero erros

## Ficheiros Criados

- `src/hooks/useAnimations.ts` — Hook cliente que lê `localStorage` (`fintrack_animations_enabled`) e aplica/remove classe `animations-enabled` no `<body>`; retorna `{ enabled: boolean }`
- `src/components/dashboard/HeroSection.tsx` — Secção hero com número de patrimônio enorme (`clamp(56px,8vw,96px)`) com `neon-primary-text`, indicador LIVE pulsante (`neon-dot`), delta badge (gain/loss), e slot para KpiGrid na coluna direita
- `src/components/dashboard/KpiGrid.tsx` — Grid 2×2 com bordas internas, 4 KPIs fixos (Invested capital, Cash reserve, Open positions, Day P&L), estados loading (Skeleton) e dados mock; semântica gain/loss/neutral nas cores dos valores
- `src/components/dashboard/PortfolioChart.tsx` — Chart Recharts (`ComposedChart`) com `Area` (portfolio, gradiente teal) e `Line` tracejada (invested); selector de timeframe (1D 1W 1M 3M YTD 1Y ALL); 90 pontos mock; tooltip custom; ResponsiveContainer; estados loading Skeleton
- `src/components/dashboard/TopMoversSection.tsx` — Grid 5 colunas de movers com percentagem grande, sparkline SVG inline, estados vazio/loading; 5 movers mock
- `src/components/settings/AnimationsToggle.tsx` — Toggle (`role="switch"`) que grava `fintrack_animations_enabled` em `localStorage` e adiciona/remove classe `animations-enabled` do `<body>` sem reload; evita flash de hidratação com `mounted` guard
- `src/components/layout/topbar.tsx` — Topbar sem logout: data actual (dia em UPPERCASE bold + dd · MMM · yyyy) à esquerda; `neon-dot` + "Sync · 2 min ago" à direita; animação `rise d0` condicional

## Ficheiros Modificados

- `src/components/layout/sidebar.tsx` — Reescrita completa: 6 itens de navegação com ícones SVG 16×16 inline; placeholders com `opacity-40 cursor-not-allowed pointer-events-none aria-disabled="true" tabIndex={-1}`; item activo com `border-l-2 border-primary bg-sidebar-accent`; brand mark teal com glow `box-shadow`; Settings empurrado para o fundo via `flex-1` spacer; `hidden md:flex` para responsivo
- `src/app/(dashboard)/layout.tsx` — Alterado de `flex` para `grid grid-cols-[220px_1fr]`; adicionado terminal grid (`div.terminal-grid`); importa `Topbar` em vez de `Navbar`; `main` com `gap-8` e `flex flex-col`
- `src/app/(dashboard)/dashboard/page.tsx` — Substituído stub mínimo pela composição completa: `<HeroSection kpiSlot={<KpiGrid />}>` + `<PortfolioChart>` (via `dynamic` com `ssr: false`) + `<TopMoversSection>`; dados mock comentados com `TODO: Engineer`
- `src/app/(dashboard)/settings/page.tsx` — Adicionado card "Aparência" com `<AnimationsToggle>` entre o card de Perfil e o card de Sessão
- `src/app/globals.css` — Adicionadas classes `.terminal-grid` (grid `56×56px` de linhas subtis), `@keyframes rise` (fade-in + translateY), `.animations-enabled .rise` e delays `.d0`–`.d5` (0→340ms)

## Componentes Implementados

- **Sidebar:** Renderiza 6 itens conforme especificação. Placeholders (Holdings, Transactions, Performance, Tax Calculator) com `aria-disabled` e sem eventos. Item activo detectado via `usePathname()`. Brand mark com glow teal. Settings no fundo da coluna. Sem drawer mobile (out-of-scope; `hidden md:flex`).
- **Topbar:** Data dinâmica via `new Date()` no cliente. Status de sync estático ("2 min ago") — **TODO: Engineer ligar ao estado real de sincronização da API**.
- **HeroSection:** Props `totalValue`, `deltaPercent`, `deltaAbsolute`, `isLoading`, `kpiSlot`. Estados loading (Skeleton). **TODO: Engineer ligar ao endpoint `/api/portfolio/summary`**.
- **KpiGrid:** Props `items?: KpiItem[]`, `isLoading`. Dados mock activos enquanto integração não existe. **TODO: Engineer ligar ao mesmo endpoint `/api/portfolio/summary`**.
- **PortfolioChart:** Recharts `ComposedChart` com gradiente SVG via `<defs>` JSX. Props `data?: ChartPoint[]`, `isLoading`. Dados mock de 90 pontos gerados localmente. Selector de timeframe filtra dados localmente. **TODO: Engineer criar endpoint `/api/portfolio/chart` e passar dados como props**.
- **TopMoversSection:** Props `movers?: MoverItem[]`, `isLoading`. 5 movers mock. **TODO: Engineer criar endpoint `/api/portfolio/movers` com dados reais**.
- **AnimationsToggle:** Totalmente funcional. Lê e escreve `localStorage`. Aplica/remove `animations-enabled` no `<body>` em tempo real sem reload. Sem dependências adicionais.
- **useAnimations:** Hook leve. Inicializa `animations-enabled` no `<body>` ao montar. Pode ser usado por qualquer componente para condicionar classes de animação.

## Notas para o SM e Engineer

### Props como TODO — ligar ao API

| Componente | Prop(s) | API Route a criar |
|-----------|---------|-------------------|
| `HeroSection` | `totalValue`, `deltaPercent`, `deltaAbsolute` | `GET /api/portfolio/summary` |
| `KpiGrid` | `items` (KpiItem[]) | `GET /api/portfolio/summary` (incluir kpis no mesmo response) |
| `PortfolioChart` | `data` (ChartPoint[]) | `GET /api/portfolio/chart?timeframe=3M` |
| `TopMoversSection` | `movers` (MoverItem[]) | `GET /api/portfolio/movers` |
| `Topbar` | sync status texto | Estado global ou polling ao endpoint de summary |

### Estado a gerir pelo Engineer
- `isLoading` em todos os componentes de dados — usar estado de loading enquanto fetch não resolve
- `PortfolioChart` pode receber `data` como null e usar dados mock internos; após integração, passar dados reais
- O selector de timeframe no `PortfolioChart` actualmente filtra dados locais; após integração real, considerar passar o timeframe como query param ao backend

### Estrutura de dados esperada
```typescript
// GET /api/portfolio/summary
interface PortfolioSummary {
  totalValue: number;          // EUR decimal
  deltaPercent: number;        // % desde início
  deltaAbsolute: number;       // EUR absoluto
  kpis: KpiItem[];             // 4 itens: invested, cash, positions, dayPnl
}

// GET /api/portfolio/chart?tf=3M
type ChartResponse = ChartPoint[];
interface ChartPoint { date: string; portfolio: number; invested: number; }

// GET /api/portfolio/movers
type MoversResponse = MoverItem[];
interface MoverItem { ticker: string; name: string; price: number; changePercent: number; sparkline?: number[]; }
```

### navbar.tsx
O ficheiro `src/components/layout/navbar.tsx` foi deixado intacto (não apagado) para evitar quebrar possíveis imports não detectados. O layout já usa `Topbar` — o `Navbar` pode ser removido pelo Engineer após confirmação de que não há outras referências.
