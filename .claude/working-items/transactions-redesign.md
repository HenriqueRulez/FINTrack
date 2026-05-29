# Working Item — Transactions Page Redesign

**ID:** transactions-redesign
**Data:** 2026-05-27
**Estado:** Pronto para Design
**Prioridade:** Alta

---

## Contexto

A página Transactions não existe no FINTrack actual. Este working item cobre a criação da nova página `/transactions`, fiel ao protótipo em `.claude/design-handoff/project/Transactions.html`, com filtros por data e ticker, tabs por tipo de transacção (All / Buy-Sell / Cash Movement / Conversion / Dividend / Interest), tabela ordenável com badges coloridos por tipo, modo de edição com selecção múltipla e eliminação em lote. Primeira fase: visual com dados mock hardcoded, sem integração de backend real.

---

## Objectivo

Criar a página `/transactions` com a identidade visual do FINTrack (dark mode, IBM Plex Mono, teal neon), apresentando o histórico completo de transacções filtrado e paginado, com tabs de tipo, badges semânticos por operação, modo de edição e controlo de densidade de tabela.

---

## Clarificações Resolvidas

| # | Tema | Decisão |
|---|------|---------|
| D1 | Dados | Primeira fase usa dados mock hardcoded — sem chamadas a API |
| D2 | Total da coluna | Coluna "Total" mostra o valor com sinal: negativo para SELL/Cash Withdrawal, positivo para DIV/INT |
| D3 | Moeda do total | Total exibido na moeda original da transacção (`cur` do mock) — sem conversão FX real |
| D4 | Tab activa por defeito | "Buy / Sell" (`bs`) activa ao carregar a página |
| D5 | Paginação | Controlo "Show: 10/20/50/100" no rodapé; por defeito 20 linhas |
| D6 | Densidade | Três modos: compact / comfortable / spacious — comfortable por defeito |
| D7 | Colunas opcionais | "Exchange Rate" e "Fee" visíveis por defeito; togláveis no painel de tweaks |
| D8 | Modo de edição | Activado pelo botão "Edit" — adiciona coluna de checkboxes e botão "Delete (n)" |
| D9 | Import | Botão "Import" presente no page head — stub visual, sem funcionalidade nesta fase |
| D10 | Sidebar | Link "Transactions" activo (`/transactions`); restantes sem rota ficam com `href="#"` |
| D11 | Running total | Coluna "Running Total" fora de scope nesta fase (tweakable mas não implementada) |

---

## Scope

### In-scope
- Nova página `/transactions` com layout sidebar + topbar + main
- Filter row com: date range (From / To), text filter por ticker, select de tipo
- Tabs de tipo com contador: All / Buy-Sell / Cash Movement / Conversion / Dividend / Interest
- Tabela ordenável por todas as colunas: Date, Ticker, Type, Quantity, Price, Exchange Rate (opcional), Fee (opcional), Total
- Badges coloridos por tipo: BUY (verde), SELL (vermelho), CASH (cinza), CONV (azul céu), DIV (âmbar), INT (violeta)
- Coluna Total com cor semântica: negativo → `--loss`, DIV/INT → `--gain`, restantes → neutro
- Modo de edição: toggle do botão "Edit", checkboxes por linha, "Select All (n)", "Delete (n)" com danger styling
- Rodapé com contador de transacções, indicador de seleccionados e selector de page size
- Painel de tweaks (TweaksPanel): densidade + toggle Exchange Rate + toggle Fee
- Animações de entrada `rise` com delays escalonados
- Estado vazio quando nenhuma transacção passa nos filtros
- Link "Transactions" na sidebar passa de placeholder para rota activa `/transactions`

### Out-of-scope
- Integração com API real de transacções do utilizador
- Paginação real com páginas numeradas (apenas "show N" nesta fase)
- Funcionalidade real de Import (CSV/Excel)
- Funcionalidade real de Delete (apenas alerta demo)
- Funcionalidade real de Add Manually (modal de criação — fase 2)
- Coluna Running Total (pode ser adicionada em v2)
- FX conversion real entre moedas

---

## Componentes Visuais Identificados

