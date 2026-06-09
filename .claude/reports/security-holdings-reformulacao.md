# Relatório de Segurança — Reformular página de Holdings (Fase 1 — visual/mock)

**Engineer Report:** N/A — feature puramente frontend, sem fase SM/Engineer
**Working Item:** `.claude/working-items/reformular-pagina-holdings.md`
**SECURITY_FINDINGS.md:** actualizado ✅

## Veredito

**APROVADO** — zero achados novos. A feature é 100% frontend sobre dados mock, sem API, sem persistência, sem input persistido, sem fontes externas de imagens e sem imports server-only em código client. O delete da `/portfolio` foi verificado e está limpo (sem rotas órfãs, sem refs quebradas, sem endpoints desprotegidos), tendo inclusive resolvido 3 achados abertos.

## Ficheiros Auditados

NOVOS:
- `src/components/holdings/CompanyCell.tsx`
- `src/components/holdings/TypeBadge.tsx`
- `src/components/holdings/AddPositionModal.tsx`

MODIFICADOS:
- `src/components/holdings/mock-data.ts`
- `src/components/holdings/HoldingsTable.tsx`
- `src/components/holdings/HoldingsCard.tsx`

VERIFICADOS (impacto do delete `/portfolio`):
- `src/lib/supabase/middleware.ts`
- `src/app/api/portfolio/route.ts` (+ chart, history, holdings, movers, summary, verify-ticker)

## Resultados das Verificações Automáticas

| Verificação                | Resultado                                   |
| -------------------------- | ------------------------------------------- |
| Secrets expostos em client | ✅ Nenhum (scope holdings)                  |
| Routes sem auth.getUser    | ✅ Todas as 7 rotas preservadas protegidas  |
| Routes sem rateLimit       | ✅ Todas as 7 rotas com rate limit          |
| npm audit (high+critical)  | ✅ Zero (2 moderate pré-existentes — B-01)  |
| Server-only imports em client | ✅ Nenhum (anthropic/yahoo-finance/server) |
| XSS (dangerouslySetInnerHTML) | ✅ Nenhum                                |
| Refs órfãs a `/portfolio` page | ✅ Nenhuma                              |

## Análise de Segurança por Ficheiro

**CompanyCell.tsx** — Renderiza `holding.ticker`, `holding.exchange`, `holding.name` via interpolação JSX (auto-escaped pelo React). Ícone é placeholder local (`ticker.slice(0,1)`), sem `<img>` nem fonte externa — cumpre o RNF de não carregar imagens externas. Sem XSS.

**TypeBadge.tsx** — Mapeamento estático `AssetClass → label`. Sem dados dinâmicos, sem risco.

**AddPositionModal.tsx** — Modal visual. Ambos os botões (Cancel / Add position) chamam `handleClose()` — não há submit, fetch, nem persistência. Estado local (`currency`, `assetType`) reset no fecho. Inputs sem `name`/form action. Cumpre CA11/CA15 (sem persistência). Comentário TODO documenta wiring futuro para `POST /api/holdings` — quando implementado, será objecto de nova auditoria (auth + rate-limit + Zod).

**mock-data.ts** — Apenas dados mock estáticos + utilitários de formatação (`Intl.NumberFormat`). Campo `exchange` adicionado como string literal. Sem input externo.

**HoldingsTable.tsx / HoldingsCard.tsx** — Render de mock via JSX escaped. `HoldingsCard.handleRefresh()` faz `fetch("/api/portfolio")` (GET) — endpoint preservado, protegido por auth + rate-limit; erro é silenciado (`catch {}`) sem expor dados.

## Verificação do delete da `/portfolio`

- (a) **Rotas órfãs expostas:** Nenhuma. `src/app/api/portfolio/` contém apenas GETs (`route.ts`, chart, history, holdings, movers, summary, verify-ticker). Subrota `[id]` (PATCH/DELETE) e o POST removidos.
- (b) **Refs quebradas a auth:** Nenhuma. `src/components/portfolio/` foi completamente removido; nenhuma ref a `/portfolio` (page) no código.
- (c) **Endpoints sem protecção:** Nenhum. Todas as 7 rotas preservadas têm `supabase.auth.getUser()` como 1ª operação + `rateLimit()` + retorno 401. `route.ts` GET segue o pattern canónico do CLAUDE.md.
- **Middleware:** `/portfolio` removido de `PROTECTED`; rotas válidas (`/dashboard`, `/settings`, `/holdings`, `/performance`, `/transactions`, `/tax-calculator`) mantidas. Sem regressão.

## Achados desta Feature

### CRÍTICO
_Nenhum._

### ALTO
_Nenhum._

### MÉDIO
_Nenhum._

### BAIXO / INFORMACIONAL
_Nenhum._

## Achados Resolvidos nesta Sessão (pelo delete da `/portfolio`)

| ID anterior | Descrição | Resolvido por |
| ----------- | --------- | ------------- |
| M-02 | `body.error` da API logado em `console.error` em `portfolio-client.tsx` | Ficheiro removido (commit `4873021`) |
| M-03 | `id` em URLs PATCH/DELETE sem `encodeURIComponent` | Componente + rotas PATCH/DELETE removidos (commit `4873021`) |
| B-02 | `console.error` expõe stack trace no browser em `portfolio-client.tsx` | Ficheiro removido (commit `4873021`) |

## Achados Pré-existentes que se Mantêm Abertos

- **M-01** — passphrase page (não tocada).
- **B-07 / B-08** — `summary/chart/movers` routes: rotas preservadas, achados continuam válidos.
- **B-10 / B-11** — `holdings/route.ts`: rota preservada, achados continuam válidos.
- **B-12** — match por prefixo no middleware: continua válido (informacional).
- **B-01, B-03–B-06** — dependências / rate-limit / yahoo-finance: inalterados.

## Estado de SECURITY_FINDINGS.md após actualização

| Categoria | Abertos | Resolvidos | Aceites |
| --------- | ------- | ---------- | ------- |
| Crítico   | 0       | 0          | 0       |
| Alto      | 0       | 0          | 0       |
| Médio     | 1       | 2          | 0       |
| Baixo     | 11      | 1          | 1       |
| **Total** | **12**  | **3**      | **1**   |
