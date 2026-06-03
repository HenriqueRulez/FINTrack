# Working Item — Tax Calculator Redesign

**ID:** tax-calculator
**Data:** 2026-06-03
**Estado:** Pronto para Design
**Prioridade:** Alta

---

## Contexto

A página Tax Calculator não existe no FINTrack actual. Este working item cobre a criação da nova página `/tax-calculator`, fiel ao protótipo em `.claude/design-handoff/project/Tax Calculator.html` + `.claude/design-handoff/project/tax-app.jsx`. A página apresenta uma estimativa anual de imposto sobre o portfólio: 3 KPIs (Total Estimated Tax Liability, Capital Gains Tax, Dividend Tax) e dois painéis lado a lado (Capital Gains com vistas Aggregate/Detailed; Dividend Tax). Primeira fase: **apenas visual, com dados mock hardcoded — sem API, sem integração de backend real, sem persistência de settings real**.

---

## Objectivo

Criar a página `/tax-calculator` com a identidade visual do FINTrack (dark mode, IBM Plex Mono, teal neon), na mesma linha das páginas Holdings, Performance e Transactions já redesenhadas. Mostra a estimativa de imposto para o ano fiscal seleccionado a partir de eventos fiscais mock (vendas realizadas + dividendos), aplicando regras de imposto mock (taxa de dividendos + capital gains por método fixo ou escalonado por período de detenção).

---

## Clarificações Resolvidas

| # | Tema | Decisão (baseada no protótipo) |
|---|------|-------------------------------|
| D1 | Dados | Primeira fase usa eventos fiscais mock hardcoded — sem chamadas a API. Em produção viriam de vendas realizadas e dividendos reais. |
| D2 | Moeda | Todos os valores em EUR (`fmtEUR`). Não há selector de moeda nesta página. |
| D3 | Tax Year | Dropdown chip com 2026 / 2025 / 2024; 2026 por defeito. Trocar o ano actualiza o texto "Sum for {year}" e os estados vazios, mas os dados mock existem apenas para 2026 — anos 2025 e 2024 mostram estado vazio. |
| D4 | Show sample data | Toggle no TweaksPanel ("Show sample data"); OFF por defeito. Com OFF, ambos os painéis mostram estado vazio e os 3 KPIs mostram €0.00. Com ON, carrega `SAMPLE_EVENTS_2026`. |
| D5 | Capital Gains view | Selector segmentado Aggregate / Detailed no header do painel Capital Gains; Aggregate por defeito. |
| D6 | Regras de imposto | Vêm de `settings.tax` (mock): `dividendRate` (default 28%), `method` ('fixed' \| 'tiered'), `fixedRate` (default 28%) e `tiers` escalonados por anos de detenção. Defaults exactamente como no protótipo (ver secção "Regras de Imposto Mock"). |
| D7 | Settings | O ícone Settings na sidebar abre o modal de settings com a aba "Tax Rate" — integração com o modal real fica fora do escopo desta fase; nesta fase as regras de imposto usam os defaults mock hardcoded. |
| D8 | Sidebar | Item "Tax Calculator" activo na sidebar (rota `/tax-calculator`); restantes itens mantêm o seu comportamento actual da app. |

---

## Scope

### In-scope
- Nova página `/tax-calculator` com layout sidebar + topbar + main
- Page header com título "Tax Calculator", ícone de ajuda (help) e dropdown chip "Tax Year" (2026 / 2025 / 2024)
- KPI strip com 3 cartões "fat" (grid `1.4fr 1fr 1fr`):
  - Total Estimated Tax Liability (com `neon-loss` quando > 0)
  - Capital Gains Tax
  - Dividend Tax
- Painel "Capital Gains" com selector segmentado Aggregate / Detailed:
  - Vista Aggregate: 4 linhas (Total proceeds, Total cost basis, Net realised gain, Capital gains tax due)
  - Vista Detailed: tabela com 6 colunas (Date, Asset, Hold, Gain, Rate, Tax)
  - Estado vazio quando não há vendas tributáveis para o ano
