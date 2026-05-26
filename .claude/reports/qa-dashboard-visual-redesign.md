# QA Report — Dashboard Visual Redesign

**Working Item:** `.claude/working-items/dashboard-visual-redesign.md`
**Relatório do Engineer:** `.claude/reports/engineer-dashboard-visual-redesign.md`
**Testes Playwright criados:** `tests/e2e/dashboard-visual-redesign.spec.ts`
**Status Geral:** ❌ REPROVADO

---

## Verificações de Qualidade

| Verificação | Status | Output (completo se ❌) |
|-------------|--------|------------------------|
| Typecheck | ✅ Zero erros | — |
| Lint | ✅ Zero warnings/erros | — |
| Migration | N/A | N/A — sem novas migrations |

---

## Bug Crítico de Runtime — Dashboard Inacessível

O dashboard retorna **HTTP 500** em todas as rotas (`/`, `/passphrase`, `/dashboard`, `/settings`) devido a um erro de compilação detectado pelo runtime do Next.js no servidor já em execução (PID 6976).

**Erro reportado pelo servidor:**

```
./src/app/(dashboard)/dashboard/page.tsx:13:24
`ssr: false` is not allowed with `next/dynamic` in Server Components.
Please move it into a Client Component.
  11 |
  12 | // PortfolioChart uses Recharts which is client-only — load without SSR
> 13 | const PortfolioChart = dynamic(
     |                        ^^^^^^^
> 14 |   () =>
     | ^^^^^^^
> 15 |     import("@/components/dashboard/PortfolioChart").then(
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 16 |       (m) => m.PortfolioChart
     | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> 17 |     ),
     | ^^^^^^
> 18 |   { ssr: false }
     | ^^^^^^^^^^^^^^^^
> 19 | );
     | ^
Ecmascript file had an error
```

**Root cause:** `dashboard/page.tsx` é um Server Component (sem `'use client'`), mas usa `dynamic(..., { ssr: false })` — o que é proibido no App Router do Next.js 15. O TypeScript não detecta esta constraint em tempo de compilação (`tsc --noEmit` passa), mas o runtime do Next.js rejeita.

**Ficheiro afectado:** `src/app/(dashboard)/dashboard/page.tsx` linhas 13-19.

**Correcção necessária:** Mover o bloco `dynamic` para um componente cliente intermediário, por exemplo `DashboardPageClient.tsx` com `'use client'`, ou remover `{ ssr: false }` e importar `PortfolioChart` directamente (o componente já tem `'use client'` e o dynamic import sem `ssr: false` é suportado em Server Components).

---

## Testes E2E — Playwright

