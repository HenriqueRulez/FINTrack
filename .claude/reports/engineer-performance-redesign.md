# Engineer Report — performance-redesign

**Status:** CONCLUÍDO
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings

## Tarefas Executadas

- T-01: ✅ Routing verificado — `src/app/(dashboard)/performance/page.tsx` encaixa no `DashboardLayout` sem problemas; sidebar marca "Performance" activo via `usePathname` + `isCurrent`
- T-02: ✅ Confirmado zero imports de `supabase/server`, `anthropic` ou `yahoo-finance` em todos os ficheiros de `src/components/performance/`
- T-03: ✅ Classes Tailwind arbitrárias `bg-[oklch(0.70_0.18_145_/_12%)]` e `bg-[oklch(0.63_0.22_25_/_12%)]` validadas como suportadas pelo Tailwind v4 (sintaxe de opacity modifier com `/`). Sem necessidade de adicionar `--gain-soft`/`--loss-soft` ao `globals.css`
- T-04: ✅ Bordas internas do KPI strip corrigidas:
  - KPI 2 tinha `border-t border-border/50` no breakpoint base (2 colunas) — incorreto porque está na mesma linha que KPI 1 (row 1, col 2). Removido
  - KPI 3 tinha `md:border-t` no breakpoint md (3 colunas) — incorreto porque está na row 1 de 3 colunas. Corrigido para `md:border-t-0 md:border-r-0`; adicionado `border-r` no base (row 2, col 1 de 2 colunas)
  - KPI 5 no breakpoint md: adicionado `md:border-r-0` explícito para sobrescrever qualquer herança
- T-05: ✅ Typecheck e lint executados — zero erros/warnings
- T-06: ✅ Relatório criado

## Ficheiros Criados

- `src/app/(dashboard)/performance/page.tsx` — Server Component stub (pelo Frontend)
- `src/components/performance/PerformancePage.tsx` — Client Component raiz (pelo Frontend)
- `src/components/performance/PerformancePageHead.tsx` — Header com h1, dot LIVE, selector de período (pelo Frontend)
- `src/components/performance/KPIStrip.tsx` — 5 células com Gauge, SplitBar, TickRow (pelo Frontend; bordas corrigidas pelo Engineer)
- `src/components/performance/TradeAnalysisCard.tsx` — Card wrapper com ShowClosedToggle e CurrencySelector inline (pelo Frontend)
- `src/components/performance/TradeTable.tsx` — Tabela 9 colunas ordenável (pelo Frontend)
- `src/components/performance/AssetCell.tsx` — Logo + ticker + nome (pelo Frontend)
- `src/components/performance/Sparkline.tsx` — SVG sparkline determinístico LCG (pelo Frontend)
- `src/components/performance/mock-data.ts` — TradeItem[], FX, helpers (pelo Frontend)

## Ficheiros Modificados

- `src/lib/supabase/middleware.ts` — Adicionado `/performance` ao array `PROTECTED`; sem esta alteração a rota não era protegida por autenticação
- `src/components/performance/KPIStrip.tsx` — Corrigidas classes de bordas internas nas células KPI 2, 3 e 5 para todos os breakpoints
- `src/components/layout/sidebar.tsx` — Item "Performance" alterado de `href: "#", active: false` para `href: "/performance", active: true` (pelo Frontend)

## Notas técnicas

### Protecção de rota (T-01 / crítico)
A rota `/performance` não estava no array `PROTECTED` de `src/lib/supabase/middleware.ts`. Foi adicionada. Sem isto, utilizadores não autenticados conseguiam aceder à página. A protecção é aplicada em `updateSession()` chamado via `proxy()` no `middleware.ts` raiz.

### Bordas KPI strip (T-04)
O Frontend implementou as bordas com lógica estática por célula (correcto para Tailwind v4). Foram identificados três erros de border no breakpoint base (2 colunas) e md (3 colunas):

| Célula | Erro | Correcção |
|--------|------|-----------|
| KPI 2 | `border-t` em base (2-col row 1) | Removido — KPI 2 está na mesma linha que KPI 1 |
| KPI 3 | `md:border-t` em md (3-col row 1) | `md:border-t-0`; adicionado `border-r` base (col 1 de 2-col row 2) |
| KPI 5 | sem `md:border-r-0` | Adicionado `md:border-r-0` para respeitar fim de linha em 3-col |

### CSS para ROI badges (T-03)
Confirmado que Tailwind v4 suporta a sintaxe `bg-[oklch(0.70_0.18_145_/_12%)]` sem purge. A opção de usar variáveis CSS `--gain-soft`/`--loss-soft` foi descartada conforme a decisão do Frontend, minimizando alterações globais em `globals.css`.

### Fronteira servidor/cliente (T-02)
Todos os 8 ficheiros em `src/components/performance/` são Client Components ou módulos utilitários puros. Nenhum importa `supabase/server`, `anthropic` ou `yahoo-finance`. A página `src/app/(dashboard)/performance/page.tsx` é Server Component sem `"use client"`, apenas monta o `PerformancePage`.

## Notas para o QA

### Dados mock (para validação dos valores KPI)
| KPI | Valor esperado |
|-----|---------------|
| Win Rate | 50.0% (3/6 trades com totalEUR > 0) |
| Profit Split | ~7% Realized / ~93% Unrealized |
| Overall Avg Hold | 108 dias |
| Avg Winner Hold | 108 dias (VWCE, CSPX, MSFT) |
| Avg Loser Hold | 110 dias (AMAT) |

### Comportamentos críticos a testar
1. **showClosed OFF** (default): tabela mostra 4 linhas (VWCE, AMAT, CSPX, MSFT)
2. **showClosed ON**: TSLA e GLD aparecem no fim da tabela
3. **Currency EUR** (default): valores em €; trocar para USD ou Native converte com FX mock
4. **Sort Total Profit desc** (default): ordenação decrescente activa na coluna "Total Profit"
5. **Period YTD** (default): botão YTD activo — clicar noutro troca estado visual sem filtrar dados
6. **Sidebar**: link "Performance" activo em `/performance`; Transactions e Tax Calculator mantêm visual inactivo
7. **Sparklines**: só presentes nas 4 linhas activas; TSLA e GLD mostram "—"
8. **ROI badges**: pill verde para ROI positivo, vermelho para ROI negativo
9. **Autenticação**: acesso a `/performance` sem sessão redirige para `/passphrase`