| Componente | Descrição |
|------------|-----------|
| `FilterRow` | Barra de filtros com chips de input (date from, date to, ticker search, type select) e acções à direita (Edit, Select All, Delete) |
| `TypeTabs` | Grid de 6 tabs com label + contador de transacções; tab activa com underline teal neon |
| `TypeBadge` | Badge inline para tipo de transacção — 6 variantes com cor semântica |
| `TxTable` | Tabela com headers ordenáveis, coluna de checkbox opcional (edit mode), densidade configurável |
| `TxFooter` | Rodapé com contagem total, indicador de seleccionados e selector de page size |
| `EmptyState` | Estado vazio centralizado quando filtros não retornam resultados |
| `CheckBox` | Checkbox custom com estados: off / on (teal) / mixed (teal) |
| `TweaksPanel` | Painel lateral com toggles: densidade, show FX, show fees |

---

## Dados Mock Obrigatórios

Utilizar exactamente estas 13 transacções do protótipo:

```typescript
const TRANSACTIONS = [
  // Buy / Sell
  { id: 't1',  date: '2026-04-02', ticker: 'VWCE',    type: 'buy',  qty: 15,    price: 12.00,   cur: 'EUR', fx: 1.0000, fee: 0.00,  total: 180.00 },
  { id: 't2',  date: '2026-02-05', ticker: 'AMAT',    type: 'buy',  qty: 12,    price: 556.00,  cur: 'GBP', fx: 1.0000, fee: 0.00,  total: 6672.00 },
  { id: 't3',  date: '2025-12-10', ticker: 'PPLT',    type: 'buy',  qty: 123,   price: 1233.00, cur: 'USD', fx: 1.1628, fee: 0.00,  total: 151659.00 },
  { id: 't4',  date: '2026-04-22', ticker: 'CSPX',    type: 'buy',  qty: 14,    price: 480.20,  cur: 'EUR', fx: 1.0000, fee: 1.20,  total: 6723.80 },
  { id: 't5',  date: '2026-03-18', ticker: 'MSFT',    type: 'buy',  qty: 5,     price: 320.00,  cur: 'USD', fx: 1.0871, fee: 0.50,  total: 1740.86 },
  { id: 't6',  date: '2026-03-30', ticker: 'TSLA',    type: 'sell', qty: 4,     price: 245.00,  cur: 'USD', fx: 1.0871, fee: 0.50,  total: 1065.86 },
  { id: 't7',  date: '2026-03-12', ticker: 'GLD',     type: 'sell', qty: 6,     price: 198.20,  cur: 'USD', fx: 1.0871, fee: 0.50,  total: 1293.41 },
  // Cash Movement
  { id: 't8',  date: '2026-01-15', ticker: '—',       type: 'cash', qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00,  total: 5000.00,  label: 'Deposit · IBKR' },
  { id: 't9',  date: '2026-02-28', ticker: '—',       type: 'cash', qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00,  total: -1200.00, label: 'Withdrawal' },
  // Conversion
  { id: 't10', date: '2026-02-04', ticker: 'EUR→USD', type: 'conv', qty: 1000,  price: 1.087,   cur: 'USD', fx: 1.0871, fee: 1.50,  total: 1087.00,  label: 'EUR → USD' },
  // Dividend
  { id: 't11', date: '2026-03-01', ticker: 'CSPX',   type: 'div',  qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00,  total: 24.40 },
  { id: 't12', date: '2026-04-01', ticker: 'VWCE',   type: 'div',  qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00,  total: 12.80 },
  // Interest
  { id: 't13', date: '2026-03-31', ticker: '—',       type: 'int',  qty: null,  price: null,    cur: 'EUR', fx: 1.0000, fee: 0.00,  total: 8.16,     label: 'Cash interest' },
];
```

Contagem por tab (a partir dos dados acima):
- All: 13
- Buy / Sell: 7
- Cash Movement: 2
- Conversion: 1
- Dividend: 2
- Interest: 1

---

## Critérios de Aceite

### CA-01 — Filter Row
- [ ] Filter row renderiza com 4 chips de input: "From" (date), "To" (date), "Filter by ticker" (text), "All Types" (select)
- [ ] Filtro por data filtra a lista (from: inclui transacções >= data; to: inclui transacções <= data)
- [ ] Filtro de ticker é case-insensitive e filtra por substring
- [ ] Dropdown "All Types" filtra por tipo específico (buy, sell, cash, conv, div, int)
- [ ] Filtros combinam entre si (AND lógico)
- [ ] Botão "Edit" alinha à direita dos filtros

