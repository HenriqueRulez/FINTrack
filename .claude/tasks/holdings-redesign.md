---
# Plano de Implementação — Holdings Page Redesign

**Working Item:** `.claude/working-items/holdings-redesign.md`
**Especificação Visual:** `.claude/reports/design-holdings-redesign.md`
**Relatório Frontend:** `.claude/reports/frontend-holdings-redesign.md`

---

## Contexto para o Engineer

O Frontend implementou todos os componentes visuais da página `/holdings` com dados mock hardcoded (`src/components/holdings/mock-data.ts`). A UI está completa e funcional. O working item define esta como **Fase 1 — sem integração com API real** (clarificação D1). A integração real com API e banco de dados é out-of-scope desta fase.

O Engineer tem três responsabilidades nesta fase:

1. **Corrigir gaps de schema** — a tabela `portfolio_positions` não tem os campos `sold` (boolean) e `chart_var` (asset class visual) que a interface `HoldingItem` do mock-data exige para a integração futura. A migration deve adicionar esses campos agora para não bloquear a fase 2.
2. **Wiring do botão Refresh** — o `handleRefresh()` em `HoldingsCard.tsx` tem um `TODO` explícito. Como não há API de preços real nesta fase, o Engineer deve substituir o `setTimeout` stub por uma chamada ao endpoint existente `GET /api/portfolio` (que já actualiza preços via yahoo-finance2 com cache de 15 min) e invalidar o estado local de dados.
3. **Garantir que a rota `/holdings` está protegida** — verificar que o middleware existente em `src/proxy.ts` cobre a rota `/holdings` tal como cobre `/dashboard` e `/portfolio`.

---

## Estado do Código Existente

### O que o Frontend JÁ implementou (não tocar)
- `src/app/(dashboard)/holdings/page.tsx` — Server Component stub
- `src/components/holdings/` — todos os componentes visuais (HoldingsPage, KpiStrip, HoldingsCard, HoldingsTable, AllocPill, GainLossCell, PageHead, ShowSoldToggle, CurrencySelector)
- `src/components/holdings/mock-data.ts` — tipos, 8 tickers, FX mock, funções de formatação
- `src/components/layout/sidebar.tsx` — item Holdings já aponta para `/holdings`

### O que existe no backend (reutilizar)
- `GET /api/portfolio` (`src/app/api/portfolio/route.ts`) — lista posições, actualiza preços via yahoo-finance2 com cache 15 min
- `src/lib/rate-limit.ts` — rateLimit() disponível
- `src/lib/supabase/server.ts` — createClient() para Server Components e API Routes
- `src/lib/auth.ts` — requireUser() / getUser()
- Schema `portfolio_positions`: `id`, `user_id`, `ticker`, `name`, `asset_type`, `quantity`, `avg_price`, `current_price`, `currency`, `exchange`, `notes`, `created_at`, `updated_at`, `price_updated_at`

### Gap de schema identificado
A tabela `portfolio_positions` **não tem**:
- `sold BOOLEAN` — para distinguir posições activas de fechadas (necessário para fase 2)
- `chart_var TEXT` — variável CSS da classe de activo para a AllocPill (necessário para fase 2)

---

## Tarefas (para o Engineer)

### T1 — Migration SQL: adicionar campos `sold` e `chart_var` à tabela `portfolio_positions`

**O quê:** Criar migration SQL que adiciona duas colunas à tabela `portfolio_positions`:
- `sold BOOLEAN NOT NULL DEFAULT FALSE` — indica se a posição foi encerrada/vendida
- `chart_var TEXT CHECK (chart_var IN ('chart-1', 'chart-2', 'chart-4', 'chart-5'))` — variável CSS da classe de activo para coloração visual na AllocPill

Aplicar `DEFAULT NULL` em `chart_var` (coluna opcional) e `DEFAULT FALSE` em `sold`. Adicionar índice em `sold` para filtros futuros. Actualizar `src/types/database.ts` com os novos campos via `npx supabase gen types typescript --local`.