- Painel "Dividend Tax" com badge "{X}% rate":
  - 3 linhas agregadas (Total dividends received, Dividend tax due, Net dividend income) + tabela de 4 colunas (Date, Asset, Amount, Tax)
  - Estado vazio quando não há dividendos para o ano
- Toggle "Show sample data" e radio "Capital Gains view" no TweaksPanel
- Cores semânticas gain/loss/neutral nos valores monetários
- Animações de entrada `rise` com delays escalonados (d0..d3)
- Link "Tax Calculator" na sidebar passa a rota activa `/tax-calculator`

### Out-of-scope
- Integração com API real de vendas, dividendos ou transacções do utilizador
- Cálculo real de imposto a partir de dados reais do portfólio
- Persistência/edição real das regras de imposto (o modal Settings "Tax Rate" e a sua escrita ficam fora desta fase)
- Selector de moeda / FX (tudo em EUR)
- Dados mock para 2025 e 2024 (esses anos mostram estado vazio)
- Export de relatório fiscal / PDF
- Tooltip funcional do ícone de ajuda além do atributo `title`

---

## Regras de Imposto Mock (de `settings.tax`)

Usar exactamente estes defaults do protótipo (`settings-modal.jsx` → `DEFAULTS.tax`):

```
dividendRate: 28          // %
method: 'tiered'          // 'fixed' | 'tiered'
fixedRate: 28             // % (usado só quando method === 'fixed')
tiers: [
  { from: 0, to: 2,    rate: 28.0 },
  { from: 2, to: 5,    rate: 25.2 },
  { from: 5, to: 8,    rate: 22.4 },
  { from: 8, to: null, rate: 19.6 },   // open-ended (≥ 8 anos)
]
```

Regra de taxa por venda (`rateForHoldYears`):
- Se `method === 'fixed'` → `fixedRate`
- Se `method === 'tiered'` → escolher o tier onde `years >= from` e (`to == null` ou `years < to`)
- Imposto de capital gains por venda = `max(0, gain) * (rate / 100)` — perdas não geram imposto (rate = 0 quando gain ≤ 0)

Imposto de dividendos por evento = `amount * (dividendRate / 100)`.

---

## Dados Mock Obrigatórios (`SAMPLE_EVENTS_2026`)

Usar exactamente estes eventos do protótipo (apenas ano 2026):

```
sales:
  { date: '2026-03-12', ticker: 'TSLA', proceeds: 1065.86, cost: 980.00,  holdYears: 1.2 }
  { date: '2026-02-08', ticker: 'GLD',  proceeds: 1293.41, cost: 1170.00, holdYears: 3.4 }
  { date: '2026-04-01', ticker: 'MSFT', proceeds: 2280.50, cost: 1600.00, holdYears: 5.6 }
  { date: '2026-04-20', ticker: 'AAPL', proceeds: 920.00,  cost: 1440.00, holdYears: 0.8 }

dividends:
  { date: '2026-03-01', ticker: 'CSPX', amount: 24.40 }
  { date: '2026-04-01', ticker: 'VWCE', amount: 12.80 }
  { date: '2026-05-15', ticker: 'MSFT', amount: 4.20 }
```

---

## Valores Derivados dos Dados Mock (com Show sample data = ON, ano 2026, defaults tiered)

Cálculo por venda (`gain = proceeds − cost`; rate por `holdYears`; `tax = max(0,gain) × rate/100`):

| Date | Ticker | Hold | Gain | Rate | Tax |
|------|--------|------|------|------|-----|
| 12/03/2026 | TSLA | 1.2y | +€85.86 | 28.0% | €24.04 |
| 08/02/2026 | GLD | 3.4y | +€123.41 | 25.2% | €31.10 |
| 01/04/2026 | MSFT | 5.6y | +€680.50 | 22.4% | €152.43 |
| 20/04/2026 | AAPL | 0.8y | −€520.00 | 0.0% | €0.00 |

