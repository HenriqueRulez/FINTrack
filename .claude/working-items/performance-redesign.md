# Working Item — Performance Page Redesign

**ID:** performance-redesign
**Data:** 2026-05-27
**Estado:** Pronto para Design
**Prioridade:** Alta

---

## Contexto

A página Performance não existe no FINTrack actual. Este working item cobre a criação da nova página `/performance`, fiel ao protótipo em `.claude/design-handoff/project/Performance.html`, com KPI strip de 5 células com micro-visualizações distintas (gauge, barra split, tick rows) e uma tabela de Trade Analysis com sparklines de 30 dias por posição. Primeira fase: visual com dados mock hardcoded, sem integração de backend real.

---

## Objectivo

Criar a página `/performance` com a identidade visual do FINTrack (dark mode, IBM Plex Mono, teal neon), apresentando métricas de qualidade de trading (win rate, profit split, holding periods) e uma tabela detalhada de análise de trades por posição com sparklines e ROI badge.

---

## Clarificações Resolvidas

| # | Tema | Decisão |
|---|------|---------|
| D1 | Dados | Primeira fase usa dados mock hardcoded — sem chamadas a API |
| D2 | Período | Selector de período (1M / 3M / YTD / 1Y / ALL) apenas visual — não filtra os dados nesta fase; YTD seleccionado por defeito |
| D3 | Moeda | EUR por defeito; selector EUR / USD / Native no header da tabela Trade Analysis |
| D4 | Sparklines | Geradas sinteticamente com seed determinístico baseado no ticker — não requerem dados históricos reais |
| D5 | Show closed | Toggle "Show closed trades" visível no TweaksPanel; OFF por defeito — posições fechadas aparecem quando ligado |
| D6 | Densidade | Selector compact / comfortable / spacious no TweaksPanel — apenas afecta o padding da tabela |
| D7 | Holding period | Posições fechadas (TSLA, GLD) mostram `holdDays: 0` e `—` na coluna Holding Period |
| D8 | Sidebar | Item "Performance" activo na sidebar; restantes itens sem página ficam com `href="#"` e visual inactivo |
| D9 | ROI | Calculado como `(totalProfit / invested) * 100` em EUR, exibido como badge pill com cor semântica |

---

## Scope

### In-scope
- Nova página `/performance` com layout sidebar + topbar + main
- Page header com título, status LIVE + contagem de posições activas/fechadas, e selector de período segmentado (1M / 3M / YTD / 1Y / ALL)
- KPI strip com 5 células, cada uma com micro-visualização única:
  - Win Rate + gauge horizontal
  - Profit Split + barra split realized/unrealized
  - Overall Avg Hold + tick row (10 ticks, teal)
  - Avg Winner Hold + tick row (10 ticks, verde gain)
  - Avg Loser Hold + tick row (10 ticks, vermelho loss)
- Tabela "Trade Analysis" ordenável com 9 colunas
- Sparkline SVG de 30 dias gerada sinteticamente por ticker (activos apenas)
- ROI badge pill com cor semântica (gain/loss)
- Status pill "Active" / "Closed" com dot colorido
- Animações de entrada `rise` com delays escalonados
- Link "Performance" na sidebar passa de placeholder para rota activa `/performance`

### Out-of-scope
- Integração com API real de preços ou trades do utilizador
- FX conversion real (valores mock já são fixos)
- Filtro de período real (selector é apenas visual nesta fase)
- Gráfico de equity curve (possível adição em v2)
- Export de dados

---

## KPIs do Strip (5 células)

| # | Label | Micro-viz | Descrição | Ton |
|---|-------|-----------|-----------|-----|
| 1 | Win Rate | Gauge horizontal (fill teal) | % de posições com profit total > 0 | neutro |
| 2 | Profit Split | Barra split bicolor | % realizado (verde) vs % não-realizado (teal 55%) do profit absoluto | neutro |
| 3 | Overall Avg Hold | Tick row 10 ticks (teal) | Média de dias em carteira de todas as posições activas | neutro |
| 4 | Avg Winner Hold | Tick row 10 ticks (gain verde) | Média de dias de posições lucrativas | gain |
| 5 | Avg Loser Hold | Tick row 10 ticks (loss vermelho) | Média de dias de posições em perda | loss |

### Cálculos das micro-visualizações