**Servidor dev:** ✅ Online (http://localhost:3000) — mas retorna 500 em todas as rotas devido ao erro acima.

**Auth state:** ❌ `tests/e2e/.auth/user.json` não existe — o auth setup nunca foi executado.

```
[WebServer] ⚠ Port 3000 is in use by process 6976, using available port 3001 instead.
[WebServer] ⨯ Another next dev server is already running.

- Local:        http://localhost:3000
- PID:          6976
- Dir:          E:\Projetos\FINTrack
- Log:          .next\dev\logs\next-development.log

Run taskkill /PID 6976 /F to stop it.
Error: Process from config.webServer was not able to start. Exit code: 1
```

O Playwright tentou iniciar um segundo servidor (porta 3001) porque detectou conflito de porta. O `reuseExistingServer: true` não se activou porque o servidor existente está a responder com 500 em todas as rotas (causado pelo erro de runtime acima), o que faz o health-check do Playwright falhar.

| Teste | Ficheiro | Resultado |
|-------|----------|-----------|
| CA-01 › renderiza os 6 itens de navegação | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-01 › itens placeholder têm href='#' e opacidade reduzida | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-01 › item activo (Dashboard) tem indicador visual teal | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-01 › sidebar colapsa em mobile | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-01 › sidebar visível em desktop | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-02 › topbar não contém botão de logout | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-02 › topbar mostra indicador de sessão | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-03 › pelo menos 4 KPI cards visíveis | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-03 › values em EUR exibidos | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-04 › chart de portfólio presente | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-04 › selector de timeframe visível | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-04 › SVG Recharts renderizado | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-05 › toggle 'Animações de entrada' em Settings | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-05 › estado persistido em localStorage | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-05 › toggle OFF remove classe animations-enabled | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-05 › toggle funciona sem reload | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-06 › botão logout existe em /settings | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-06 › logout redireciona para /passphrase | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-07 › classe 'dark' em <html> | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-07 › font IBM Plex Mono carregada | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-07 › acento Teal oklch(0.72 0.17 185) | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| CA-07 › FINTrack brand na sidebar | `tests/e2e/dashboard-visual-redesign.spec.ts` | ⚠️ NÃO TESTADO |
| smoke › redireciona para passphrase | `tests/e2e/smoke.spec.ts` | ⚠️ NÃO TESTADO |
| smoke › dashboard carrega | `tests/e2e/smoke.spec.ts` | ⚠️ NÃO TESTADO |
| portfolio › Ações abre sem erro | `tests/e2e/portfolio.spec.ts` | ⚠️ NÃO TESTADO |

**PLAYWRIGHT_SKIP: servidor com erro de runtime (500) — `ssr: false` em Server Component**

---

## Verificações de Segurança

### `src/app/api/portfolio/summary/route.ts`

| Verificação | Ficheiro | Status |
|-------------|----------|--------|
| auth.getUser() primeiro | `src/app/api/portfolio/summary/route.ts` | ✅ |
| Retorna 401 se sem utilizador | `src/app/api/portfolio/summary/route.ts` | ✅ |
| Rate limit aplicado | `src/app/api/portfolio/summary/route.ts` | ✅ |
| Zod safeParse antes do banco | `src/app/api/portfolio/summary/route.ts` | ✅ (sem body — não aplicável, dados directo do DB) |
| user_id da sessão (nunca do body) | `src/app/api/portfolio/summary/route.ts` | ✅ |

### `src/app/api/portfolio/chart/route.ts`

| Verificação | Ficheiro | Status |
|-------------|----------|--------|
| auth.getUser() primeiro | `src/app/api/portfolio/chart/route.ts` | ✅ |
| Retorna 401 se sem utilizador | `src/app/api/portfolio/chart/route.ts` | ✅ |
| Rate limit aplicado | `src/app/api/portfolio/chart/route.ts` | ✅ |
| Zod safeParse antes do banco | `src/app/api/portfolio/chart/route.ts` | ✅ (`ChartQuerySchema.safeParse`) |
| user_id da sessão (nunca do body) | `src/app/api/portfolio/chart/route.ts` | ✅ |

### `src/app/api/portfolio/movers/route.ts`

| Verificação | Ficheiro | Status |
|-------------|----------|--------|
| auth.getUser() primeiro | `src/app/api/portfolio/movers/route.ts` | ✅ |
| Retorna 401 se sem utilizador | `src/app/api/portfolio/movers/route.ts` | ✅ |
| Rate limit aplicado | `src/app/api/portfolio/movers/route.ts` | ✅ |
| Zod safeParse antes do banco | `src/app/api/portfolio/movers/route.ts` | ✅ (sem params — não aplicável) |
| user_id da sessão (nunca do body) | `src/app/api/portfolio/movers/route.ts` | ✅ |

### Componentes Cliente

| Verificação | Ficheiro | Status |
|-------------|----------|--------|
| Não importa `src/lib/anthropic/` nem `src/lib/yahoo-finance/` | `src/components/settings/logout-button.tsx` | ✅ |
| Usa `src/lib/supabase/client.ts` (não server.ts) | `src/components/settings/logout-button.tsx` | ✅ |
| Não importa `src/lib/anthropic/` nem `src/lib/yahoo-finance/` | `src/components/settings/AnimationsToggle.tsx` | ✅ |
| Não importa `src/lib/anthropic/` nem `src/lib/yahoo-finance/` | `src/components/layout/sidebar.tsx` | ✅ |
| Não importa `src/lib/anthropic/` nem `src/lib/yahoo-finance/` | `src/components/layout/topbar.tsx` | ✅ |

---

## Critérios de Aceite

| CA | Descrição | Status | Evidência |
|----|-----------|--------|-----------|
| CA-01 | Sidebar renderiza 6 itens de navegação | ✅ PASS (código) | `sidebar.tsx:122-128` — NAV_ITEMS (5) + SETTINGS_ITEM (1) = 6 itens; todos os labels presentes |
| CA-01 | Placeholders com href="#" e estilo visual distinto | ✅ PASS (código) | `sidebar.tsx:147-160` — `aria-disabled="true"`, `opacity-40`, `cursor-not-allowed`, `pointer-events-none` |
| CA-01 | Item activo com indicador visual (teal + neon) | ✅ PASS (código) | `sidebar.tsx:166-174` — `border-l-2 border-primary`, `text-primary`, `aria-current="page"` |
| CA-01 | Sidebar responsiva (oculta em mobile) | ✅ PASS (código) | `sidebar.tsx:186` — `hidden md:flex` (oculta em <768px) |
| CA-02 | Topbar sem botão "Sair"/logout | ✅ PASS (código) | `topbar.tsx` — sem qualquer botão de logout; apenas data + Sync indicator |
| CA-02 | Topbar mostra indicador de sessão/projeto | ✅ PASS (código) | `topbar.tsx:44-58` — mostra data formatada e status "Sync · 2 min ago" |
| CA-03 | Mínimo 4 KPI cards | ✅ PASS (código) | `KpiGrid.tsx` + `dashboard/page.tsx:buildKpis()` — 4 cards: Invested capital, Cash reserve, Open positions, Day P&L |
| CA-03 | Valores em EUR (€) | ✅ PASS (código) | `summary/route.ts:formatEur()` e `dashboard/page.tsx:formatEur()` — `currency: "EUR"` |
| CA-03 | Ganhos/perdas com --gain/--loss | ✅ PASS (código) | `HeroSection.tsx:53-54` — `text-[var(--gain)]` / `text-[var(--loss)]`; `TopMoversSection.tsx:154` |
| CA-03 | Cards com efeitos neon | ✅ PASS (código) | `HeroSection.tsx:53-54` — `.neon-gain`, `.neon-loss`; `HeroSection.tsx:79` — `.neon-primary-text` |
| CA-04 | Chart com Recharts | ❌ FAIL (runtime) | `dashboard/page.tsx:13-19` — `dynamic(..., { ssr: false })` em Server Component causa erro 500; chart nunca renderiza |
| CA-04 | Dados mock/placeholder disponíveis | ✅ PASS (código) | `PortfolioChart.tsx:36-58` — `generateMockData()` com 90 pontos diários |
| CA-04 | Chart responsivo | ✅ PASS (código) | `PortfolioChart.tsx:206` — `<ResponsiveContainer width="100%">` |
| CA-04 | Tema dark (cores globals.css) | ✅ PASS (código) | `PortfolioChart.tsx:229-250` — `fill: "var(--muted-foreground)"`, `stroke: "var(--primary)"`, etc. |
| CA-05 | Animações de entrada no dashboard | ✅ PASS (código) | `globals.css:217-230` — `@keyframes rise` + `.animations-enabled .rise`; usado em HeroSection, KpiGrid, PortfolioChart, TopMoversSection |
| CA-05 | Toggle "Animações de entrada" em Settings | ✅ PASS (código) | `AnimationsToggle.tsx` — `role="switch"`, `aria-label="Activar animações de entrada"` |
| CA-05 | Estado persistido em localStorage com `fintrack_animations_enabled` | ✅ PASS (código) | `AnimationsToggle.tsx:5` — `const STORAGE_KEY = "fintrack_animations_enabled"`; lido/escrito em `handleToggle()` |
| CA-05 | Toggle OFF remove animações | ✅ PASS (código) | `AnimationsToggle.tsx:30-32` — `document.body.classList.remove("animations-enabled")` |
| CA-05 | Toggle funciona sem reload | ✅ PASS (código) | `AnimationsToggle.tsx:24-34` — `handleToggle()` é síncrono (sem reload) |
| CA-06 | Logout existe em /settings | ✅ PASS (código) | `settings/page.tsx:40` — `<LogoutButton />`; `logout-button.tsx:9-34` |
| CA-06 | Logout invalida sessão e redireciona para /passphrase | ✅ PASS (código) | `logout-button.tsx:16-18` — `supabase.auth.signOut()` + `router.push("/passphrase")` |
| CA-07 | IBM Plex Mono aplicada | ✅ PASS (código) | `layout.tsx:5-9` — `IBM_Plex_Mono` carregada; `globals.css:8-10` — `--font-heading`, `--font-sans`, `--font-mono` apontam para `--font-ibm-plex-mono` |
| CA-07 | Acento Teal `oklch(0.72 0.17 185)` | ✅ PASS (código) | `globals.css:103` — `.dark { --primary: oklch(0.72 0.17 185) }` |
| CA-07 | Dark mode exclusivo — classe `dark` no `<html>` | ✅ PASS (código) | `layout.tsx:23` — `<html lang="pt-BR" className="dark">` |
| CA-07 | Zero warnings de acessibilidade de contraste | ⚠️ NÃO TESTADO | Servidor offline — impossível validar em browser |

---

## Problemas Encontrados

- **[CRÍTICO]** `src/app/(dashboard)/dashboard/page.tsx:13-19` — `dynamic(..., { ssr: false })` usado num Server Component. Next.js 15 App Router não permite `ssr: false` em Server Components — apenas em Client Components. O erro bloqueia a compilação e torna o dashboard (e toda a aplicação) inacessível com HTTP 500. Afecta **CA-04** directamente e impede todos os testes Playwright. O `tsc --noEmit` não detecta este erro porque é uma constraint de runtime do bundler Next.js/Turbopack, não TypeScript.

  **Correcção sugerida ao Engineer:** Criar um componente wrapper `'use client'` (ex: `src/components/dashboard/PortfolioChartWrapper.tsx`) que use `dynamic` com `ssr: false` internamente, e importar esse wrapper no `dashboard/page.tsx` sem `dynamic`. Alternativamente, remover `{ ssr: false }` — o Recharts funciona com SSR desactivado pelo facto de o componente pai já ter `'use client'`.