Capital Gains agregado:
- Total proceeds = 1065.86 + 1293.41 + 2280.50 + 920.00 = **€5,559.77**
- Total cost basis = 980.00 + 1170.00 + 1600.00 + 1440.00 = **€5,190.00**
- Net realised gain = **+€369.77**
- Capital gains tax due = 24.04 + 31.10 + 152.43 + 0.00 = **€207.57**

Dividend Tax (rate 28%):
- Total dividends received = 24.40 + 12.80 + 4.20 = **+€41.40**
- Dividend tax due = 41.40 × 0.28 = **€11.59**
- Net dividend income = 41.40 − 11.59 = **€29.81**

KPI strip:
- Capital Gains Tax = **€207.57** (de 4 sale events)
- Dividend Tax = **€11.59** (de 3 dividend events)
- Total Estimated Tax Liability = 207.57 + 11.59 = **€219.16** (com `neon-loss`)

> Nota: os valores monetários acima são para validação dos cálculos. Pequenas diferenças de arredondamento ao cêntimo (ex.: €207.56/€207.57) são aceitáveis desde que resultem da mesma fórmula e arredondamento a 2 casas.

Com Show sample data = OFF (ou ano = 2025/2024): os 3 KPIs mostram **€0.00**, ambos os painéis mostram estado vazio.

---

## Formatação (do protótipo)

- `fmtEUR`: separador de milhares en-GB, 2 casas decimais, prefixo `€`. Sinal negativo usa o caractere `−` (U+2212), não `-`. Quando `signed` e valor > 0 mostra `+`. Valor nulo/NaN → `€0.00`.
- `fmtDate`: `YYYY-MM-DD` → `DD/MM/YYYY`.

---

## Critérios de Aceite

### CA-01 — Page Header
- [ ] Título "Tax Calculator" em `font-size: var(--t-h1)`, peso 500
- [ ] Ícone de ajuda (help) à esquerda do selector, com `title="How is this calculated?"`, muda para cor `--primary` no hover
- [ ] Label "Tax Year:" em muted seguido de dropdown chip com opções 2026 / 2025 / 2024
- [ ] 2026 seleccionado por defeito
- [ ] Trocar o ano actualiza o texto "Sum for {year}" do KPI principal e os textos dos estados vazios ("No taxable sales found for {year}" / "No dividend income found for {year}")

### CA-02 — KPI Strip (3 cartões)
- [ ] Strip renderiza exactamente 3 cartões em grid `1.4fr 1fr 1fr` (o primeiro mais largo)
- [ ] Cartão 1 "Total Estimated Tax Liability": valor = soma de capital gains tax + dividend tax; sub-texto "Sum for {year}"; aplica classe `neon-loss` ao valor quando > 0
- [ ] Cartão 2 "Capital Gains Tax": valor = total de imposto de capital gains; sub-texto "From N sale event(s)" (singular/plural correcto); ícone trendUp fica `var(--gain)` quando o imposto > 0
- [ ] Cartão 3 "Dividend Tax": valor = total de imposto de dividendos; sub-texto "From N dividend event(s)"; ícone coins fica `var(--chart-3)` quando o imposto > 0
- [ ] Com Show sample data ON e ano 2026: cartões mostram €219.16 / €207.57 / €11.59 (tolerância de arredondamento ao cêntimo)
- [ ] Com Show sample data OFF: os 3 cartões mostram €0.00, sub-textos "From 0 sale events" / "From 0 dividend events", e o valor principal sem `neon-loss`

