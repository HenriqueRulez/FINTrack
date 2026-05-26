# Plano de Implementação — Dashboard Visual Redesign

**Working Item:** `.claude/working-items/dashboard-visual-redesign.md`
**Especificação Visual:** `.claude/reports/design-dashboard-visual-redesign.md`
**Relatório Frontend:** `.claude/reports/frontend-dashboard-visual-redesign.md`

## Tarefas (para o Engineer)

### T1 — Endpoint GET /api/portfolio/summary
**O quê:** Criar a API route `src/app/api/portfolio/summary/route.ts`. O endpoint autentica o utilizador, aplica rate limit, lê todas as posições da tabela `portfolio_positions` do utilizador (via Supabase com RLS), e calcula:
- `totalValue`: soma de `quantity * current_price` de todas as posições (em EUR; posições sem `current_price` usam `avg_price` como fallback)
- `deltaAbsolute`: `totalValue` - soma de `quantity * avg_price` (custo total investido)
- `deltaPercent`: `(deltaAbsolute / custo_total_investido) * 100`
- `kpis`: array com 4 itens — `{ label, value, sub, type }`:
  1. "Invested capital" — custo total investido (`quantity * avg_price`)
  2. "Cash reserve" — valor fixo `0` (placeholder; sem tabela de cash no schema actual)
  3. "Open positions" — contagem de posições distintas
  4. "Day P&L" — soma de ganhos/perdas do dia (placeholder `0` se não houver dados intraday; não bloquear o endpoint)
- Resposta: `{ data: PortfolioSummary }` com status 200
- Validação Zod: sem body (GET); sem query params obrigatórios
- Em caso de posições vazias retornar zeros em todos os campos (não retornar 404)
- Seguir exactamente o padrão canónico de API route definido em `CLAUDE.md`
**Depende de:** Nenhuma
**Cobre:** CA-03

### T2 — Endpoint GET /api/portfolio/chart
**O quê:** Criar a API route `src/app/api/portfolio/chart/route.ts`. O endpoint autentica, aplica rate limit, e aceita query param `tf` (timeframe). Valida `tf` com Zod enum: `"1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL"` (default `"3M"`).
- Lê as posições do utilizador e para cada uma chama `getHistory(ticker)` do `src/lib/yahoo-finance/client.ts` (já existente — retorna `HistoryPoint[]` com `{ date, close }`)
- Agrega os históricos por data: para cada data presente, soma `close * quantity` de todas as posições (valor de mercado do portfolio nessa data) — `portfolio: number`
- Calcula também `invested: number` por data — soma de `avg_price * quantity` de todas as posições (constante, não muda por data)
- Filtra os pontos de acordo com o `tf` solicitado (1D=último dia, 1W=7 dias, 1M=30 dias, 3M=90 dias, YTD=desde 1 Jan do ano corrente, 1Y=365 dias, ALL=tudo)
- Retorna `ChartPoint[]` — `{ date: string, portfolio: number, invested: number }` ordenado por data ASC
- Resposta: `{ data: ChartPoint[] }` com status 200
- Nota: `getHistory()` já tem cache de 1h — não adicionar cache adicional
**Depende de:** Nenhuma (pode ser desenvolvida em paralelo com T1)
**Cobre:** CA-04

### T3 — Endpoint GET /api/portfolio/movers
**O quê:** Criar a API route `src/app/api/portfolio/movers/route.ts`. O endpoint autentica, aplica rate limit, e calcula os top movers do portfólio do utilizador.
- Lê todas as posições via Supabase
- Para cada posição, chama `getQuote(ticker)` do `src/lib/yahoo-finance/client.ts` para obter preço actual
- Calcula `changePercent` por posição: `((current_price - avg_price) / avg_price) * 100`
- Ordena por `Math.abs(changePercent)` decrescente — maiores variações primeiro
- Retorna os top 5 movers com `sparkline` obtido de `getHistory(ticker)` (últimos 7 pontos `.close` em `number[]`)
- Estrutura de resposta: `MoverItem[]` — `{ ticker, name, price, changePercent, sparkline?: number[] }`
- Rate limit separado: `portfolio:movers:${user.id}`, 30 req/min
- Em caso de portfólio vazio retornar array vazio `{ data: [] }` com status 200
**Depende de:** Nenhuma (pode ser desenvolvida em paralelo com T1 e T2)
**Cobre:** CA-03

