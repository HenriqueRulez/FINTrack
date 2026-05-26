# Relatório de Segurança — Dashboard Visual Redesign

**Engineer Report:** `.claude/reports/engineer-dashboard-visual-redesign.md`
**Working Item:** `.claude/working-items/dashboard-visual-redesign.md`
**SECURITY_FINDINGS.md:** actualizado ✅

## Ficheiros Auditados

- `src/app/api/portfolio/summary/route.ts`
- `src/app/api/portfolio/chart/route.ts`
- `src/app/api/portfolio/movers/route.ts`
- `src/components/dashboard/PortfolioChartClient.tsx`
- `src/components/dashboard/HeroSection.tsx`
- `src/components/dashboard/KpiGrid.tsx`
- `src/components/dashboard/TopMoversSection.tsx`
- `src/components/settings/AnimationsToggle.tsx`
- `src/hooks/useAnimations.ts`

## Resultados das Verificações Automáticas

| Verificação | Resultado |
|-------------|-----------|
| Secrets expostos em client | ✅ Nenhum |
| Routes sem auth.getUser | ✅ Todas protegidas |
| Routes sem rateLimit | ✅ Todas com rate limit |
| npm audit (high+critical) | ✅ Zero (apenas 2 moderate — postcss, já registado como B-01, sem fix viável) |

## Achados desta Feature

### CRÍTICO
_Nenhum._

### ALTO
_Nenhum._

### MÉDIO
_Nenhum._

### BAIXO / INFORMACIONAL

| ID | Arquivo | Problema | Impacto | Correcção Sugerida |
|----|---------|----------|---------|-------------------|
| B-07 | `src/app/api/portfolio/summary/route.ts:53`, `chart/route.ts:73`, `movers/route.ts:35` | `select("*")` em todas as 3 novas routes — busca todas as colunas da tabela `portfolio_positions`, incluindo campos potencialmente adicionados no futuro | Expõe dados desnecessários; aumenta payload de rede e superfície de risco se colunas sensíveis forem adicionadas posteriormente | Substituir por `select("id, ticker, quantity, avg_price, current_price, name, user_id")` — apenas as colunas efectivamente utilizadas no cálculo |
| B-08 | `src/app/api/portfolio/summary/route.ts:51`, `chart/route.ts:71`, `movers/route.ts:33` | `(supabase as any)` type cast em todas as 3 routes — contorna type checking do Supabase client, potencialmente mascarando erros de runtime | Risco negligível: o cast é imediatamente seguido de `.eq("user_id", user.id)` e RLS activo; não há bypass de segurança. Risco é de manutenibilidade — alterações futuras ao schema podem não ser detectadas em compile time | Actualizar `src/types/database.ts` com `npx supabase gen types typescript --local` para eliminar a necessidade do cast |
| B-09 | `src/hooks/useAnimations.ts:8`, `src/components/settings/AnimationsToggle.tsx:8` | Estado inicial `useState(true)` antes de ler localStorage — durante hidratação SSR→client, o hook assume `enabled=true` e aplica classes de animação até o `useEffect` correr. Pode causar flash indesejado se utilizador tiver desactivado animações | Sem impacto de segurança; impacto é apenas visual (FOUC de animações). Sem dados sensíveis envolvidos | Inicializar com `useState<boolean | null>(null)` e não aplicar classes até o estado ser resolvido; ou usar `suppressHydrationWarning` se o flash for tolerável |

### Achados Resolvidos nesta Feature
_Nenhum achado anteriormente aberto foi corrigido por esta feature._

## Análise Detalhada

### API Routes — Padrão Canónico ✅

Todas as 3 novas routes seguem rigorosamente o padrão canónico do CLAUDE.md:

**`/api/portfolio/summary`**
- `supabase.auth.getUser()` na linha 36 — correcto (não `getSession()`)
- 401 imediato se `authError || !user` — correcto
- `rateLimit("portfolio:summary:${user.id}", 30, 60_000)` — correcto
- Sem body na requisição GET — validação Zod não necessária
- `user_id` nunca do body — usa `.eq("user_id", user.id)` com `user.id` da sessão
- Erros de DB retornam `{ error: "Database error" }` genérico — não expõe mensagens internas

**`/api/portfolio/chart`**
- Mesmo padrão de auth + rate limit
- Query param `tf` validado com `ChartQuerySchema.safeParse()` (Zod enum) — correcto
- Retorna `{ error: "Validation failed", details: parsed.error.flatten() }` — inofensivo (enum values são conhecidos)

**`/api/portfolio/movers`**
- Mesmo padrão de auth + rate limit
- `Promise.all` em `getQuote` e `getHistory` — ambas as funções no Yahoo Finance client têm try/catch internos que retornam `null` / `[]` em caso de erro; não há risco de rejected promise sem handler

### Fronteira Servidor/Cliente ✅

- `PortfolioChartClient.tsx` — `"use client"`, importa apenas `next/dynamic` e tipos do `PortfolioChart`; nenhum import de `lib/anthropic` ou `lib/yahoo-finance`
- `HeroSection.tsx` — `"use client"`, importa apenas `@/components/ui/skeleton` e `@/hooks/useAnimations`
- `KpiGrid.tsx` — `"use client"`, importa apenas `@/components/ui/skeleton` e `@/hooks/useAnimations`
- `TopMoversSection.tsx` — `"use client"`, importa apenas `@/components/ui/skeleton` e `@/hooks/useAnimations`
- `AnimationsToggle.tsx` — `"use client"`, sem imports server-only
- `useAnimations.ts` — `"use client"`, apenas `react` hooks; usa `localStorage` e `document.body` apenas em `useEffect` (cliente)
- `lib/supabase/server.ts` não importado em nenhum dos componentes cliente auditados ✅

### localStorage — Dados Armazenados ✅

A chave `fintrack_animations_enabled` armazena exclusivamente `"true"` ou `"false"` (boolean serializado). Nenhum dado sensível (tokens, credenciais, dados financeiros, PII) é armazenado em localStorage. Conforme esperado para preferência de UI.

### npm audit

Output completo:
```
postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install next@9.3.3, which is a breaking change
node_modules/next/node_modules/postcss
  next  9.3.4-canary.0 - 16.3.0-canary.5
  Depends on vulnerable versions of postcss

2 moderate severity vulnerabilities
```

Vulnerabilidade pré-existente (B-01, registada em 2026-05-23). A "fix" exigiria downgrade do Next.js para 9.3.3 — inaceitável. Sem acção viável até patch do Next.js. Zero vulnerabilidades high/critical.

## Estado de SECURITY_FINDINGS.md após actualização

| Categoria | Abertos | Resolvidos | Aceites |
|-----------|---------|------------|---------|
| Crítico   | 0 | 0 | 0 |
| Alto      | 0 | 0 | 0 |
| Médio     | 3 | 0 | 0 |
| Baixo     | 9 | 0 | 1 |
| **Total** | **12** | **0** | **1** |

---

**Conclusão:** A feature `dashboard-visual-redesign` não introduz vulnerabilidades de segurança exploitáveis. Todos os 3 novos endpoints seguem o padrão canónico de segurança definido no CLAUDE.md. Os 3 novos achados são informativos/baixo risco e não bloqueiam deploy. **Feature aprovada do ponto de vista de segurança.**
