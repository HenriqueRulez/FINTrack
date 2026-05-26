# Working Item — Holdings Page Redesign

**ID:** holdings-redesign
**Data:** 2026-05-26
**Estado:** Pronto para Design
**Prioridade:** Alta

---

## Contexto

A página Holdings não existe no FINTrack actual — apenas existe a listagem de portfólio (`/portfolio`). Este working item cobre a criação da nova página `/holdings`, fiel ao protótipo em `.claude/design-handoff/project/Holdings.html`, com KPI strip de 7 métricas e tabela ordenável com visualização de alocação por ticker. Primeira fase: visual com dados mock, sem integração de backend real.

---

## Objectivo

Criar a página `/holdings` com a identidade visual do FINTrack (dark mode, IBM Plex Mono, teal neon), apresentando métricas agregadas do portfólio e uma tabela ordenável de posições com barra de alocação visual por asset class.

---

## Clarificações Resolvidas

| # | Tema | Decisão |
|---|------|---------|
| D1 | Dados | Primeira fase usa dados mock hardcoded — sem chamadas a API |
| D2 | Cash | Campo "Cash" é placeholder estático (€ 0,00) nesta fase |
| D3 | Moeda | EUR por defeito; toggle EUR / USD / Native no header da tabela |
| D4 | Portfolio % | Calculado sobre o valor de mercado total das posições activas (exclui cash) |
| D5 | Allocation bar | Variant `fill` por defeito (barra de fundo na célula Company) |
| D6 | Posições fechadas | Toggle "Show sold" visível; linhas fechadas com `opacity: 0.55` |
| D7 | Sidebar | Itens sem página ficam com `href="#"` e visual inactivo — igual ao Dashboard |

---

## Scope

### In-scope
- Nova página `/holdings` com layout sidebar + topbar + main
- KPI strip com 7 células (grid responsivo)
- Tabela de posições ordenável por qualquer coluna
- Célula "Company" com logo colorido por classe de activo + barra de alocação (variant fill)
- Toggle "Show sold" para mostrar/ocultar posições fechadas
- Selector de moeda: EUR / USD / Native (apenas visual, sem FX real nesta fase)
- Gain/Loss com cor semântica (`--gain` verde / `--loss` vermelho) + badge percentagem
- Animações de entrada (`rise`) controláveis pelo toggle de animações existente em Settings
- Link "Holdings" na sidebar passa de placeholder para rota activa `/holdings`

### Out-of-scope
- Integração com API real de preços ou portfólio do utilizador
- FX conversion real (valores mock já são fixos)
- Selector de densidade (compact / comfortable / spacious) — pode ficar para v2
- Funcionalidade de refresh real de preços

---

## KPIs do Strip (7 células)

| # | Label | Descrição | Cor |
|---|-------|-----------|-----|
| 1 | Total Value | Investments + cash | loss se negativo |
| 2 | Holdings Value | Soma do valor de mercado das posições activas | neutro |
| 3 | Cash | Saldo não investido (placeholder €0,00) | loss se negativo |
| 4 | Total P/L | Unrealized + Realized desde início | gain/loss semântico |
| 5 | Unrealized P/L | Ganho/perda em aberto | gain/loss semântico |
| 6 | Realized P/L | Ganho/perda de posições fechadas | gain/loss semântico |
| 7 | Holdings | Nº de posições activas | neutro |

---

## Colunas da Tabela

| Coluna | Tipo | Ordenável | Notas |
|--------|------|-----------|-------|
| Company | célula complexa | sim (por ticker) | Logo colorido + alloc bar + ticker + nome |
| Portfolio% | numérico | sim | Percentagem do valor total de holdings |
| Shares | numérico | sim | Até 4 casas decimais |
| Avg Cost | monetário | sim | Moeda seleccionada |
| Cost Basis | monetário | sim | Moeda seleccionada |
| Current Price | monetário | sim | Moeda seleccionada |
| Market Value | monetário | sim | Moeda seleccionada |
| Total Gain/Loss | ganho/perda | sim | Valor + badge % |

---

## Dados Mock Obrigatórios

Utilizar exactamente estes 6 tickers activos + 2 fechados do protótipo:

```
Activos: AMAT, VWCE, CSPX, AAPL, MSFT, BTC
Fechados: TSLA, GLD
```

Cores por asset class (via variável CSS):
- Stocks → `var(--chart-1)` (teal)
- ETFs → `var(--chart-2)` (azul)
- Crypto → `var(--chart-4)` (laranja)
- Other → `var(--chart-5)` (roxo)