### CA-03 — Painel Capital Gains (header + selector)
- [ ] Painel com título "Capital Gains" (`var(--t-h2)`)
- [ ] Selector segmentado Aggregate / Detailed no header do painel
- [ ] "Aggregate" seleccionado por defeito (`seg__btn--on`)
- [ ] Clicar em Detailed/Aggregate troca o estado activo e o conteúdo do painel
- [ ] `min-height` do painel ≈ 340px (igual para ambos os painéis)

### CA-04 — Capital Gains: vista Aggregate
- [ ] Mostra exactamente 4 linhas: "Total proceeds", "Total cost basis", "Net realised gain", "Capital gains tax due"
- [ ] "Total proceeds" e "Total cost basis" usam cor neutra (`var(--foreground)`)
- [ ] "Net realised gain" usa cor `--gain` quando ≥ 0 e `--loss` quando < 0, com sinal (`signed`)
- [ ] "Capital gains tax due" usa cor `--loss` e mostra o sufixo `tier-weighted` em texto pequeno muted
- [ ] Com dados mock 2026: 5,559.77 / 5,190.00 / +369.77 / 207.57 (tolerância de arredondamento)
- [ ] Linhas separadas por bordas tracejadas (`border-bottom: 1px dashed var(--line)`), última linha sem borda

### CA-05 — Capital Gains: vista Detailed
- [ ] Tabela com 6 colunas na ordem: Date, Asset, Hold, Gain, Rate, Tax
- [ ] Uma linha por venda (4 linhas com dados mock 2026)
- [ ] Coluna Date em muted, formato DD/MM/YYYY
- [ ] Coluna Asset com ticker em bold (`font-weight: 600`)
- [ ] Coluna Hold em muted, formato `X.Xy` (ex: `1.2y`)
- [ ] Coluna Gain colorida: `--gain` se ≥ 0, `--loss` se < 0, com sinal
- [ ] Coluna Rate em muted, formato `X.X%`
- [ ] Coluna Tax em cor neutra
- [ ] Cabeçalhos em `var(--t-micro)` uppercase muted; primeira coluna alinhada à esquerda, restantes à direita
- [ ] Tabela tem `overflow-x: auto` em viewports estreitos

### CA-06 — Painel Dividend Tax
- [ ] Painel com título "Dividend Tax" e badge "{X}% rate" (X = `dividendRate` arredondado a inteiro → "28% rate")
- [ ] Vista com dados: 3 linhas agregadas ("Total dividends received" em `--gain` com sinal; "Dividend tax due" em `--loss`; "Net dividend income" em cor neutra) seguidas de uma tabela
- [ ] Tabela com 4 colunas: Date, Asset, Amount, Tax — uma linha por dividendo (3 linhas com mock 2026)
- [ ] Coluna Amount em `--gain` com sinal; coluna Tax em cor neutra; Asset em bold; Date em muted DD/MM/YYYY
- [ ] Com dados mock 2026: Total +€41.40 / tax €11.59 / net €29.81 (tolerância de arredondamento)

### CA-07 — Estados Vazios
- [ ] Quando não há vendas tributáveis (Show sample data OFF, ou ano sem dados): painel Capital Gains mostra ícone `emptyTrend` + texto "No taxable sales found for {year}"
- [ ] Quando não há dividendos: painel Dividend Tax mostra ícone `emptyCoins` + texto "No dividend income found for {year}"
- [ ] Estado vazio centrado vertical e horizontalmente no corpo do painel, em cor muted

### CA-08 — TweaksPanel
- [ ] TweaksPanel com título "Tax Calculator · Tweaks"
- [ ] Toggle "Show sample data" — OFF por defeito; ligar carrega os eventos mock e desligar volta ao estado vazio, actualizando KPIs e painéis sem recarregar a página
- [ ] Radio "Capital Gains view" com opções aggregate / detailed, sincronizado com o selector segmentado do painel Capital Gains (mudar num reflecte no outro)

