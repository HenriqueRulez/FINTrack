# QA Report — Tax Calculator

**Working Item:** `.claude/working-items/tax-calculator.md`
**Relatório do Engineer:** `.claude/reports/engineer-tax-calculator.md`
**Testes Playwright criados:** `tests/e2e/tax-calculator.spec.ts`
**Status Geral:** ✅ APROVADO

> Primeiro ciclo QA desta feature (Glob `.claude/reports/qa-tax-calculator*.md` → nenhum relatório anterior). Todos os CAs verificados.

## Verificações de Qualidade

| Verificação | Status | Output (completo se ❌) |
|-------------|--------|------------------------|
| Typecheck | ✅ Zero erros | `tsc --noEmit` — exit 0, apenas o banner do npm script |
| Lint | ✅ Zero warnings | `eslint src` — exit 0, apenas o banner do npm script |
| Migration | N/A | Feature 100% mock client-side; sem schema/SQL/persistência (confirmado no relatório do Engineer e working item) |

## Verificação Visual — Chrome Extension

**Servidor dev:** ✅ Online (http://localhost:3000 → `307` redirect do middleware na raiz, esperado)
**Chrome Extension:** ✅ Disponível (tab 652095154, `window.location.href = http://localhost:3000/tax-calculator` confirmado)

| CA | Tipo | Verificação | Evidência | Status |
|----|------|-------------|-----------|--------|
| CA-01 | Visual | h1 "Tax Calculator", chip ano 2026, "Sum for 2026" | JS: `h1="Tax Calculator"`, `kpiSubs[0]="Sum for 2026"` | ✅ PASS |
| CA-02 | Visual | 3 cartões, valores sample ON/OFF, neon-loss condicional | JS sample OFF: `["€0.00","€0.00","€0.00"]`, `liabilityNeon=false`; sample ON: `["€219.16","€207.57","€11.59"]`, `liabilityNeon=true`, subs `From 4 sale events / From 3 dividend events` | ✅ PASS |
| CA-03 | Visual | Painel Capital Gains + seg selector | JS: heading presente, vista Aggregate por defeito (CG table ausente até clicar Detailed) | ✅ PASS |
| CA-04 | Visual | 4 linhas agregadas + valores | JS: `Total proceeds €5,559.77 / Total cost basis €5,190.00 / Net realised gain +€369.77 / Capital gains tax due €207.57 tier-weighted` | ✅ PASS |
| CA-05 | Visual | Tabela Detailed 6 colunas + 4 linhas | JS após clicar Detailed: headers `[Date,Asset,Hold,Gain,Rate,Tax]`, `rowCount=4`, TSLA `[12/03/2026,TSLA,1.2y,+€85.86,28.0%,€24.04]`, AAPL gain `−€520.00` | ✅ PASS |
| CA-06 | Visual | Badge "28% rate", 3 agg rows + tabela 4 col | JS: `Total dividends received +€41.40 / Dividend tax due €11.59 / Net dividend income €29.81`, `divTablePresent=true`, `divTableRows=3` | ✅ PASS |
| CA-07 | Visual | Estados vazios (sample OFF) | JS: `emptySales=true` ("No taxable sales found for 2026"), `emptyDiv=true` ("No dividend income found for 2026") | ✅ PASS |
| CA-10 | Visual | Dark mode, IBM Plex Mono, sinal U+2212 | JS: `dark=true`, `fontFamily="IBM Plex Mono…"`, AAPL gain `−€520.00` (U+2212) | ✅ PASS |
| — | Runtime | Erros de console | `read_console_messages onlyErrors` em 3 momentos (load, sample ON, switch Detailed) → "No console errors" | ✅ PASS |

**Nota:** todas as interacções visuais (toggle Show sample data, switch Aggregate↔Detailed, sincronização tweaks↔seg) foram executadas via cliques reais no DOM (`button.click()`) sem qualquer erro de console.

## Testes E2E — Playwright

| Teste | Ficheiro | Resultado |
|-------|----------|-----------|
| CA-09 auth › sem sessão redirige para /passphrase | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS |
| CA-09 › página carrega com sessão sem erros JS | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS |
| CA-09 › sem chamadas de rede (mock client-side) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS |
| CA-01 header (h1, help, chip ano, Sum for, year switch) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS (5 testes) |
| CA-02 kpi (grid, labels, OFF €0.00, ON valores, ano 2025) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS (5 testes) |
| CA-03 cg (título + seg Aggregate default) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS |
| CA-04 cg-aggregate (4 linhas + valores) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS |
| CA-05 cg-detailed (6 colunas + 4 linhas) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS |
| CA-06 div (badge, 3 rows, tabela 4 col) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS |
| CA-07 empty (sample OFF estados vazios) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS |
| CA-08 tweaks (título, toggle OFF, sync, KPI update) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS (3 testes) |
| CA-09 sidebar (activo aria-current, Dashboard inactivo) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS (2 testes) |
| CA-10 design (dark, font, rise d1/d2/d3, U+2212) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS (4 testes) |
| CA-11 responsive (grids, overflow-x, sidebar mobile) | `tests/e2e/tax-calculator.spec.ts` | ✅ PASS (4 testes) |
| smoke › redireciona para passphrase | `tests/e2e/smoke.spec.ts` | ✅ PASS |
| smoke › passphrase page renderiza | `tests/e2e/smoke.spec.ts` | ✅ PASS |
| smoke › dashboard carrega após auth | `tests/e2e/smoke.spec.ts` | ✅ PASS |

```
Running 35 tests using 1 worker

  ok  1 [setup] › auth.setup.ts:6:6 › autenticar utilizador (5.6s)
  ok  2 [chromium] › smoke.spec.ts:3:5 › redireciona para passphrase se não autenticado (487ms)
  ok  3 [chromium] › smoke.spec.ts:11:5 › passphrase page renderiza correctamente (470ms)
  ok  4 [chromium] › smoke.spec.ts:20:5 › dashboard carrega após autenticação (807ms)
  ok  5 [chromium] › tax-calculator.spec.ts:35:5 › CA-09 auth › /tax-calculator sem sessão redirige para /passphrase (888ms)
  ok  6 › CA-09 › página carrega com sessão sem erros JS (2.4s)
  ok  7 › CA-09 › sem chamadas de rede a API/Supabase/Yahoo ao carregar (mock client-side) (1.8s)
  ok  8 › CA-01 header › h1 'Tax Calculator' visível (1.0s)
  ok  9 › CA-01 header › ícone de ajuda com title='How is this calculated?' (966ms)
  ok 10 › CA-01 header › label 'Tax Year:' e chip select com 2026 por defeito (966ms)
  ok 11 › CA-01 header › 'Sum for 2026' por defeito no cartão principal (984ms)
  ok 12 › CA-01 header › trocar ano para 2025 actualiza 'Sum for {year}' e estados vazios (997ms)
  ok 13 › CA-02 kpi › 3 cartões em grid 1.4fr 1fr 1fr (967ms)
  ok 14 › CA-02 kpi › labels dos 3 cartões (966ms)
  ok 15 › CA-02 kpi › sample OFF (default): 3 KPIs €0.00, 'From 0 sale events' / 'From 0 dividend events', sem neon-loss (975ms)
  ok 16 › CA-02 kpi › sample ON + 2026: €219.16 / €207.57 / €11.59 e neon-loss no liability (1.2s)
  ok 17 › CA-02 kpi › sample ON mas ano 2025: KPIs voltam a €0.00 (só há mock para 2026) (1.1s)
  ok 18 › CA-03 cg › título 'Capital Gains' e seg selector Aggregate por defeito (1.0s)
  ok 19 › CA-04 cg-aggregate › sample ON: 4 linhas com valores de referência (1.3s)
  ok 20 › CA-05 cg-detailed › trocar para Detailed mostra tabela 6 colunas + 4 linhas (1.4s)
  ok 21 › CA-06 div › título, badge '28% rate', 3 agg rows + tabela 4 colunas (sample ON) (1.1s)
  ok 22 › CA-07 empty › sample OFF (default): ambos os painéis em estado vazio para 2026 (979ms)
  ok 23 › CA-08 tweaks › título 'Tax Calculator · Tweaks', toggle OFF por defeito (977ms)
  ok 24 › CA-08 tweaks › ligar/desligar 'Show sample data' actualiza KPIs sem reload (1.1s)
  ok 25 › CA-08 tweaks › radio 'Capital Gains view' sincronizado com seg selector do painel (1.4s)
  ok 26 › CA-09 sidebar › link Tax Calculator activo: aria-current=page, href=/tax-calculator (941ms)
  ok 27 › CA-09 sidebar › Dashboard não tem aria-current=page em /tax-calculator (993ms)
  ok 28 › CA-10 design › classe dark forçada no <html> (929ms)
  ok 29 › CA-10 design › IBM Plex Mono via CSS variable no body (934ms)
  ok 30 › CA-10 design › classes rise d1/d2/d3 presentes no DOM (957ms)
  ok 31 › CA-10 design › sinal negativo usa U+2212 (não hífen) — AAPL gain (1.4s)
  ok 32 › CA-11 responsive › KPI strip tem grid-cols-[1.4fr_1fr_1fr] + breakpoints (943ms)
  ok 33 › CA-11 responsive › panel grid 2 colunas → 1 em ≤1100px (922ms)
  ok 34 › CA-11 responsive › tabelas têm overflow-x-auto (sample ON) (1.0s)
  ok 35 › CA-11 responsive › sidebar oculta em viewport mobile (375px) (2.2s)

  35 passed (50.2s)
```

## Verificações de Segurança

Nenhuma API route foi criada ou modificada nesta feature (100% mock client-side). O único ficheiro de backend tocado pelo Engineer é o middleware de protecção de rota:

| Verificação | Ficheiro | Status |
|-------------|----------|--------|
| `/tax-calculator` adicionado ao array `PROTECTED` | `src/lib/supabase/middleware.ts:4` | ✅ |
| `auth.getUser()` usado (não `getSession()`) no middleware | `src/lib/supabase/middleware.ts:31` | ✅ |
| Redirect para `/passphrase` quando `isProtected && !user` | `src/lib/supabase/middleware.ts:35-39` | ✅ verificado por teste (CA-09 auth: contexto limpo → `/passphrase`) |

**Fronteira servidor/cliente (componentes da feature):** todos os ficheiros em `src/components/tax-calculator/` são Client Components (`"use client"`) e nenhum importa `@/lib/anthropic`, `@/lib/yahoo-finance` ou `@/lib/supabase/server` (verificado por leitura). `page.tsx` é Server Component stub sem `'use client'`. `mock-data.ts` é isomórfico, sem APIs de browser/server. ✅

## Critérios de Aceite

| CA | Descrição | Ferramenta | Status | Evidência |
|----|-----------|------------|--------|-----------|
| CA-01 | Page Header (h1, help, chip ano 2026, "Sum for {year}", year switch) | Chrome Ext + Playwright | ✅ PASS | JS + testes 8-12; year→2025 actualiza "Sum for 2025" e estados vazios |
| CA-02 | KPI Strip (3 cartões, OFF €0.00, ON €219.16/€207.57/€11.59, neon-loss) | Chrome Ext + Playwright | ✅ PASS | JS sample OFF/ON + testes 13-17 |
| CA-03 | Painel Capital Gains + seg selector (Aggregate default) | Chrome Ext + Playwright | ✅ PASS | JS + teste 18 |
| CA-04 | Aggregate: 4 linhas (5,559.77/5,190.00/+369.77/207.57 tier-weighted) | Chrome Ext + Playwright | ✅ PASS | JS aggValues + teste 19 |
| CA-05 | Detailed: tabela 6 colunas, 4 linhas | Chrome Ext + Playwright | ✅ PASS | JS headers+rows + teste 20 |
| CA-06 | Painel Dividend Tax (badge 28%, +€41.40/€11.59/€29.81, tabela 4 col) | Chrome Ext + Playwright | ✅ PASS | JS aggValues+divTable + teste 21 |
| CA-07 | Estados vazios (sample OFF) | Chrome Ext + Playwright | ✅ PASS | JS emptySales/emptyDiv + teste 22 |
| CA-08 | TweaksPanel (título, toggle OFF, sync cgView, KPI update sem reload) | Playwright + Chrome Ext | ✅ PASS | testes 23-25; sync tweaks↔seg confirmado por JS (`tweakDetailedPressed=true`) |
| CA-09 | Sidebar activo + auth redirect | Chrome Ext + Playwright | ✅ PASS | JS taxLinkActive (aria-current=page, border-primary) + testes 5,26,27 |
| CA-10 | Design System (dark, IBM Plex Mono, rise d1/d2/d3, U+2212) | Chrome Ext + Playwright | ✅ PASS | JS dark/font/U+2212 + testes 28-31 |
| CA-11 | Responsividade (grids, overflow-x, sidebar mobile) | Playwright | ✅ PASS | testes 32-35 |

## Problemas Encontrados

Nenhum problema encontrado.

- Typecheck e lint limpos.
- 35/35 testes Playwright passaram (incluindo smoke).
- Verificação visual via Chrome Extension confirmou todos os valores de referência ao cêntimo (sample OFF → €0.00; sample ON 2026 → €219.16/€207.57/€11.59) e zero erros de console em load, toggle e troca de vista.
- Protecção de rota confirmada (sem sessão → `/passphrase`).
- Nota factual: os valores monetários observados (Chrome Ext + Playwright) batem exactamente com o oráculo do working item, sem qualquer diferença de arredondamento.

APROVADO
