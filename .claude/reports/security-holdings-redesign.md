# Security Report — holdings-redesign

**Status:** ⚠️ ACHADOS MENORES
**Data:** 2026-05-27

## Scope auditado

| Ficheiro | Tipo |
|----------|------|
| `src/app/(dashboard)/holdings/page.tsx` | Server Component (stub) |
| `src/components/holdings/HoldingsPage.tsx` | Client Component |
| `src/components/holdings/HoldingsCard.tsx` | Client Component |
| `src/components/holdings/HoldingsTable.tsx` | Client Component |
| `src/components/holdings/KpiStrip.tsx` | Client Component |
| `src/components/holdings/PageHead.tsx` | Client Component |
| `src/components/holdings/AllocPill.tsx` | Client Component |
| `src/components/holdings/GainLossCell.tsx` | Client Component |
| `src/components/holdings/ShowSoldToggle.tsx` | Client Component |
| `src/components/holdings/CurrencySelector.tsx` | Client Component |
| `src/components/holdings/mock-data.ts` | Dados mock (client-side) |
| `src/app/api/portfolio/holdings/route.ts` | API Route (GET) |
| `src/lib/supabase/middleware.ts` | Middleware (protecção de rota) |
| `src/lib/validations/portfolio.ts` | Schema Zod |
| `src/components/layout/sidebar.tsx` | Layout (sidebar) |
| `supabase/migrations/0008_portfolio_sold_chart_var.sql` | Migration SQL |

## OWASP Top 10 — Resultados

| Categoria | Status | Notas |
|-----------|--------|-------|
| A01 — Broken Access Control | ✅ OK | `/holdings` adicionado ao array `PROTECTED` em `middleware.ts`; API route faz `supabase.auth.getUser()` como primeira operação; RLS activo na tabela |
| A02 — Cryptographic Failures | ✅ OK | Dados mock hardcoded (sem PII real); API route não expõe campos sensíveis além dos necessários; nenhuma credencial no bundle do browser |
| A03 — Injection | ✅ OK | Nenhum `dangerouslySetInnerHTML`, `innerHTML`, `eval()` ou `document.write` nos componentes; valores de `ticker` e `name` são renderizados como text nodes React (auto-escaped); `chart_var` da migration tem `CHECK` constraint com enum fechado |
| A05 — Security Misconfiguration | ✅ OK | CSP com nonce aplicada pelo `proxy.ts` em todos os pedidos; nenhuma variável de ambiente server-only exposta no bundle cliente; `frame-ancestors 'none'` e `upgrade-insecure-requests` activos |
| A06 — Vulnerable Components | ⚠️ MENOR | Nenhuma dependência nova adicionada. Vulnerabilidade pré-existente B-01 permanece (postcss < 8.5.10 transitivo do Next.js — GHSA-qx2v-qp2m-jg93) |
| A09 — Security Logging | ✅ N/A | Nenhum `console.error`/`log` nos novos ficheiros da feature; API route não loga dados de utilizador ou stack traces |

## npm audit

```
postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
https://github.com/advisories/GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install next@9.3.3, which is a breaking change
node_modules/next/node_modules/postcss
  next  9.3.4-canary.0 - 16.3.0-canary.5
  Depends on vulnerable versions of postcss
  node_modules/next

2 moderate severity vulnerabilities
```

Resultado idêntico ao da auditoria anterior (holdings-redesign não adicionou nenhuma dependência nova). Vulnerabilidade já registada como B-01 em `SECURITY_FINDINGS.md`. Sem acção viável — aguardar patch do Next.js.

## Novos achados

### B-10 — `select("*")` em `GET /api/portfolio/holdings`

| Campo | Valor |
|-------|-------|
| **ID** | B-10 |
| **Severidade** | Baixo |
| **Ficheiro** | `src/app/api/portfolio/holdings/route.ts:90` |
| **Problema** | `.select("*")` busca todas as colunas de `portfolio_positions`, incluindo campos que não são retornados ao cliente (ex: `notes`, futuros campos internos). Aumenta a superfície de exposição de dados e pode retornar colunas desnecessárias à medida que o schema evolui. Padrão idêntico ao B-07 nas routes do dashboard. |
| **Mitigação actual** | RLS + `.eq("user_id", user.id)` garantem isolamento de dados entre utilizadores. Sem risco imediato. |
| **Recomendação** | Substituir por `select("id, ticker, name, asset_type, chart_var, quantity, currency, avg_price, current_price, sold")` na Fase 2, quando os campos necessários estiverem estabilizados. |

---

### B-11 — `(supabase as any)` em `GET /api/portfolio/holdings`

| Campo | Valor |
|-------|-------|
| **ID** | B-11 |
| **Severidade** | Baixo |
| **Ficheiro** | `src/app/api/portfolio/holdings/route.ts:88` |
| **Problema** | `(supabase as any)` contorna o type checking do TypeScript para os campos `sold` e `chart_var` recém-adicionados à tabela (campos não presentes nos tipos gerados anteriormente). Não é um bypass de segurança — `.eq("user_id", user.id)` e RLS continuam activos — mas pode mascarar erros de schema em tempo de compilação. Padrão idêntico ao B-08. |
| **Mitigação actual** | Tipos foram regenerados (`supabase gen types typescript --local`) no mesmo ciclo; o cast é temporário até os tipos propagarem. |
| **Recomendação** | Regenerar os tipos (`npx supabase gen types typescript --local > src/types/database.ts`) e remover o cast na próxima oportunidade. |

## SECURITY_FINDINGS.md

Actualizado com os novos achados B-10 e B-11. Nenhum achado anterior foi resolvido por esta feature. O resumo de estado foi actualizado para reflectir 11 achados baixos abertos.