---

## Critérios de Aceite

### CA-01 — KPI Strip
- [ ] Strip renderiza exactamente 7 células
- [ ] Grid responsivo: 7 colunas → 4 → 2 nos breakpoints 1280px e 900px
- [ ] Valores monetários em EUR com símbolo €
- [ ] KPIs de P/L mostram sinal + ou − e cor semântica gain/loss
- [ ] KPI "Cash" mostra €0,00 (placeholder)

### CA-02 — Tabela ordenável
- [ ] Todas as 8 colunas listadas acima estão presentes
- [ ] Clicar no header ordena a coluna; clicar de novo inverte a direcção
- [ ] Seta visual no header indica coluna activa e direcção (▼ / ▲)
- [ ] Ordenação por defeito: Market Value decrescente

### CA-03 — Célula Company com allocation bar
- [ ] Logo 32×32 colorido com a cor da classe de activo (chart-1/2/4/5)
- [ ] Barra de fundo (`alloc-pill`) mostra a percentagem de alocação como fill
- [ ] Percentagem visível dentro da pill (ex: `28.4%`)
- [ ] Ticker em bold; nome completo abaixo em muted
- [ ] Posições fechadas (`sold: true`) têm `opacity: 0.55`

### CA-04 — Toggle "Show sold"
- [ ] Toggle está vísivel no header da tabela
- [ ] OFF por defeito — posições fechadas ocultadas
- [ ] ON — posições fechadas (TSLA, GLD) aparecem no fim da tabela com opacidade reduzida

### CA-05 — Selector de moeda
- [ ] Botões segmentados EUR / USD / Native no header da tabela
- [ ] EUR seleccionado por defeito
- [ ] Trocar moeda actualiza todos os valores monetários da tabela (cálculo com FX mock)
- [ ] Native mostra a moeda original do activo (USD ou EUR)

### CA-06 — Gain/Loss semântico
- [ ] Valores positivos em `var(--gain)` (verde)
- [ ] Valores negativos em `var(--loss)` (vermelho)
- [ ] Badge com percentagem (ex: `+13.84%` / `−3.68%`)
- [ ] Aplica-se tanto aos KPIs como à coluna Total Gain/Loss da tabela

### CA-07 — Sidebar e navegação
- [ ] Link "Holdings" na sidebar está activo (rota `/holdings`)
- [ ] Item activo tem indicador visual teal (igual ao Dashboard)
- [ ] Restantes links placeholder mantêm visual inactivo

### CA-08 — Design System
- [ ] Fonte IBM Plex Mono em headings, labels e valores numéricos
- [ ] Acento Teal (`oklch(0.72 0.17 185)`) em elementos interactivos
- [ ] Dark mode exclusivo — classe `dark` forçada no `<html>`
- [ ] Efeitos neon nos KPIs com valores negativos (`.neon-loss`)
- [ ] Animações de entrada `rise` com delays escalonados (respeita toggle de Settings)

### CA-09 — Responsividade
- [ ] Layout sidebar + main colapsa em mobile (< 700px): sidebar oculta
- [ ] KPI strip adapta colunas em 1280px e 900px
- [ ] Tabela tem scroll horizontal em viewports estreitos

---

## Notas Técnicas

- Componente principal: `src/components/holdings/HoldingsPage.tsx` (novo)
- Rota: `src/app/(dashboard)/holdings/page.tsx` (nova)
- Mock data: definir em `src/components/holdings/mock-data.ts` — facilita troca por dados reais na fase 2
- Allocation bar: componente `AllocPill` com prop `variant: 'fill' | 'stripe' | 'hidden'`
- Cálculo de Portfolio %: `(marketValue / totalHoldingsValue) * 100`
- FX mock: objecto estático `{ EUR: { USD: 1.09 }, USD: { EUR: 0.92 } }` — não chamar API
- Animações: reutilizar o hook `useAnimations()` / mecanismo de toggle criado no Dashboard Redesign

---

## Artefactos Esperados

| Agente | Output |
|--------|--------|
| Designer | `.claude/reports/design-holdings-redesign.md` |
| Frontend | `.claude/reports/frontend-holdings-redesign.md` |
| SM | `.claude/tasks/holdings-redesign.md` |
| Engineer | `.claude/reports/engineer-holdings-redesign.md` |
| QA | `.claude/reports/qa-holdings-redesign.md` |
| Security | `.claude/reports/security-holdings-redesign.md` |