### T4 — Schema Zod para os novos endpoints
**O quê:** Adicionar ao ficheiro `src/lib/validations/portfolio.ts` os schemas Zod necessários para os novos endpoints:
- `ChartQuerySchema`: valida query param `tf` com enum `["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"]` e default `"3M"`
- Exportar tipos `TimeFrame = z.infer<typeof ChartQuerySchema>["tf"]`
- Não criar ficheiro novo — adicionar aos schemas existentes para manter coesão
**Depende de:** Nenhuma
**Cobre:** (suporte a T2)

### T5 — Ligar DashboardPage às APIs reais
**O quê:** Converter `src/app/(dashboard)/dashboard/page.tsx` de Server Component para componente que faz fetch aos três endpoints criados (T1, T2, T3) e passa dados reais como props para os sub-componentes.
- Usar `fetch` com `{ cache: 'no-store' }` ou equivalente via Supabase server client directo (a decisão de implementação fica com o Engineer — ambas são válidas; fetch interno é mais simples)
- Passar `totalValue`, `deltaPercent`, `deltaAbsolute` e `isLoading: false` para `<HeroSection>`
- Passar `items` (array `KpiItem[]`) para `<KpiGrid>` via `kpiSlot`
- Passar `data` (array `ChartPoint[]`) para `<PortfolioChart>` — timeframe inicial `"3M"`
- Passar `movers` (array `MoverItem[]`) para `<TopMoversSection>`
- Em caso de erro de fetch, passar `isLoading: false` e arrays/valores vazios (zero) — a UI já trata estados vazios com Skeleton e "No positions to display"
- Remover todos os valores mock e comentários `// TODO: Engineer`
**Depende de:** T1, T2, T3
**Cobre:** CA-03, CA-04

### T6 — Verificar funcionalidade de logout em Settings (CA-06)
**O quê:** Verificar que o logout já está funcional na página `/settings` — o componente `LogoutButton` em `src/components/settings/logout-button.tsx` já existe e está integrado na página. O Engineer deve confirmar que:
- O botão chama `supabase.auth.signOut()` e redireciona para `/login`
- A rota `/login` (ou equivalente de auth) existe e está acessível sem sessão
- Não existe nenhuma referência ao botão de logout no `Topbar` ou `Navbar` antigo (verificar se `navbar.tsx` ainda tem referências ao logout e remover o ficheiro se não houver outros imports activos)
- Se `navbar.tsx` tiver importações activas fora do dashboard layout, não o apagar — registar como dívida técnica no relatório do Engineer
**Depende de:** Nenhuma
**Cobre:** CA-06

### T7 — Remover ficheiro navbar.tsx obsoleto (se seguro)
**O quê:** Verificar com Grep se `navbar.tsx` tem imports activos fora de `src/app/(dashboard)/layout.tsx`. Se não tiver, apagar o ficheiro `src/components/layout/navbar.tsx`. Se tiver, documentar no relatório do Engineer e não apagar.
**Depende de:** T6
**Cobre:** CA-02 (limpeza — Topbar sem logout já implementado pelo Frontend)

---

## Ordem de Execução

T4 → (T1 em paralelo com T2 em paralelo com T3) → T5 → T6 → T7

---

## Cobertura de Critérios de Aceite

| CA | Descrição | Coberto por |
|----|-----------|-------------|
| CA-01 — Sidebar | 6 itens, placeholders, activo, responsivo | Implementado pelo Frontend — sem tarefas para o Engineer |
| CA-02 — Topbar | Sem logout, data + sync | Implementado pelo Frontend; verificação do navbar.tsx em T7 |
| CA-03 — Cards de métricas | 4 KPIs com dados reais em EUR, gain/loss | T1 (cálculo) + T5 (wiring) |
| CA-04 — Chart | Recharts com dados reais, responsivo, dark theme | T2 (endpoint) + T5 (wiring); componente já implementado pelo Frontend |
| CA-05 — Animações de entrada | Toggle em Settings, localStorage, sem reload | Implementado pelo Frontend — sem tarefas para o Engineer |
| CA-06 — Logout em Settings | Botão funcional em /settings, invalida sessão, redireciona | T6 (verificação e confirmação) |
| CA-07 — Design System | IBM Plex Mono, Teal, dark mode, contraste | Implementado pelo Frontend — sem tarefas para o Engineer |