- **Gauge:** `width: ${winRate}%` — fill teal sobre fundo muted, height 6px, border-radius full
- **Split bar:** `split__realized` width = `(|totalRealized| / (|totalRealized| + |totalUnrealized|)) * 100%`; `split__unrealized` width = complemento; ambos somam 100%
- **Tick row:** 10 ticks de igual largura; ticks 1..N preenchidos com a cor do tone, restantes em muted; N = número de posições no grupo (activas / winners / losers), máximo 10

---

## Colunas da Tabela Trade Analysis

| Coluna | Tipo | Ordenável | Notas |
|--------|------|-----------|-------|
| Asset | célula complexa | sim (por ticker) | Logo 36×36 colorido por asset class + ticker bold + nome completo |
| Status | pill | sim | Dot colorido — Active (verde neon) / Closed (muted) |
| Holding Period | texto | sim | Formato `Xm Yd` ou `Xd`; `—` para posições fechadas sem hold |
| Invested | monetário | sim | Moeda seleccionada |
| Realized | monetário com sinal | sim | Verde se > 0, vermelho se < 0, muted se = 0 |
| Unrealized | monetário com sinal | sim | Verde se > 0, vermelho se < 0, muted se = 0 |
| Total Profit | monetário com sinal | sim | Realized + Unrealized; cor semântica |
| Last 30 days | sparkline | não | SVG 96×28px com fill gradient + dot final; `—` para posições fechadas |
| ROI | badge pill | sim | `+X.XX%` / `−X.XX%`; `roi--gain` / `roi--loss` |

---

## Dados Mock Obrigatórios

Utilizar exactamente estes 4 activos + 2 fechados do protótipo:

```typescript
// Activos
{ ticker: 'VWCE', name: 'Vanguard FTSE All-World UCITS ETF', chart: 'chart-2', status: 'active', holdDays: 54, invested: 180.00, realized: 0.00, unrealized: 2243.65, native: 'EUR' }
{ ticker: 'AMAT', name: 'Applied Materials, Inc.', chart: 'chart-1', status: 'active', holdDays: 110, invested: 6672.00, realized: 0.00, unrealized: -2191.84, native: 'USD' }
{ ticker: 'CSPX', name: 'iShares Core S&P 500 UCITS ETF', chart: 'chart-2', status: 'active', holdDays: 72, invested: 6722.80, realized: 0.00, unrealized: 450.40, native: 'EUR' }
{ ticker: 'MSFT', name: 'Microsoft Corp.', chart: 'chart-1', status: 'active', holdDays: 198, invested: 1600.00, realized: 0.00, unrealized: 461.00, native: 'USD' }

// Fechados
{ ticker: 'TSLA', name: 'Tesla Inc.', chart: 'chart-1', status: 'closed', holdDays: 0, invested: 980.00, realized: -106.80, unrealized: 0.00, native: 'USD' }
{ ticker: 'GLD',  name: 'SPDR Gold Shares', chart: 'chart-5', status: 'closed', holdDays: 0, invested: 1170.00, realized: 19.20, unrealized: 0.00, native: 'USD' }
```

FX mock: `{ EUR: { EUR: 1, USD: 1.09 }, USD: { EUR: 0.92, USD: 1 } }`

Cores por asset class (logo background):
- Stocks (chart-1) → `var(--chart-1)` (teal)
- ETFs (chart-2) → `var(--chart-2)` (violeta)
- Other (chart-5) → `var(--chart-5)` (azul céu)

---

## Valores KPI derivados dos dados mock (em EUR)

| KPI | Valor calculado |
|-----|----------------|
| Win Rate | 3 winners (VWCE, CSPX, MSFT) de 6 total → **50.0%** |
| Total Realized | TSLA: −106.80 × 0.92 + GLD: 19.20 × 0.92 = −98.26 + 17.66 = **−€80.60** |
| Total Unrealized | 2243.65 + (−2191.84 × 0.92) + 450.40 + (461.00 × 0.92) = 2243.65 − 2016.49 + 450.40 + 424.12 = **+€1,101.68** |
| Profit Split | absRea ≈ 80.60, absUnr ≈ 1101.68 → realized ≈ **6.8%** / unrealized ≈ **93.2%** |
| Overall Avg Hold | (54 + 110 + 72 + 198) / 4 = **108.5d** → 108 days |
| Avg Winner Hold | Winners activos: VWCE (54d), CSPX (72d), MSFT (198d) → (54+72+198)/3 = **108d** |
| Avg Loser Hold | Losers activos: AMAT (110d) → **110d** |

