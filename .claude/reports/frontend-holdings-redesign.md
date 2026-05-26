# Relatório Frontend — Holdings Page Redesign

**Especificação Visual:** `.claude/reports/design-holdings-redesign.md`
**Working Item:** `.claude/working-items/holdings-redesign.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero erros

## Ficheiros Criados

- `src/app/(dashboard)/holdings/page.tsx` — Server Component stub que monta `<HoldingsPage />`
- `src/components/holdings/mock-data.ts` — Tipos, dados mock (8 tickers), tabela FX, funções `convertAmount`, `formatMoney`, `formatMoneyNative`, `formatPct`
- `src/components/holdings/HoldingsPage.tsx` — Client Component raiz: estado global (`currency`, `showSold`, `sort`), cálculos de KPIs e enriquecimento de holdings, orquestração de sub-componentes
- `src/components/holdings/PageHead.tsx` — Título "Holdings" + meta row com neon-dot LIVE + contagem active/closed
- `src/components/holdings/KpiStrip.tsx` — Grid responsivo de 7 KPIs (`grid-cols-2 sm:grid-cols-4 xl:grid-cols-7`) numa superfície card unificada com bordas internas condicionais
- `src/components/holdings/HoldingsCard.tsx` — Card com header (Refresh, ShowSoldToggle, CurrencySelector) + HoldingsTable; botão Refresh anima ícone por 400ms via state
- `src/components/holdings/HoldingsTable.tsx` — Tabela de 8 colunas ordenável; header com `aria-sort`; `<caption className="sr-only">`; botões de sort dentro dos `<th>`
- `src/components/holdings/AllocPill.tsx` — Logo 32×32 colorido por asset class + pill com fill animada (`transition-[width] duration-[600ms]`) a `opacity-[0.18]`; CSS custom property `--bar-color: var(--chart-X)`
- `src/components/holdings/GainLossCell.tsx` — Valor monetário com sinal + badge de percentagem; cores semânticas `--gain` / `--loss`
- `src/components/holdings/ShowSoldToggle.tsx` — Toggle manual (`role="switch"`) idêntico ao padrão `AnimationsToggle.tsx`
- `src/components/holdings/CurrencySelector.tsx` — Segmented control EUR / USD / Native com bordas partilhadas

## Ficheiros Modificados

- `src/components/layout/sidebar.tsx` — Item "Holdings" passou de `href="#" active:false` para `href="/holdings" active:true`; agora renderiza como `<Link>` real com indicador visual activo teal quando em `/holdings`

## Componentes Implementados

- **HoldingsPage:** Estado completo da página (currency, showSold, sort). Calcula KPIs e `EnrichedHolding[]` com `useMemo`. Ordena activos e fechados separadamente (closed sempre no fundo). TODO: Engineer ligar ao API real para substituir `HOLDINGS` mock e FX sintético.

- **PageHead:** Renderiza título + neon-dot LIVE + contagens. Props `activeCount` e `soldCount` passadas pelo HoldingsPage. Aplica `rise d1` com `useAnimations()`.

- **KpiStrip:** Recebe `KpiStripItem[]`. Bordas internas verticais via classe `border-r border-border/50` (omitida no último item); bordas horizontais de separação de linhas condicionais por breakpoint com `sm:border-t-0` e `xl:border-t-0`. Aplica `rise d2`.

- **HoldingsCard:** Aplica `rise d3`. Botão Refresh usa `useState(spinning)` para animar o ícone SVG durante 450ms — TODO: Engineer substituir `setTimeout` por chamada ao API de refresh. Filtra `rows` por `showSold` antes de passar para a tabela.

- **HoldingsTable:** Ordenação multi-coluna: clicar na coluna activa inverte direcção; nova coluna inicia em `desc`. Moeda seleccionada converte via `convertAmount` (FX mock). Posições `sold: true` recebem `opacity-[0.55]`. TODO: Engineer ligar ao API de portfólio real — as props `rows`, `currency`, `sort`, `onSort` estão prontas para receber dados reais.

- **AllocPill:** `variant="fill"` (padrão). Fill anima via CSS puro (`transition-[width] duration-[600ms] cubic-bezier(.2,.7,.2,1)`). Cor do logo e da fill via `--bar-color: var(--chart-X)` injectado em `style`. Para posições `sold` mostra `—` em vez da percentagem.

- **GainLossCell:** Formata valor absoluto com sinal `+`/`−` e símbolo da moeda usando `Intl.NumberFormat('pt-PT')`. Badge de percentagem com background semântico a `opacity-[0.15]`.

- **ShowSoldToggle:** Toggle OFF/ON com thumb que translada `translate-x-[14px]`. Cores: track activo `bg-primary/20 border-primary`, thumb activo `bg-primary`.

- **CurrencySelector:** 3 botões EUR/USD/Native sem gap. Botão activo: `text-primary bg-primary/10 font-medium`.

## Notas para o SM e Engineer

### Props com TODO para ligar ao API

1. **`HoldingsPage.tsx`** — linha `const allEnriched` usa `HOLDINGS` (mock). O Engineer deve substituir por dados vindos de `GET /api/portfolio/holdings` ou similar, mantendo a interface `HoldingItem[]`.

2. **`HoldingsCard.tsx`** — `handleRefresh()` tem `TODO: Engineer — ligar ao API de refresh de preços`. Deve chamar `POST /api/portfolio/refresh` e invalidar o cache de dados.

3. **`mock-data.ts`** — `FX` é estático. O Engineer deve ligar a uma API de câmbio (ou Supabase) para obter taxas reais, substituindo a função `convertAmount`.

### API routes necessárias

- `GET /api/portfolio/holdings` — retorna posições activas e fechadas com preços actuais
- `POST /api/portfolio/refresh` — acciona actualização de preços via yahoo-finance2
- `GET /api/fx/rates` (opcional) — taxas de câmbio EUR/USD em tempo real

### Estado a gerir pelo Engineer

- Cache/revalidation dos dados de holdings (SWR ou React Query recomendado)
- Estado de loading (skeletons já definidos no DESIGN.md — a adicionar na fase 2 quando dados reais)
- Tratamento de erros de API (toast ou inline error state)

### Cálculo de Portfolio%

Implementado como `(marketValueEUR / totalActiveHoldingsEUR) * 100`. Posições fechadas (`sold: true`) têm `pct = 0` e exibem `—` na tabela. Este cálculo deve manter-se no frontend após receber dados reais do API.
