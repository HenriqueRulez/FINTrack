# Relatório de Segurança — Tax Calculator

**Engineer Report:** `.claude/reports/engineer-tax-calculator.md`
**Working Item:** `.claude/working-items/tax-calculator.md`
**SECURITY_FINDINGS.md:** actualizado ✅

## Ficheiros Auditados
- `src/lib/supabase/middleware.ts` (modificado — `"/tax-calculator"` adicionado ao array `PROTECTED`)
- `src/app/(dashboard)/tax-calculator/page.tsx` (novo — Server Component stub)
- `src/components/tax-calculator/mock-data.ts` (novo — dados mock + matemática pura)
- `src/components/tax-calculator/TaxCalculatorPage.tsx` (novo — Client root)
- `src/components/tax-calculator/TaxKpiStrip.tsx` (novo — Client)
- `src/components/tax-calculator/CapitalGainsPanel.tsx` (novo — Client)
- `src/components/tax-calculator/DividendTaxPanel.tsx` (novo — Client)
- `src/components/tax-calculator/TaxPageHead.tsx` (novo — Client)
- `src/components/tax-calculator/TaxTweaksPanel.tsx` (novo — Client)
- `src/components/tax-calculator/TaxEmptyState.tsx` (novo — sem directiva, importável por client)

## Resultados das Verificações Automáticas

| Verificação | Resultado |
|-------------|-----------|
| Secrets expostos em client | ✅ Nenhum (`grep ANTHROPIC_API_KEY\|SERVICE_ROLE_KEY src/app` → sem matches; `grep ... process.env` em `src/components/tax-calculator` → sem matches) |
| Routes sem auth.getUser | ✅ Nenhuma route nova ou em falta (`grep -rL auth.getUser src/app/api` → vazio). Feature não toca em nenhum API route. |
| Routes sem rateLimit | ✅ `grep -rL rateLimit src/app/api` → vazio |
| npm audit (high+critical) | ✅ Zero high/critical. Output: apenas 2 moderate (`postcss <8.5.10` GHSA-qx2v-qp2m-jg93 via `next`), já registado como B-01 e abaixo do threshold `--audit-level=high` |

### Evidência — fronteira servidor/cliente
- `grep "@/lib/(anthropic|yahoo-finance|supabase/server)"` em `src/components/tax-calculator` → **sem matches**. Nenhum Client Component importa código server-only.
- Imports reais (verificados um a um): só relativos (`./mock-data`, `./TaxEmptyState`, restantes subcomponentes), `react`, e `@/hooks/useAnimations` (hook client). Nenhuma fronteira violada.
- 6 ficheiros com `"use client"` (TaxCalculatorPage, TaxKpiStrip, CapitalGainsPanel, DividendTaxPanel, TaxPageHead, TaxTweaksPanel). `mock-data.ts` e `TaxEmptyState.tsx` não têm directiva mas são puros (dados/tipos/JSX), seguros em qualquer fronteira.
- `page.tsx` é Server Component (sem `"use client"`), só monta o root client e exporta `metadata`. Correcto.

### Evidência — sinks de injecção / rede
- `grep "fetch\(|XMLHttpRequest|dangerouslySetInnerHTML|eval\(|innerHTML"` em `src/components/tax-calculator` → **sem matches**. Coerente com o requisito não-funcional "renderiza sem chamadas de rede".
- `mock-data.ts` lido na íntegra: dados hardcoded + funções puras determinísticas (`rateForHoldYears`, `fmtEUR`, `fmtDate`, `deriveCapitalGains`, `deriveDividendTax`). Sem I/O, sem `process.env`, sem código dinâmico.

### Evidência — protecção de rota (middleware)
- `PROTECTED` passou a incluir `"/tax-calculator"` (linha 4). Avaliação por `pathname.startsWith(r)` (linha 33); `if (isProtected && !user)` → redirect para `/passphrase` (linhas 35–39). Acesso sem sessão a `/tax-calculator` é bloqueado, consistente com as restantes rotas do dashboard.
- `glob src/app/**/tax*/**` → só `tax-calculator/page.tsx`. Nenhuma rota pública partilha o prefixo `/tax-calculator`, logo o match por prefixo não causa exposição nem bloqueio indevido nesta feature.

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
| B-12 | `src/lib/supabase/middleware.ts:33` | Protecção de rotas usa `pathname.startsWith(r)` (match por prefixo). Padrão pré-existente, não introduzido por esta feature. Para `/tax-calculator` não há sobreposição (verificado por glob — nenhuma rota pública com esse prefixo). | Negligível hoje. Tornar-se-ia um risco se no futuro existir uma rota pública cujo caminho comece por um prefixo protegido (ex.: `/settings-help`) — ficaria inadvertidamente atrás do gate, ou um prefixo curto deixaria passar paths inesperados. | Match exacto ou com fronteira de segmento: `pathname === r || pathname.startsWith(r + "/")`. |

## Achados Resolvidos nesta Feature
| ID anterior | Descrição | Resolvido por |
|------------|-----------|---------------|
| _Nenhum_ | — | — |

## Estado de SECURITY_FINDINGS.md após actualização
| Categoria | Abertos | Resolvidos | Aceites |
|-----------|---------|------------|---------|
| Crítico   | 0 | 0 | 0 |
| Alto      | 0 | 0 | 0 |
| Médio     | 3 | 0 | 0 |
| Baixo     | 12 | 0 | 1 |
| **Total** | **15** | **0** | **1** |

---

## Conclusão

Feature **aprovada** do ponto de vista de segurança. É uma feature Fase 1 puramente visual com dados mock client-side: zero API routes, zero acesso a DB, zero segredos, zero chamadas de rede. A única alteração de backend (adicionar `/tax-calculator` ao array `PROTECTED` do middleware) **melhora** a postura de segurança ao colocar a nova rota atrás do gate de passphrase. Único achado é informacional (B-12), relativo a um padrão pré-existente do middleware sem impacto nesta feature. `npm audit` sem vulnerabilidades high/critical novas.
