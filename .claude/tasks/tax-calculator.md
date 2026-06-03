# Plano de Implementação — Tax Calculator

**Working Item:** `.claude/working-items/tax-calculator.md`
**Especificação Visual:** `.claude/reports/design-tax-calculator.md`
**Relatório Frontend:** `.claude/reports/frontend-tax-calculator.md`

## Estado actual (verificado factualmente)

Fase 1 = redesign visual com dados mock; sem API, sem backend real, sem persistência. O Frontend já implementou e o SM verificou:

- Rota `src/app/(dashboard)/tax-calculator/page.tsx` é um Server Component stub que monta `<TaxCalculatorPage />` e exporta `metadata.title` (lido — correcto).
- Os 8 ficheiros de `src/components/tax-calculator/` existem (Glob confirmado): `mock-data.ts`, `TaxCalculatorPage.tsx`, `TaxPageHead.tsx`, `TaxKpiStrip.tsx`, `CapitalGainsPanel.tsx`, `DividendTaxPanel.tsx`, `TaxEmptyState.tsx`, `TaxTweaksPanel.tsx`.
- `mock-data.ts` (lido): `SAMPLE_EVENTS_2026`, `EMPTY_EVENTS`, `TAX_SETTINGS` e a matemática pura (`rateForHoldYears`, `fmtEUR` em `en-GB` com `−` U+2212, `fmtDate`, `deriveCapitalGains`, `deriveDividendTax`) correspondem aos valores do working item.
- Fronteira servidor/cliente correcta: Grep não encontrou qualquer import de `@/lib/anthropic`, `@/lib/yahoo-finance` ou `@/lib/supabase/server` em `src/components/tax-calculator/`. 6 componentes têm `"use client"`; `TaxEmptyState.tsx` é puro (sem hooks) e o `page.tsx` é o único Server Component — correcto.
- Estado partilhado `cgView` vive na raiz `TaxCalculatorPage` e é passado ao painel e ao TweaksPanel (lido — fonte única, CA-08).
- Sidebar actualizada para `/tax-calculator` activo (relatório Frontend).
- Frontend reporta `npm run typecheck` e `npm run lint` com zero erros.

**Único gap factual identificado:** a rota `/tax-calculator` NÃO está no array `PROTECTED` do middleware. Lido em `src/lib/supabase/middleware.ts:4`:
```ts
const PROTECTED = ["/dashboard", "/portfolio", "/settings", "/holdings", "/performance", "/transactions"];
```
`"/tax-calculator"` está ausente. Como `isProtected` usa `pathname.startsWith(r)` (linha 33), um utilizador não autenticado que aceda directamente a `/tax-calculator` NÃO é redireccionado para `/passphrase` — a página carrega sem autenticação. É exactamente o mesmo gap que o redesign de Transactions corrigiu (`.claude/tasks/transactions-redesign.md`).

## Tarefas (para o Engineer)

### T1 — Proteger a rota `/tax-calculator` no middleware
**O quê:** Adicionar `"/tax-calculator"` ao array `PROTECTED` em `src/lib/supabase/middleware.ts` (linha 4), de modo que um acesso sem sessão activa seja redireccionado para `/passphrase` (o array é avaliado com `pathname.startsWith`). Não alterar mais nada no ficheiro. Esta é a única alteração de lógica/servidor necessária nesta fase — todo o resto da feature é mock client-side já implementado pelo Frontend.
**Depende de:** Nenhuma
**Cobre:** CA-09 (acesso à rota protegido, consistente com as restantes páginas do dashboard)

### T2 — Verificação final (typecheck + lint + smoke test da rota)
**O quê:** Após T1, correr `npm run typecheck` (zero erros exigido) e `npm run lint` (zero warnings exigido) para garantir que a alteração não introduziu regressão. Arrancar `npm run dev` e confirmar, em modo autenticado, que `/tax-calculator` carrega: 3 KPIs, painéis Capital Gains + Dividend Tax, TweaksPanel; com "Show sample data" OFF (default) os KPIs mostram €0.00 e ambos os painéis em estado vazio; com ON e ano 2026 os KPIs mostram €219.16 / €207.57 / €11.59 (tolerância ao cêntimo). Confirmar também que sem sessão activa `/tax-calculator` redirecciona para `/passphrase`. Nenhum ficheiro a criar — apenas verificação e observação de prova.
**Depende de:** T1
**Cobre:** verificação transversal de CA-01..CA-11 (validação de que nada regrediu); CA-09 (redirect sem sessão)

## Ordem de Execução
T1 → T2

## Cobertura de Critérios de Aceite

Nesta fase visual, CA-01 a CA-08, CA-10 e CA-11 são integralmente cobertos pelo trabalho do Frontend (componentes, estado, animações, responsividade, formatação `en-GB` com `−` U+2212, dados/matemática mock determinísticos). As tarefas do Engineer abaixo cobrem o gap de protecção de rota e a verificação final.