### CA-02 — Type Tabs
- [ ] Seis tabs visíveis: All / Buy / Sell / Cash Movement / Conversion / Dividend / Interest
- [ ] Cada tab tem um contador que reflecte o número de transacções com os filtros globais activos (mas sem considerar o filtro da própria tab)
- [ ] Tab activa tem underline teal (2px com box-shadow neon) e fundo muted
- [ ] Tab "Buy / Sell" activa por defeito ao carregar
- [ ] Clicar numa tab filtra a tabela para o tipo correspondente
- [ ] Tabs colapsam de 6 para 3 colunas em viewport < 900px

### CA-03 — Tabela e Colunas
- [ ] Colunas presentes: Date, Ticker, Type, Quantity, Price, Exchange Rate (opt.), Fee (opt.), Total
- [ ] Colunas numéricas alinhadas à direita (`text-right tabular-nums`)
- [ ] Data exibida no formato DD/MM/YYYY
- [ ] Ticker em `font-weight: 600` e `letter-spacing: wide`
- [ ] Para transacções CASH/INT sem ticker, exibir o campo `label` na coluna Ticker
- [ ] Quantity e Price mostram "—" quando null (CASH, DIV, INT)
- [ ] Linhas com hover sutil (`background: var(--muted)`)
- [ ] Linha seleccionada tem `background: var(--primary-soft)`

### CA-04 — Badges de Tipo
- [ ] BUY: fundo `var(--gain-soft)`, texto `var(--gain)`, borda `rgba(gain-rgb, 0.4)`
- [ ] SELL: fundo `var(--loss-soft)`, texto `var(--loss)`, borda `rgba(loss-rgb, 0.4)`
- [ ] CASH: fundo `var(--muted)`, texto `var(--muted-foreground)`, borda `var(--line-strong)`
- [ ] CONV: fundo `rgba(56,189,248,0.12)`, texto `var(--chart-5)`, borda `rgba(56,189,248,0.4)`
- [ ] DIV: fundo `rgba(245,158,11,0.12)`, texto `var(--chart-3)`, borda `rgba(245,158,11,0.4)`
- [ ] INT: fundo `rgba(139,92,246,0.12)`, texto `var(--chart-2)`, borda `rgba(139,92,246,0.4)`
- [ ] Todos os badges em uppercase, `font-weight: 600`, `letter-spacing: wider`

### CA-05 — Cor Semântica na Coluna Total
- [ ] Total negativo (CASH Withdrawal, total < 0) → `color: var(--loss)`
- [ ] Total de DIV e INT → `color: var(--gain)`
- [ ] Total de BUY, SELL, CONV e CASH positivo → cor neutra `var(--foreground)`
- [ ] SELL e CASH mostram o sinal explícito (−/+) no valor

### CA-06 — Ordenação
- [ ] Clicar no header de qualquer coluna ordena a tabela por essa coluna (descendente)
- [ ] Clicar novamente inverte a direcção (ascendente)
- [ ] Seta visual no header indica coluna activa: ▼ (desc) / ▲ (asc) / ↕ (inactivo)
- [ ] Coluna activa tem seta em `color: var(--primary)`
- [ ] Ordenação por defeito: Date descendente

### CA-07 — Modo de Edição
- [ ] Botão "Edit" no filter row ativa/desativa modo de edição
- [ ] Em modo de edição, o botão "Edit" fica com estilo `btn--primary` (teal)
- [ ] Em modo de edição, aparece coluna de checkboxes à esquerda de cada linha
- [ ] Checkbox no header faz select all / deselect all das linhas visíveis na página
- [ ] Checkbox no header em estado mixed (alguns seleccionados) mostra traço horizontal
- [ ] "Select All (n)" aparece no filter row em modo de edição
- [ ] "Delete (n)" aparece no filter row em modo de edição, desabilitado quando n = 0
- [ ] "Delete (n)" tem styling danger (fundo vermelho sutil, borda e texto `--loss`)
- [ ] Sair do modo de edição limpa a selecção
- [ ] (Demo) Clicar "Delete" mostra alert com número de itens — sem mutação real nesta fase