### CA-09 — Sidebar e Navegação
- [ ] Link "Tax Calculator" na sidebar está activo (rota `/tax-calculator`)
- [ ] Item activo tem o indicador visual teal padrão da app (`nav-item--active`)
- [ ] Restantes links da sidebar mantêm o comportamento de navegação actual da app

### CA-10 — Design System e Animações
- [ ] Fonte IBM Plex Mono em todos os elementos (headings, labels, valores numéricos)
- [ ] Acento Teal (`oklch(0.72 0.17 185)`) em elementos interactivos e no estado activo dos selectores
- [ ] Dark mode exclusivo — classe `dark` forçada no `<html>`
- [ ] Valores numéricos usam `font-variant-numeric: tabular-nums`
- [ ] Sinal negativo renderizado com `−` (U+2212), não hífen `-`
- [ ] Animações de entrada `rise` com delays escalonados: d0 (topbar date), d1 (page-head), d2 (kpi-strip), d3 (panel-grid)
- [ ] Respeita o toggle de animações de Settings se já existir na app; caso contrário, animações sempre activas nesta fase

### CA-11 — Responsividade
- [ ] Layout sidebar + main colapsa em mobile (< 700px): sidebar oculta
- [ ] KPI strip: 3 colunas → em ≤ 1100px passa a 2 colunas com o primeiro cartão a ocupar a linha toda (`grid-column: 1 / -1`); em ≤ 700px passa a 1 coluna
- [ ] Panel grid: 2 colunas → 1 coluna em ≤ 1100px
- [ ] Tabelas (detailed e dividendos) têm scroll horizontal em viewports estreitos

---

## Requisitos Não-Funcionais

- Página renderiza sem chamadas de rede (dados 100% mock nesta fase)
- Toda a lógica de imposto é determinística: os mesmos inputs produzem sempre os mesmos valores

---

## Dependências

- Reaproveitar o shell visual (sidebar, topbar, KPIs, panels, seg buttons, badges, animações `rise`) já estabelecido nos redesigns Holdings / Performance / Transactions
- `--gain` / `--loss` / `--chart-3` e classe `neon-loss` já definidos em `globals.css` (verificar; se faltar `--chart-3`, sinalizar ao Designer/Frontend)

---

## Fora do Escopo

- Backend / API real de vendas e dividendos
- Persistência e edição das regras de imposto (modal Settings "Tax Rate")
- Anos fiscais 2025 e 2024 com dados (mostram estado vazio)
- Conversão de moeda / FX
- Export de relatório fiscal

---

## Notas Técnicas

- Componente principal: `src/components/tax-calculator/TaxCalculatorPage.tsx` (novo)
- Rota: `src/app/(dashboard)/tax-calculator/page.tsx` (nova)
- Mock data: `src/components/tax-calculator/mock-data.ts` (`SAMPLE_EVENTS_2026`) — facilita troca por dados reais na fase 2
- Regras de imposto mock: derivar de um objecto `settings.tax` com os defaults da secção "Regras de Imposto Mock"; manter funções `rateForHoldYears`, `fmtEUR`, `fmtDate` fiéis ao protótipo `tax-app.jsx`
- Subcomponentes sugeridos:
  - `TaxKpiStrip.tsx` — 3 cartões fat
  - `CapitalGainsPanel.tsx` — header + selector Aggregate/Detailed + vistas + estado vazio
  - `DividendTaxPanel.tsx` — agregados + tabela + estado vazio
- Selector segmentado Aggregate/Detailed deve partilhar estado com o radio do TweaksPanel (`cgView`)

---

## Artefactos Esperados

| Agente | Output |
|--------|--------|
| Designer | `.claude/reports/design-tax-calculator.md` |
| Frontend | `.claude/reports/frontend-tax-calculator.md` |
| SM | `.claude/tasks/tax-calculator.md` |
| Engineer | `.claude/reports/engineer-tax-calculator.md` |
| QA | `.claude/reports/qa-tax-calculator.md` |
| Security | `.claude/reports/security-tax-calculator.md` |
