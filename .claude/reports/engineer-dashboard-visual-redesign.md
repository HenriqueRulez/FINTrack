# Relatório de Implementação — Dashboard Visual Redesign

**Plano:** `.claude/tasks/dashboard-visual-redesign.md`
**Working Item:** `.claude/working-items/dashboard-visual-redesign.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings/erros
**Migration:** N/A — sem novas migrations (o schema `portfolio_positions` existente tem todos os campos necessários: `ticker`, `quantity`, `avg_price`, `current_price`, `name`)

## Ficheiros Criados

- `src/app/api/portfolio/summary/route.ts` — GET /api/portfolio/summary: autentica, aplica rate limit, calcula totalValue/deltaAbsolute/deltaPercent e os 4 KPIs a partir das posições do utilizador; retorna zeros em portfólio vazio
- `src/app/api/portfolio/chart/route.ts` — GET /api/portfolio/chart?tf=3M: autentica, valida query param `tf` com Zod enum, agrega históricos por data via `getHistory()`, filtra por timeframe, retorna `ChartPoint[]` ordenado por data ASC
- `src/app/api/portfolio/movers/route.ts` — GET /api/portfolio/movers: autentica, busca quotes e históricos em paralelo, calcula `changePercent` por posição, ordena por `abs(changePercent)` decrescente, retorna top 5 com sparkline (últimos 7 pontos)

## Ficheiros Modificados

- `src/lib/validations/portfolio.ts` — Adicionados `ChartQuerySchema` (enum tf com default "3M") e tipo exportado `TimeFrame`
- `src/app/(dashboard)/dashboard/page.tsx` — Convertido de mock/stub para Server Component real: busca dados via Supabase server client directo + Yahoo Finance, calcula summary/chart/movers e passa como props reais para `<HeroSection>`, `<KpiGrid>`, `<PortfolioChart>` e `<TopMoversSection>`; removidos todos os valores mock e comentários TODO
- `src/components/settings/logout-button.tsx` — Corrigido redirect de `/login` (rota inexistente) para `/passphrase` (rota real de auth)
- `src/lib/auth.ts` — Corrigido redirect de `/login` para `/passphrase` (pre-existing bug)
- `src/app/(dashboard)/portfolio/page.tsx` — Corrigido redirect de `/login` para `/passphrase` (pre-existing bug)
- `.next/dev/types/link.d.ts` — Actualizado `StaticRoutes` para reflectir as rotas reais do projecto (removidas `/login`, `/register`, `/auth/callback`, `/insights`, `/transactions` que não existem; adicionada `/passphrase`)
- `src/components/layout/navbar.tsx` — **Apagado** (ficheiro obsoleto sem imports activos; layout já usa `Topbar`)

## Tarefas Implementadas

- [x] T4 — Schema Zod `ChartQuerySchema` + tipo `TimeFrame` adicionados a `src/lib/validations/portfolio.ts`
- [x] T1 — Endpoint GET /api/portfolio/summary criado com padrão canónico (auth → rate limit → DB → cálculo)
- [x] T2 — Endpoint GET /api/portfolio/chart?tf= criado com validação Zod do query param e agregação de históricos
- [x] T3 — Endpoint GET /api/portfolio/movers criado com rate limit separado, quotes+históricos em paralelo, top 5 por variação absoluta
- [x] T5 — DashboardPage ligado às APIs reais via Supabase server client directo (sem round-trip HTTP interno); props reais passados a todos os sub-componentes
- [x] T6 — Logout verificado: `LogoutButton` corrigido para redirecionar para `/passphrase`; a rota `/passphrase` existe em `src/app/(auth)/passphrase/page.tsx` e está acessível sem sessão
- [x] T7 — `navbar.tsx` apagado (zero imports activos confirmados por Grep)

## Correcção Ciclo 1

**Bug corrigido:** `dynamic(..., { ssr: false })` em Server Component (`dashboard/page.tsx`) — causa HTTP 500 em toda a aplicação no Next.js 15 App Router.

**Root cause:** O Next.js 15 App Router proíbe `{ ssr: false }` em Server Components. O TypeScript não detecta esta restrição em tempo de compilação, mas o bundler (Turbopack/webpack) rejeita em runtime com erro de compilação.

**Solução aplicada:** Padrão Client Component wrapper — o `dynamic` com `{ ssr: false }` foi movido para um novo ficheiro Client Component que o Server Component importa directamente.

**Scan adicional de `ssr: false`:** Verificado que `src/components/portfolio/position-table.tsx` também usa `dynamic(..., { ssr: false })`, mas este ficheiro já tem `"use client"` no topo — uso correcto, sem necessidade de alteração.

### Ficheiros Criados (Ciclo 1)

- `src/components/dashboard/PortfolioChartClient.tsx` — Client Component wrapper (`'use client'`) que contém o `dynamic(() => import("@/components/dashboard/PortfolioChart"), { ssr: false })`; aceita `PortfolioChartProps` e repassa via spread; inclui `loading` skeleton para o estado de carregamento inicial

### Ficheiros Modificados (Ciclo 1)

- `src/app/(dashboard)/dashboard/page.tsx` — Removido `import dynamic from "next/dynamic"` e o bloco `dynamic(...)` com `{ ssr: false }`; substituído pela importação de `PortfolioChartClient`; `<PortfolioChart ...>` → `<PortfolioChartClient ...>` no JSX

### Resultados (Ciclo 1)

**Typecheck:** ✅ Zero erros (`tsc --noEmit` — saída limpa)
**Lint:** ✅ Zero warnings/erros (`eslint src` — saída limpa)

---

## Notas para o QA

### Dados reais vs mock
- Se o portfólio do utilizador não tiver posições, o dashboard mostra zeros na HeroSection e `"No positions to display"` nos TopMovers — isto é comportamento esperado (não é erro).
- O chart mostra dados mock internos do componente quando `data` é null (portfólio vazio ou erro). Com posições reais, passa dados reais.
- A `getHistory()` do Yahoo Finance limita o histórico a 30 dias por chamada (período fixo no cliente Yahoo Finance existente). Para timeframes maiores (YTD, 1Y, ALL), o endpoint /api/portfolio/chart retorna apenas os dados disponíveis (≤30 dias).

### Logout
- Após logout, o utilizador é redirecionado para `/passphrase`. Em sessões anteriores à correcção, podia ser redirecionado para `/login` (404) — agora corrigido.

### Route types (link.d.ts)
- O ficheiro `.next/dev/types/link.d.ts` foi actualizado manualmente para remover rotas obsoletas e adicionar `/passphrase`. Este ficheiro é auto-gerado pelo Next.js dev server e será regenerado na próxima execução de `npm run dev`. A actualização manual foi necessária para que o typecheck passasse sem dev server a correr.

### API routes criadas
- `/api/portfolio/summary` — sem body, sem query params; seguro chamar no load do dashboard
- `/api/portfolio/chart?tf=3M` — query param opcional com default 3M; todos os timeframes são válidos (1D 1W 1M 3M YTD 1Y ALL)
- `/api/portfolio/movers` — sem params; retorna no máximo 5 itens

### Segurança
- Todos os 3 novos endpoints seguem o padrão canónico: `getUser()` → 401, `rateLimit()` → 429, validação Zod → 422, DB com `user_id` da sessão
- `user_id` nunca vem do body nem de query params — sempre da sessão Supabase autenticada

---

## Correcção Ciclo 3

**Problema reportado pelo QA (Ciclo 2):** Teste CA-07 "sidebar FINTrack brand/logo está visível" falhava por isolamento insuficiente de contexto Playwright. O describe CA-06 executava `supabase.auth.signOut()` (via `LogoutButton`), invalidando a sessão no worker único. O CA-07 usava `test.use({ storageState })` mas a sessão Supabase já estava inválida — o storageState restaura os cookies do browser mas não reconecta a sessão Supabase do lado servidor, causando redirect para `/passphrase` onde não existe `<aside>`.

**Root cause:** Ordem de execução dos describe blocks. Com `workers=1` e `fullyParallel: false`, a sequência é determinística. O CA-06 (logout) corria antes do CA-07 e destruía a sessão.

**Solução aplicada:** Reordenação do describe block CA-06 para o **fim do ficheiro**, depois de CA-07. Esta é a solução mais simples e robusta — CA-06 é o último bloco a correr, pelo que a invalidação de sessão não afecta nenhum describe subsequente.

**Alteração secundária:** Adicionado `E2E_PASSPHRASE=fintrack` ao `.env.local` para que os testes corram sem configuração manual de variável de ambiente (conforme recomendado no relatório QA Ciclo 2).

### Ficheiros Modificados (Ciclo 3)

- `tests/e2e/dashboard-visual-redesign.spec.ts` — Moved CA-06 describe block to end of file (after CA-07); removed `test.use({ storageState })` workaround from CA-07 (no longer needed); added comment explaining the ordering rationale
- `.env.local` — Added `E2E_PASSPHRASE=fintrack` to eliminate manual env setup requirement for E2E tests

### Resultados (Ciclo 3)

**Typecheck:** ✅ Zero erros (`tsc --noEmit` — saída limpa)
**Lint:** ✅ Zero warnings/erros (`eslint src` — saída limpa)

**Testes Playwright — output literal:**

```
Running 23 tests using 1 worker

  ok  1 [setup] › tests\e2e\auth.setup.ts:6:6 › autenticar utilizador (3.0s)
  ok  2 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:22:7 › CA-01 — Sidebar › renderiza os 6 itens de navegação (1.4s)
  ok  3 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:42:7 › CA-01 — Sidebar › itens placeholder têm href='#' e estilo visual distinto (opacidade reduzida) (1.5s)
  ok  4 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:59:7 › CA-01 — Sidebar › item activo (Dashboard) tem indicador visual com acento teal (1.4s)
  ok  5 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:70:7 › CA-01 — Sidebar › sidebar é responsiva — colapsa em mobile (oculta em viewport <768px) (1.4s)
  ok  6 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:80:7 › CA-01 — Sidebar › sidebar é visível em desktop (viewport >=768px) (1.5s)
  ok  7 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:95:7 › CA-02 — Topbar › topbar não contém botão de logout (1.4s)
  ok  8 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:106:7 › CA-02 — Topbar › topbar mostra indicador de sessão ou informação do projecto (1.4s)
  ok  9 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:123:7 › CA-03 — Cards de métricas › pelo menos 4 cards de métricas são visíveis (1.4s)
  ok 10 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:140:7 › CA-03 — Cards de métricas › values em EUR são exibidos (1.3s)
  ok 11 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:156:7 › CA-04 — Chart › chart de portfólio está presente no dashboard (1.3s)
  ok 12 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:164:7 › CA-04 — Chart › selector de timeframe (1D, 1W, 1M, 3M, YTD, 1Y, ALL) é visível (3.5s)
  ok 13 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:178:7 › CA-04 — Chart › chart container SVG renderizado pelo Recharts está presente (3.3s)
  ok 14 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:194:7 › CA-05 — Animações de entrada › toggle 'Animações de entrada' existe na página de Settings (1.1s)
  ok 15 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:203:7 › CA-05 — Animações de entrada › estado do toggle é persistido em localStorage com chave 'fintrack_animations_enabled' (1.1s)
  ok 16 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:232:7 › CA-05 — Animações de entrada › quando toggle está OFF, classe 'animations-enabled' é removida do <body> (1.2s)
  ok 17 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:253:7 › CA-05 — Animações de entrada › toggle funciona sem reload de página (1.3s)
  ok 18 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:282:7 › CA-07 — Design System › classe 'dark' está forçada no elemento <html> (767ms)
  ok 19 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:288:7 › CA-07 — Design System › font IBM Plex Mono está carregada (variável CSS --font-ibm-plex-mono presente) (1.3s)
  ok 20 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:299:7 › CA-07 — Design System › acento Teal (--primary) é oklch(0.72 0.17 185) no dark mode (1.4s)
  ok 21 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:328:7 › CA-07 — Design System › sidebar FINTrack brand/logo está visível (1.4s)
  ok 22 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:351:7 › CA-06 — Logout em Settings › botão de logout existe na página /settings (1.1s)
  ok 23 [chromium] › tests\e2e\dashboard-visual-redesign.spec.ts:359:7 › CA-06 — Logout em Settings › acção de logout invalida sessão e redireciona para /passphrase (1.4s)

  23 passed (38.4s)
```

**Resultado: 23/23 passed — suite completa ✅**
