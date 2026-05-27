# Plano de Tarefas — performance-redesign

**Feature:** performance-redesign
**Working item:** `.claude/working-items/performance-redesign.md`
**Frontend report:** `.claude/reports/frontend-performance-redesign.md`

---

## Estado actual

O Frontend entregou uma implementação completa e funcional. O `typecheck` e o `lint` passam com zero erros/warnings. Todos os ficheiros previstos na spec foram criados:

- `src/app/(dashboard)/performance/page.tsx` — Server Component stub OK
- `src/components/performance/` — 8 ficheiros (PerformancePage, PerformancePageHead, KPIStrip, TradeAnalysisCard, TradeTable, AssetCell, Sparkline, mock-data)
- `src/components/layout/sidebar.tsx` — Performance activo em `/performance`

O Engineer tem trabalho mínimo: a feature é visual com dados mock e não requer API routes, migrações de base de dados, nem wiring de dados reais. As tarefas abaixo focam-se em verificações de integridade, correcções pontuais identificadas na revisão do código, e garantias de qualidade antes de passar ao QA.

---

## Tarefas para o Engineer

### T-01 — Verificar routing e integração no layout dashboard
**Descrição:** Confirmar que a rota `/performance` está correctamente encaixada no `DashboardLayout` (`src/app/(dashboard)/layout.tsx`) e que o Server Component `page.tsx` monta `PerformancePage` sem problemas. Verificar que a sidebar marca "Performance" como activo quando em `/performance` (lógica `isCurrent` baseada em `usePathname`).

**Ficheiros a verificar:**
- `src/app/(dashboard)/performance/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/components/layout/sidebar.tsx`

**Critérios de conclusão:**
- `npm run dev` não lança erro ao navegar para `/performance`
- Sidebar mostra "Performance" com estilo activo (`bg-sidebar-accent text-primary border-l-2 border-primary`) quando em `/performance`
- Restantes itens placeholder (`Transactions`, `Tax Calculator`) continuam com `opacity-40 cursor-not-allowed`

---

### T-02 — Verificar ausência de imports server-only em Client Components
**Descrição:** Confirmar que nenhum dos componentes `performance/` importa módulos server-only (`src/lib/supabase/server.ts`, `src/lib/anthropic/`, `src/lib/yahoo-finance/`). A feature é 100% client-side com dados mock — este risco é baixo mas deve ser confirmado explicitamente.

**Ficheiros a verificar:**
- `src/components/performance/*.tsx`
- `src/components/performance/mock-data.ts`

**Critérios de conclusão:**
- Nenhum import de `@/lib/supabase/server`, `@/lib/anthropic`, ou `@/lib/yahoo-finance` nos ficheiros de performance
- `npm run typecheck` continua com zero erros após a verificação

---

### T-03 — Confirmar variáveis CSS `--gain-soft` / `--loss-soft` (decisão de abordagem)
**Descrição:** A spec do Designer indicava adicionar `--gain-soft` e `--loss-soft` ao `globals.css`. O Frontend optou por classes Tailwind arbitrárias `bg-[oklch(0.70_0.18_145_/_12%)]` e `bg-[oklch(0.63_0.22_25_/_12%)]` directamente nos ROI badges em `TradeTable.tsx`, evitando alterações globais. O Engineer deve confirmar que esta abordagem está correcta e que as classes arbitrárias são suportadas pelo Tailwind v4 em produção (não são purgadas em build).

**Ficheiros a verificar:**
- `src/components/performance/TradeTable.tsx` (linhas com `ROIBadge`)
- `src/app/globals.css` (confirmar que `--gain-soft`/`--loss-soft` não são necessárias noutros componentes)

**Acção (se necessário):** Se as classes arbitrárias com `/` (opacity modifier) não funcionarem correctamente no build de produção com Tailwind v4, adicionar ao bloco `.dark` de `globals.css`:
```css
--gain-soft: oklch(0.70 0.18 145 / 12%);
--loss-soft: oklch(0.63 0.22 25  / 12%);
```
E substituir as classes arbitrárias por `bg-[var(--gain-soft)]` e `bg-[var(--loss-soft)]` no `ROIBadge`.

**Critérios de conclusão:**
- ROI badges mostram fundo tenuemente colorido (gain verde / loss vermelho) visualmente correcto
- `npm run typecheck` e `npm run lint` continuam com zero erros

---