---

## Critérios de Aceite

### CA-01 — KPI Strip
- [ ] Strip renderiza exactamente 5 células em grid responsivo
- [ ] Grid: 5 colunas → 3 → 2 nos breakpoints 1280px e 900px
- [ ] Win Rate: valor percentual correcto e gauge fill proporcional
- [ ] Profit Split: dois segmentos da barra somam 100%; legenda "Realized vs Unrealized"
- [ ] Avg Winner Hold KPI usa cor `var(--gain)` no ícone e no valor
- [ ] Avg Loser Hold KPI usa cor `var(--loss)` no ícone e no valor
- [ ] Overall Avg Hold KPI usa cor neutra (muted-foreground) no ícone
- [ ] Tick rows mostram ticks preenchidos para cada posição no grupo (max 10); ticks em excesso ficam muted

### CA-02 — Page Header
- [ ] Título "Performance" em `font-size: var(--t-h1)`, peso 500
- [ ] Status com `neon-dot` pulsante + texto "LIVE" + contagem "X active · Y closed"
- [ ] Selector de período segmentado com opções 1M / 3M / YTD / 1Y / ALL
- [ ] "YTD" seleccionado por defeito (classe `seg__btn--on`)
- [ ] Clicar nos botões de período troca o estado activo visualmente (sem filtrar dados nesta fase)

### CA-03 — Tabela Trade Analysis
- [ ] Todas as 9 colunas estão presentes na ordem correcta
- [ ] Clicar no header de coluna sortável ordena; clicar de novo inverte
- [ ] Seta visual (`↕` / `▼` / `▲`) indica coluna activa e direcção; cor teal quando activa
- [ ] Ordenação por defeito: Total Profit decrescente
- [ ] Hover na linha aplica `background: var(--muted)` com transição 140ms

### CA-04 — Célula Asset
- [ ] Logo 36×36 com background `var(--chart-N)` e inicial do ticker em texto escuro
- [ ] Ticker em bold (`font-weight: 600`, `letter-spacing: wide`)
- [ ] Nome completo abaixo em `var(--muted-foreground)` com text-overflow ellipsis
- [ ] Largura mínima da célula: 240px

### CA-05 — Status Pill
- [ ] "Active": dot verde com box-shadow neon gain (`box-shadow: 0 0 6px rgba(var(--gain-rgb), 0.6)`)
- [ ] "Closed": dot muted sem glow
- [ ] Texto "Active" em `var(--gain)`; "Closed" em `var(--muted-foreground)`

### CA-06 — Sparkline (Last 30 days)
- [ ] Sparkline presente para todas as posições activas (VWCE, AMAT, CSPX, MSFT)
- [ ] Posições fechadas (TSLA, GLD) mostram `—` em muted na coluna
- [ ] SVG 96×28px com path Bezier suavizado (curvas cúbicas)
- [ ] Fill gradient do topo (28% opacidade) ao fundo (0% opacidade) na cor ganho/perda
- [ ] Dot final (`r=2.2`) na cor ganho/perda
- [ ] Delta percentual à direita do SVG (`+X.X%` / `−X.X%`) com cor semântica
- [ ] Seed determinístico por ticker — sparkline idêntica entre renders

### CA-07 — ROI Badge
- [ ] Badge pill com `border-radius: full`, `border: 1px solid`, padding `4px 10px`
- [ ] `roi--gain`: cor verde, borda verde 40% opacidade, fundo `var(--gain-soft)`
- [ ] `roi--loss`: cor vermelha, borda vermelha 40% opacidade, fundo `var(--loss-soft)`
- [ ] Valor formatado com sinal e 2 casas decimais (ex: `+13.84%` / `−32.85%`)

### CA-08 — Selector de Moeda e Toggle Show Closed
- [ ] Selector EUR / USD / Native no header da tabela
- [ ] EUR seleccionado por defeito
- [ ] Trocar moeda actualiza Invested, Realized, Unrealized, Total Profit com FX mock
- [ ] "Native" mostra a moeda original do activo (USD ou EUR)
- [ ] Toggle "Show closed trades" oculta TSLA e GLD quando OFF (comportamento por defeito)
- [ ] Quando ON, TSLA e GLD aparecem no fim da tabela (após ordenação dos activos)

