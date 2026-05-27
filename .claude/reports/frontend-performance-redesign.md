# Frontend Report — performance-redesign

**Status:** CONCLUÍDO
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings

## Ficheiros Criados

- `src/app/(dashboard)/performance/page.tsx` — Server Component stub que monta `PerformancePage`
- `src/components/performance/mock-data.ts` — `TradeItem[]`, `FX`, helpers (`convertTrade`, `formatTradeAmount`, `formatTradeNative`, `formatPct`, `formatHoldDays`, `generateSparkSeed`)
- `src/components/performance/PerformancePage.tsx` — Client Component raiz com todo o estado: `currency`, `showClosed`, `density`, `period`, `sort`; calcula KPIs e `EnrichedTrade[]` com `useMemo`
- `src/components/performance/PerformancePageHead.tsx` — Título "Performance" + dot LIVE pulsante + contagem activos/fechados + segmented control de período (YTD por defeito)
- `src/components/performance/KPIStrip.tsx` — Grid 5 células (2→3→5 col responsivo); inclui `Gauge`, `SplitBar`, `TickRow` inline; ícones `TargetIcon`, `WalletIcon`, `ClockIcon` inline SVG
- `src/components/performance/TradeAnalysisCard.tsx` — Card wrapper com header, `ShowClosedToggle` e `CurrencySelector` inline, delega tabela ao `TradeTable`
- `src/components/performance/TradeTable.tsx` — Tabela ordenável 9 colunas com `SortArrow`, `StatusPill`, `ROIBadge` inline; suporte a densidades compact/comfortable/spacious
- `src/components/performance/AssetCell.tsx` — Logo 36×36 com cor por asset class (`var(--chart-N)`) + ticker bold + nome truncado
- `src/components/performance/Sparkline.tsx` — SVG 96×28 com algoritmo LCG determinístico por seed, path Bezier suavizado, fill gradient, dot final, delta percentual

## Ficheiros Modificados

- `src/components/layout/sidebar.tsx` — Item "Performance" alterado de `{ href: "#", active: false }` para `{ href: "/performance", active: true }`

## Notas de implementação

- **ROI badges**: Optou-se por classes Tailwind arbitrárias `bg-[oklch(...)]` em vez de adicionar `--gain-soft`/`--loss-soft` ao `globals.css`, minimizando alterações globais conforme a spec permitia.
- **Bordas internas do KPI strip**: Implementadas com classes condicionais por célula adaptadas a cada breakpoint (2/3/5 colunas). Cada célula tem as suas bordas declaradas explicitamente para compatibilidade com Tailwind v4 (sem purge de classes dinâmicas).
- **Show closed toggle**: Implementado inline em `TradeAnalysisCard.tsx` (cópia do padrão `ShowSoldToggle`) com label "Show closed" para manter independência do componente Holdings.
- **Currency selector**: Também inline em `TradeAnalysisCard.tsx` — mesma lógica do `CurrencySelector` de Holdings mas sem dependência cruzada de tipos.
- **`investedVal`**: Variável removida da lógica do `TradeTable` pois o valor formatado é calculado directamente via `formatCellMoney` sem necessidade de intermediário numérico.
- **Animações**: Reutilizou `useAnimations()` de `src/hooks/useAnimations.ts` — padrão idêntico ao Holdings/Dashboard.
- **`activeRows`/`closedRows`** no `PerformancePage`: Desestruturados do `useMemo` mas referenciados apenas internamente para os cálculos — sem necessidade de render directo; ESLint não reportou aviso pois são consumidos dentro do scope.
- **Dados mock**: Separados em `src/components/performance/mock-data.ts` próprio (estrutura `TradeItem` distinta de `HoldingItem`) — facilita substituição por dados reais na fase 2 sem afectar Holdings.