### CA-08 — Rodapé
- [ ] Rodapé mostra "Total: N transactions"
- [ ] Quando há seleccionados: "· M selected" em `color: var(--primary)`
- [ ] Selector de page size: 10 / 20 / 50 / 100 — 20 por defeito
- [ ] Mudar page size actualiza imediatamente a lista

### CA-09 — Estado Vazio
- [ ] Quando nenhuma transacção passa nos filtros activos, a tabela é substituída por empty state
- [ ] Empty state tem título "No transactions match your filters" e subtítulo de sugestão
- [ ] Empty state centrado verticalmente com padding generoso

### CA-10 — Painel de Tweaks
- [ ] Painel lateral acessível (botão de toggle no canto, conforme design system)
- [ ] Radio "Density": compact / comfortable / spacious — comfortable por defeito
- [ ] Toggle "Show exchange rate" — visível por defeito; ao ocultar, remove coluna Exchange Rate
- [ ] Toggle "Show fees" — visível por defeito; ao ocultar, remove coluna Fee
- [ ] Mudanças no painel reflectem-se imediatamente na tabela

### CA-11 — Sidebar e Navegação
- [ ] Link "Transactions" na sidebar está activo (rota `/transactions`)
- [ ] Item activo tem indicador visual teal igual aos outros itens activos do app
- [ ] Badge com contagem total de transacções visível no item da sidebar
- [ ] Restantes links sem rota ficam com `href="#"` e visual inactivo

### CA-12 — Design System
- [ ] Fonte IBM Plex Mono em todos os textos, labels e valores numéricos
- [ ] Acento Teal (`oklch(0.72 0.17 185)`) em elementos interactivos e tab activa
- [ ] Dark mode exclusivo — classe `dark` forçada no `<html>`
- [ ] Terminal grid faint no fundo da página (`body::before` com linhas 56×56px)
- [ ] Animações de entrada `rise` com delays escalonados (page-head: d1, tx-card: d2)
- [ ] Botão primário "Add Manually" com estilo `btn--primary` (teal)

### CA-13 — Responsividade
- [ ] Layout sidebar + main colapsa em mobile (< 700px): sidebar oculta
- [ ] Filter row em coluna única em viewport < 1200px
- [ ] Type tabs em grelha 3 colunas em viewport < 900px
- [ ] Tabela com scroll horizontal (`overflow-x: auto`) em viewports estreitos

---

## Notas Técnicas

- Componente principal: `src/components/transactions/TransactionsPage.tsx` (novo)
- Rota: `src/app/(dashboard)/transactions/page.tsx` (nova)
- Mock data: definir em `src/components/transactions/mock-data.ts` — facilita troca por dados reais na fase 2
- Tipos TypeScript para transacção: `TransactionType = 'buy' | 'sell' | 'cash' | 'conv' | 'div' | 'int'`
- Componente `TypeBadge`: prop `type: TransactionType` — renderiza badge com cor e label correctas
- Componente `CheckBox`: estados `'off' | 'on' | 'mixed'` — reutilizável para outras tabelas
- `FilterRow` e `TypeTabs` podem ser sub-componentes internos ou ficheiros separados em `src/components/transactions/`
- Ordenação: implementar com `useState<{ col: string; dir: 'asc' | 'desc' }>` — sem biblioteca externa
- Densidade: guardar em `useState` local; classes utilitárias `tx-table--compact`, `tx-table--comfortable`, `tx-table--spacious`
- Colunas opcionais (FX, Fee): guardar visibilidade em `useState<boolean>` — sem persistência nesta fase
- Animações: reutilizar mecanismo `rise` / `useAnimations()` já existente no Dashboard/Holdings

---

## Artefactos Esperados

| Agente | Output |
|--------|--------|
| Designer | `.claude/reports/design-transactions-redesign.md` |
| Frontend | `.claude/reports/frontend-transactions-redesign.md` |
| SM | `.claude/tasks/transactions-redesign.md` |
| Engineer | `.claude/reports/engineer-transactions-redesign.md` |
| QA | `.claude/reports/qa-transactions-redesign.md` |
| Security | `.claude/reports/security-transactions-redesign.md` |