### T-04 — Verificar KPI strip: bordas internas nos breakpoints responsivos
**Descrição:** O `KPIStrip.tsx` implementa bordas internas com classes condicionais explícitas por célula para os 3 breakpoints (2/3/5 colunas). A lógica é estática (não calculada dinamicamente), o que é correcto para Tailwind v4 (evita purge de classes dinâmicas). O Engineer deve confirmar visualmente (ou por inspecção de código) que as bordas entre células estão correctas em cada breakpoint:
- 2 colunas (< `md`): KPI 1 tem `border-r`; KPI 2 não tem `border-r` + tem `border-t`; KPIs 3-5 têm `border-t`
- 3 colunas (`md`): KPIs 1 e 2 têm `border-r`; KPI 3 não tem `border-r` + tem `border-t`; KPIs 4 e 5 têm `border-t`
- 5 colunas (`xl`): KPIs 1-4 têm `border-r`; KPI 5 não tem; nenhum tem `border-t`

**Ficheiros a verificar:**
- `src/components/performance/KPIStrip.tsx` (classes condicionais de cada célula)

**Critérios de conclusão:**
- Confirmação visual ou de código que as bordas internas estão logicamente correctas para os 3 breakpoints
- Sem bordas duplas ou ausentes que quebrem a estética do card unificado

---

### T-05 — Executar typecheck e lint finais e confirmar zero erros
**Descrição:** Após quaisquer alterações das tarefas anteriores, executar os comandos de qualidade obrigatórios e confirmar estado limpo.

**Comandos:**
```bash
npm run typecheck
npm run lint
```

**Critérios de conclusão:**
- `npm run typecheck` termina com zero erros TypeScript
- `npm run lint` termina com zero warnings ou erros ESLint
- Ambos os resultados estão documentados no relatório do Engineer (`engineer-performance-redesign.md`)

---

### T-06 — Documentar entrega no relatório do Engineer
**Descrição:** Criar o ficheiro de relatório `.claude/reports/engineer-performance-redesign.md` com:
- Lista de ficheiros verificados/modificados
- Resultado dos comandos `typecheck` e `lint`
- Decisões técnicas tomadas (ex: abordagem CSS para `--gain-soft`)
- Notas para o QA (o que testar, comportamentos esperados, dados mock utilizados)

**Ficheiros a criar:**
- `.claude/reports/engineer-performance-redesign.md`

**Critérios de conclusão:**
- Relatório criado com todas as secções preenchidas
- Status marcado como `CONCLUÍDO`

---

## Notas para o Engineer

### Dados mock (referência rápida)
Os 6 trades mock estão em `src/components/performance/mock-data.ts`. Os valores KPI esperados (em EUR) para validação:
| KPI | Valor esperado |
|-----|---------------|
| Win Rate | 50.0% (3 de 6 posições com totalEUR > 0) |
| Profit Split | ~7% Realized / ~93% Unrealized |
| Overall Avg Hold | 108 dias (activos: 54+110+72+198 / 4) |
| Avg Winner Hold | 108 dias (VWCE 54d + CSPX 72d + MSFT 198d / 3) |
| Avg Loser Hold | 110 dias (apenas AMAT) |

### Comportamentos de estado a confirmar
- `showClosed` OFF por defeito: tabela mostra apenas 4 linhas (VWCE, AMAT, CSPX, MSFT ordenados por Total Profit desc)
- `showClosed` ON: TSLA e GLD aparecem no fim após os activos
- `currency` EUR por defeito; USD e Native convertem com FX mock `{ EUR→USD: 1.09, USD→EUR: 0.92 }`
- `period` YTD por defeito; clicar nos botões troca estado activo visualmente (sem filtrar dados)
- Sort por Total Profit decrescente por defeito; clicar no header da coluna inverte; clicar noutro header define novo sort desc

### Sem API routes ou migrações necessárias
Esta fase é 100% visual com dados mock. Não criar API routes, não modificar a base de dados, não adicionar dependências npm.

### Arquitectura correcta confirmada
- `src/app/(dashboard)/performance/page.tsx` — Server Component (sem `"use client"`) que apenas monta `PerformancePage` — correcto
- `src/components/performance/PerformancePage.tsx` — `"use client"`, toda a lógica de estado aqui — correcto
- Nenhum import de módulos server-only em client components — a verificar em T-02
- `useAnimations()` reutilizado de `src/hooks/useAnimations.ts` — padrão correcto