### CA-09 — Sidebar e Navegação
- [ ] Link "Performance" na sidebar está activo (rota `/performance`)
- [ ] Item activo tem fundo `--sidebar-primary` (teal) com texto escuro — igual ao padrão da app
- [ ] Restantes links placeholder mantêm visual inactivo (`href="#"`)

### CA-10 — Design System e Animações
- [ ] Fonte IBM Plex Mono em todos os elementos (headings, labels, valores numéricos)
- [ ] Acento Teal (`oklch(0.72 0.17 185)`) em elementos interactivos e gauge fill
- [ ] Dark mode exclusivo — classe `dark` forçada no `<html>`
- [ ] `neon-dot` pulsante no status LIVE do page header
- [ ] Animações de entrada `rise` com delays escalonados: d0 (topbar date), d1 (page-head), d2 (kpi-strip), d3 (ta-card)
- [ ] Respeita toggle de animações de Settings (quando disponível)

### CA-11 — Responsividade
- [ ] Layout sidebar + main colapsa em mobile (< 700px): sidebar oculta
- [ ] KPI strip: 5 colunas → 3 colunas em ≤ 1280px → 2 colunas em ≤ 900px
- [ ] Tabela tem overflow-x auto em viewports estreitos (scroll horizontal)
- [ ] Sparkline não quebra layout em viewport estreito (min-width na célula)

---

## Notas Técnicas

- Componente principal: `src/components/performance/PerformancePage.tsx` (novo)
- Rota: `src/app/(dashboard)/performance/page.tsx` (nova)
- Mock data: `src/components/performance/mock-data.ts` — facilita troca por dados reais na fase 2
- Subcomponentes sugeridos:
  - `KPIStrip.tsx` — container do strip com os 5 KPIs
  - `KPIWinRate.tsx` — célula Win Rate + gauge
  - `KPIProfitSplit.tsx` — célula Profit Split + barra split
  - `KPIHoldPeriod.tsx` — célula genérica para os 3 KPIs de holding + tick row
  - `TradeTable.tsx` — tabela ordenável com toda a lógica de sort e currency
  - `Sparkline.tsx` — SVG sparkline com geração sintética por seed
  - `AssetCell.tsx` — reutilizável de Holdings se já existir
- Gauge: `<div>` com `position: relative`; fill com `position: absolute`, `width: ${rate}%`, transição `700ms cubic-bezier(.2,.7,.2,1)`
- Split bar: dois `<div>` com `flex` — `split__realized` (verde) + `split__unrealized` (teal 55% opacidade)
- Tick row: array de 10 ticks com estado `active | gain | loss | off` mapeado por número de posições no grupo
- Sparkline algorithm: seed LCG (`s = (s * 9301 + 49297) % 233280`), 30 pontos, drift `±dir30 × 0.35`, normalizado 0..1
- FX mock: objecto estático `{ EUR: { EUR: 1, USD: 1.09 }, USD: { EUR: 0.92, USD: 1 } }` — não chamar API
- ROI: `(totalProfitEUR / investedEUR) * 100` — sempre calculado em EUR independentemente da moeda seleccionada no selector
- Animações: reutilizar hook `useAnimations()` / mecanismo de toggle do Dashboard Redesign se já existir; caso contrário, deixar animações sempre activas nesta fase
- `var(--gain-soft)` e `var(--loss-soft)` para fundo dos badges ROI — verificar se já existem em `globals.css`; se não, adicionar: `--gain-soft: rgba(var(--gain-rgb), 0.12)` e `--loss-soft: rgba(var(--loss-rgb), 0.12)`

---

## Artefactos Esperados

| Agente | Output |
|--------|--------|
| Designer | `.claude/reports/design-performance-redesign.md` |
| Frontend | `.claude/reports/frontend-performance-redesign.md` |
| SM | `.claude/tasks/performance-redesign.md` |
| Engineer | `.claude/reports/engineer-performance-redesign.md` |
| QA | `.claude/reports/qa-performance-redesign.md` |
| Security | `.claude/reports/security-performance-redesign.md` |