**Depende de:** Nenhuma
**Cobre:** Preparação para CA-02, CA-03, CA-04 (suporte à fase 2 — sem integração real nesta fase)

---

### T2 — Verificar protecção da rota `/holdings` no middleware

**O quê:** Abrir `src/proxy.ts` e confirmar que a rota `/holdings` está incluída no conjunto de rotas protegidas (que requerem autenticação). Se o middleware usa um pattern como `/dashboard(.*)` ou lista explícita de rotas, garantir que `/holdings` e `/holdings/(.*)` estão cobertos. Se a protecção já é aplicada pelo grupo `(dashboard)` do App Router, documentar no relatório que não há acção necessária.

**Depende de:** Nenhuma
**Cobre:** CA-07 (navegação segura), segurança da rota

---

### T3 — Wiring do botão Refresh ao endpoint existente `GET /api/portfolio`

**O quê:** Em `src/components/holdings/HoldingsCard.tsx`, substituir o stub `setTimeout` no `handleRefresh()` por uma chamada real ao endpoint `GET /api/portfolio` existente. O endpoint já actualiza os preços das posições com cache expirado (> 15 min) via yahoo-finance2 — o Refresh deve desencadear essa actualização. Como os dados ainda são mock nesta fase, o comportamento concreto é: (1) chamar `fetch('/api/portfolio')` no click, (2) aguardar a resposta, (3) parar a animação de spin. Não é necessário usar os dados retornados para actualizar o estado (os dados visuais são mock até à fase 2). Manter o tratamento de erro silencioso (sem toast nesta fase) — apenas parar o spin em caso de erro.

**Depende de:** T2 (confirmar protecção da rota antes de expor chamadas autenticadas a partir do componente)
**Cobre:** Funcionalidade do botão Refresh (CA-02 parcial — interactividade da tabela)

---

### T4 — Adicionar Zod schema para query params da futura `GET /api/portfolio/holdings`

**O quê:** Em `src/lib/validations/portfolio.ts`, adicionar um schema Zod `HoldingsQuerySchema` para os query params que a futura rota `GET /api/portfolio/holdings` irá aceitar na fase 2: `currency` (enum `'EUR' | 'USD'`), `showSold` (boolean coercido de string), `sortCol` (enum das 8 colunas: `'ticker' | 'pct' | 'shares' | 'avg' | 'cost' | 'price' | 'value' | 'gain'`), `sortDir` (enum `'asc' | 'desc'`). Todos os campos são opcionais com defaults. Exportar também o tipo `HoldingsQuery = z.infer<typeof HoldingsQuerySchema>`. Não criar a route nesta fase — apenas preparar o schema de validação.

**Depende de:** Nenhuma
**Cobre:** Preparação técnica para CA-02, CA-05 (fase 2)

---

### T5 — Criar `GET /api/portfolio/holdings` com dados reais do Supabase

**O quê:** Criar nova API route em `src/app/api/portfolio/holdings/route.ts`. Esta route deve:
1. Autenticar o utilizador com `supabase.auth.getUser()` — retornar 401 se não autenticado
2. Aplicar rate limit: `rateLimit('portfolio:holdings:${user.id}', 30, 60_000)`
3. Validar query params com `HoldingsQuerySchema.safeParse()` (schema criado em T4)
4. Consultar `portfolio_positions` filtrando por `user_id` (da sessão) — incluir ou excluir `sold = true` conforme `showSold`
5. Para cada posição, usar `current_price` (já mantido actualizado pelo `GET /api/portfolio`) ou `avg_price` como fallback
6. Calcular e retornar: `marketValue`, `gainLoss`, `gainLossPct`, `pct` (Portfolio%) por posição, e KPI totais agregados (`totalHoldingsValue`, `unrealizedPL`, `realizedPL`, `totalPL`, `activeCount`, `soldCount`)
7. Retornar `{ data: { positions: HoldingRow[], kpis: HoldingKpis } }` com status 200