| CA | Descrição curta | Coberto por |
|----|-----------------|-------------|
| CA-01 | Page header (título, help, dropdown Tax Year, "Sum for {year}") | Frontend (`TaxPageHead.tsx`) — verificado em T2 |
| CA-02 | KPI strip de 3 cartões + neon-loss + valores mock | Frontend (`TaxKpiStrip.tsx`) — verificado em T2 |
| CA-03 | Painel Capital Gains (header + selector Aggregate/Detailed + min-h 340px) | Frontend (`CapitalGainsPanel.tsx`) — verificado em T2 |
| CA-04 | Capital Gains vista Aggregate (4 linhas dashed, cores semânticas, tier-weighted) | Frontend (`CapitalGainsPanel.tsx`) — verificado em T2 |
| CA-05 | Capital Gains vista Detailed (tabela 6 colunas, overflow-x) | Frontend (`CapitalGainsPanel.tsx`) — verificado em T2 |
| CA-06 | Painel Dividend Tax (badge {X}% rate, 3 agregados + tabela 4 colunas) | Frontend (`DividendTaxPanel.tsx`) — verificado em T2 |
| CA-07 | Estados vazios (emptyTrend / emptyCoins + texto por ano) | Frontend (`TaxEmptyState.tsx` + painéis) — verificado em T2 |
| CA-08 | TweaksPanel (toggle sample data + radio CG view sincronizado) | Frontend (`TaxTweaksPanel.tsx` + estado partilhado `cgView`) — verificado em T2 |
| CA-09 | Sidebar activo + navegação + rota protegida | Frontend (sidebar) + **T1** (middleware) — verificado em T2 |
| CA-10 | Design system + animações rise d0–d3 + tabular-nums + sinal U+2212 | Frontend (`useAnimations`, `globals.css`, `fmtEUR`) — verificado em T2 |
| CA-11 | Responsividade (KPI 3→2→1 col, panel 2→1, scroll tabelas) | Frontend (arbitrary breakpoints `max-[1100px]` / `max-[700px]`) — verificado em T2 |

## Contexto adicional para o Engineer

### O que o Frontend já fez (NÃO repetir)
| Item | Ficheiro | Estado |
|------|----------|--------|
| Mock data + matemática fiscal pura | `src/components/tax-calculator/mock-data.ts` | Concluído (verificado) |
| Client root + estado (useSampleData, cgView, year) | `src/components/tax-calculator/TaxCalculatorPage.tsx` | Concluído (verificado) |
| Page head + help + TaxYearChip | `src/components/tax-calculator/TaxPageHead.tsx` | Concluído |
| KPI strip (3 cartões fat) | `src/components/tax-calculator/TaxKpiStrip.tsx` | Concluído |
| Painel Capital Gains + SegSelector | `src/components/tax-calculator/CapitalGainsPanel.tsx` | Concluído |
| Painel Dividend Tax | `src/components/tax-calculator/DividendTaxPanel.tsx` | Concluído |
| Estado vazio parametrizável | `src/components/tax-calculator/TaxEmptyState.tsx` | Concluído |
| TweaksPanel (FAB) | `src/components/tax-calculator/TaxTweaksPanel.tsx` | Concluído |
| Rota (Server Component stub) | `src/app/(dashboard)/tax-calculator/page.tsx` | Concluído (verificado) |
| Sidebar (link activo `/tax-calculator`) | `src/components/layout/sidebar.tsx` | Concluído |

### Notas de segurança / fronteira
- Feature 100% mock nesta fase — sem chamadas a API, Supabase, Yahoo ou Anthropic. Não há API route a implementar, logo o pattern canónico de API route (auth → rate limit → Zod → DB) NÃO se aplica aqui. NÃO criar schema Zod, migration SQL nem route — não há input de utilizador nem persistência nesta fase.
- A protecção da rota é feita exclusivamente pelo middleware (T1), à semelhança das outras páginas do dashboard. O Server Component `page.tsx` não precisa de `supabase.auth.getUser()` directo.
- Não há `user_id` em jogo nesta fase (dados mock hardcoded).

### Referência rápida ao ficheiro a alterar (T1)
- **Ficheiro:** `src/lib/supabase/middleware.ts`
- **Linha:** 4 (array `PROTECTED`)
- **Verificação:** o array usa `pathname.startsWith(r)`; basta acrescentar `"/tax-calculator"`.

### Pontos de fase 2 (FORA do escopo desta fase — apenas registo dos TODO já marcados no código pelo Frontend)
- `mock-data.ts`: substituir `SAMPLE_EVENTS_2026` por vendas realizadas + dividendos reais; `TAX_SETTINGS` por `settings.tax` persistido.
- `TaxCalculatorPage.tsx`: a derivação `events` (hoje `useSampleData && year === 2026`) passa a consultar dados reais por ano fiscal.
- Modal Settings "Tax Rate" e tooltip funcional do help icon — fora do escopo (apenas `title`/`aria-label` nesta fase).
