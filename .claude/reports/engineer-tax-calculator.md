# Relatório de Implementação — Tax Calculator

**Plano:** `.claude/tasks/tax-calculator.md`
**Working Item:** `.claude/working-items/tax-calculator.md`
**Typecheck:** ✅ Zero erros (`tsc --noEmit` — sem qualquer output além do banner do script)
**Lint:** ✅ Zero warnings/erros (`eslint src` — sem qualquer output além do banner do script)
**Migration:** N/A — feature 100% mock client-side nesta fase; sem schema, sem SQL, sem persistência (confirmado no plano do SM e no working item).

## Ficheiros Criados
- Nenhum. (Toda a UI já foi criada pelo Frontend; o Engineer só tinha o gap de protecção de rota.)

## Ficheiros Modificados
- `src/lib/supabase/middleware.ts` — adicionado `"/tax-calculator"` ao array `PROTECTED` (linha 4). O array é avaliado com `pathname.startsWith(r)` (linha 33), logo qualquer acesso sem sessão activa a `/tax-calculator` passa a ser redireccionado para `/passphrase`, consistente com `/dashboard`, `/portfolio`, `/holdings`, `/performance`, `/transactions`, `/settings`. Nenhuma outra alteração no ficheiro.

## Tarefas Implementadas
- [x] T1 — Proteger a rota `/tax-calculator` no middleware (CA-09)
- [x] T2 — Verificação final (typecheck + lint + verificação factual dos valores derivados e do mounting da rota)

## Evidência factual recolhida

### T1 — Protecção de rota
Antes da alteração (lido em `middleware.ts:4`):
```ts
const PROTECTED = ["/dashboard", "/portfolio", "/settings", "/holdings", "/performance", "/transactions"];
```
Depois:
```ts
const PROTECTED = ["/dashboard", "/portfolio", "/settings", "/holdings", "/performance", "/transactions", "/tax-calculator"];
```
O bloco de redirect (linhas 35–39) já existia e não foi tocado: `if (isProtected && !user)` → redireccionar para `/passphrase`.

### T2 — Typecheck + Lint
- `npm run typecheck` → `tsc --noEmit` terminou sem qualquer erro (exit 0, apenas o banner do npm script).
- `npm run lint` → `eslint src` terminou sem qualquer warning/erro (exit 0, apenas o banner do npm script).

### T2 — Verificação dos valores derivados (matemática pura de `mock-data.ts`)
Reexecutei a matemática fiscal (mesmos defaults `tiered`, mesmos `SAMPLE_EVENTS_2026`) em Node e o output bate ao cêntimo com o working item:
```
proceeds 5559.77  cost 5190.00  gain 369.77
CG tax 207.57  Div tax 11.59  Total 219.16  NetDiv 29.81
```
Correspondência exacta:
- Total proceeds €5,559.77 / Total cost €5,190.00 / Net realised gain +€369.77
- Capital Gains Tax €207.57 | Dividend Tax €11.59 | Total Estimated Tax Liability €219.16
- Net dividend income €29.81 (Total dividends +€41.40 − €11.59)

`mock-data.ts` (lido) confirma: `SAMPLE_EVENTS_2026`, `TAX_SETTINGS` (tiers 28/25.2/22.4/19.6, dividendRate 28, method `tiered`), `rateForHoldYears`, `fmtEUR` (en-GB, sinal `−` U+2212, `+` quando `signed` e >0, `€0.00` para null/NaN), `fmtDate` (YYYY-MM-DD → DD/MM/YYYY) — todos fiéis ao working item.

### T2 — Mounting da rota
`src/app/(dashboard)/tax-calculator/page.tsx` (lido) é Server Component stub: importa e monta `<TaxCalculatorPage />` e exporta `metadata.title = "Tax Calculator — FINTrack"`. Sem `'use client'`, sem import de `@/lib/anthropic` / `@/lib/yahoo-finance` / `@/lib/supabase/server` — fronteira servidor/cliente correcta.

## Nota sobre o smoke test no browser (T2)
O plano do SM previa, em T2, arrancar `npm run dev` e observar a página no browser (KPIs €0.00 com sample OFF; €219.16/€207.57/€11.59 com ON + ano 2026; redirect sem sessão). Não executei o arranque do servidor nem a navegação no browser a partir deste agente — a verificação dinâmica em browser real é a responsabilidade do agente QA (`.claude/reports/qa-tax-calculator.md`), que corre a seguir na pipeline. O que verifiquei factualmente aqui: (a) typecheck e lint limpos após a alteração; (b) a matemática que alimenta os KPIs/painéis produz exactamente os valores esperados; (c) o middleware passa a proteger a rota; (d) o page.tsx monta o componente client correcto. Declaro explicitamente que a prova visual em runtime (render dos cartões, toggle Show sample data, redirect efectivo para `/passphrase`) fica por confirmar pelo QA — não a afirmo como concluída.

## Notas para o QA
- Único ponto de lógica desta fase: protecção de rota no middleware. Validar CA-09 acedendo a `/tax-calculator` sem sessão activa → deve redireccionar para `/passphrase`; com sessão activa → carrega a página.
- Estado inicial (default): "Show sample data" OFF → 3 KPIs em €0.00, sub-textos "From 0 sale events" / "From 0 dividend events", sem `neon-loss`; ambos os painéis em estado vazio com o texto por ano.
- Show sample data ON + ano 2026 → KPIs €219.16 / €207.57 / €11.59 (tolerância ao cêntimo, já confirmada por cálculo acima). Anos 2025 e 2024 mostram estado vazio mesmo com sample ON (só há mock para 2026).
- Estado partilhado `cgView` liga o `SegSelector` do painel Capital Gains ao radio do TweaksPanel — mudar num reflecte no outro (CA-08).
- Toda a feature é mock client-side: nenhuma chamada de rede esperada ao carregar a página (requisito não-funcional).