**Nota:** A moeda de exibição (EUR/USD/Native) e a conversão FX são responsabilidade do frontend — esta route retorna sempre os valores na `currency` nativa de cada posição (campo `currency` da tabela). O frontend aplica FX mock. Não ligar ainda ao frontend (isso é fase 2).

**Depende de:** T1 (campos `sold` e `chart_var` na tabela), T4 (schema Zod)
**Cobre:** Preparação de backend para CA-01, CA-02, CA-03, CA-04, CA-06 (dados reais na fase 2)

---

## Ordem de Execução

T1 → T2 (paralelo com T1 após verificação) → T4 (paralelo com T1/T2) → T3 (após T2) → T5 (após T1 + T4)

Simplificado: `(T1 em paralelo com T2 em paralelo com T4) → T3 → T5`

---

## Cobertura de Critérios de Aceite

| CA | Descrição | Coberto por | Estado |
|----|-----------|-------------|--------|
| CA-01 — KPI Strip | 7 células, grid responsivo, valores EUR, gain/loss semântico, Cash €0,00 | Frontend ✅ | Completo pelo Frontend |
| CA-02 — Tabela ordenável | 8 colunas, sort por header, seta visual, default Market Value desc | Frontend ✅ / T3 (Refresh) | Visual completo; Refresh wired em T3 |
| CA-03 — Célula Company com allocation bar | Logo, alloc-pill fill, pct, ticker bold, opacidade fechadas | Frontend ✅ | Completo pelo Frontend |
| CA-04 — Toggle "Show sold" | Visível, OFF por defeito, ON mostra fechadas com opacidade | Frontend ✅ | Completo pelo Frontend |
| CA-05 — Selector de moeda | EUR/USD/Native segmentado, EUR default, conversão com FX mock | Frontend ✅ | Completo pelo Frontend (FX mock) |
| CA-06 — Gain/Loss semântico | Cores --gain/--loss, badge percentagem, KPIs e tabela | Frontend ✅ | Completo pelo Frontend |
| CA-07 — Sidebar e navegação | Link Holdings activo, indicador visual teal, outros inactivos | Frontend ✅ / T2 (auth) | Visual completo; protecção verificada em T2 |
| CA-08 — Design System | IBM Plex Mono, teal, dark mode, neon-loss, animações rise | Frontend ✅ | Completo pelo Frontend |
| CA-09 — Responsividade | Sidebar colapsa mobile, KPI strip adapta, tabela scroll horizontal | Frontend ✅ | Completo pelo Frontend |
| Schema para fase 2 | Campos `sold` e `chart_var` na tabela `portfolio_positions` | T1 | Infra para fase 2 |
| Route holdings para fase 2 | `GET /api/portfolio/holdings` com dados reais | T5 | Infra para fase 2 |
| Validação Zod para fase 2 | `HoldingsQuerySchema` em validations/portfolio.ts | T4 | Infra para fase 2 |

---

## Notas Técnicas para o Engineer

### Sobre o scope desta fase
Esta é a Fase 1 (visual com mock). O working item declara explicitamente "sem chamadas a API" (D1). As tarefas T1, T4 e T5 são **infraestrutura preparatória** para a Fase 2 — não modificam o comportamento visual. T3 é a única tarefa que altera comportamento: substitui o `setTimeout` stub por uma chamada real, mas sem alterar o que o utilizador vê (dados continuam a ser mock).

### Sobre T5 — não ligar ao frontend nesta fase
A route `GET /api/portfolio/holdings` deve ser criada e testável via curl/Postman, mas o `HoldingsPage.tsx` continua a usar `HOLDINGS` (mock-data) até à Fase 2. O wiring UI↔API real é out-of-scope.

### Pattern canónico de API route
Seguir exactamente o pattern do `CLAUDE.md`: auth → rate limit → validação Zod → DB com `user_id` da sessão. Ver `src/app/api/portfolio/summary/route.ts` como referência de estrutura limpa.

### Typecheck e lint
`npm run typecheck` e `npm run lint` devem passar com zero erros após cada tarefa. Após T1, regenerar tipos: `npx supabase gen types typescript --local > src/types/database.ts`.
