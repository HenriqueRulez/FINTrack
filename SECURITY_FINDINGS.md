# FINTrack — Security Findings

> Registo acumulado de todos os achados de segurança encontrados nas auditorias do pipeline.
> O Security Reviewer deve actualizar este ficheiro a cada ciclo de desenvolvimento.
> Relatórios completos em `.claude/reports/security-*.md`.

---

## Como usar este ficheiro

- **Aberto** — achado identificado, ainda não corrigido
- **Resolvido** — corrigido e verificado numa auditoria posterior
- **Aceite** — risco reconhecido e aceite conscientemente (ex: limitação de design, sem acção viável)

Ao fechar um achado, adicionar: `→ Resolvido em: [nome da feature] (YYYY-MM-DD)`

---

## Achados Abertos

### MÉDIO

| ID | Arquivo | Problema | Feature de origem | Data |
|----|---------|----------|-------------------|------|
| M-01 | `src/app/(auth)/passphrase/page.tsx:21` | Email `owner@fintrack.local` hardcoded no bundle do browser — reduz o ataque à só a password | Dark Mode Visual Fix | 2026-05-23 |

### BAIXO / INFORMACIONAL

| ID | Arquivo | Problema | Feature de origem | Data |
|----|---------|----------|-------------------|------|
| B-01 | `next` (dependência transitiva) | `postcss@8.4.31` interno do Next.js — GHSA-qx2v-qp2m-jg93 (XSS build-time). Sem acção viável — aguardar patch do Next.js | Dark Mode Visual Fix | 2026-05-23 |
| B-03 | `src/lib/rate-limit.ts:14` | Rate limiter em memória sem purge de entradas expiradas — potencial memory leak (negligível para app pessoal) | Ticker Validation | 2026-05-23 |
| B-04 | `src/lib/yahoo-finance/client.ts:27` | Cache do Yahoo Finance sem limite de tamanho de entradas (mitigado pelo rate limit de 20 req/min no verify-ticker) | Ticker Validation | 2026-05-23 |
| B-05 | `src/lib/yahoo-finance/client.ts:45` | `historyCache` (Map) para dados históricos sem limite de entradas — memory leak potencial idêntico ao B-04. Negligível para app pessoal com <100 tickers | Portfolio Aggregated View | 2026-05-23 |
| B-06 | `src/lib/yahoo-finance/client.ts:104` | `console.error` em `getHistory` loga ticker + objecto de erro completo do Yahoo Finance (stack trace) nos logs do servidor. Risco baixo: ticker é validado por Zod, log é server-side | Portfolio Aggregated View | 2026-05-23 |
| B-07 | `src/app/api/portfolio/summary/route.ts:53`, `chart/route.ts:73`, `movers/route.ts:35` | `select("*")` nas 3 novas routes — busca todas as colunas de `portfolio_positions`; expõe campos desnecessários e aumenta superfície de risco para colunas futuras | Dashboard Visual Redesign | 2026-05-26 |
| B-08 | `src/app/api/portfolio/summary/route.ts:51`, `chart/route.ts:71`, `movers/route.ts:33` | `(supabase as any)` type cast nas 3 novas routes — contorna type checking; não é bypass de segurança (`.eq("user_id", user.id)` + RLS activos) mas pode mascarar erros de schema em compile time | Dashboard Visual Redesign | 2026-05-26 |
| B-09 | `src/hooks/useAnimations.ts:8`, `src/components/settings/AnimationsToggle.tsx:8` | `useState(true)` como valor inicial antes de ler localStorage — flash visual de animações durante hidratação SSR→client se utilizador as tiver desactivado. Sem impacto de segurança | Dashboard Visual Redesign | 2026-05-26 |
| B-10 | `src/app/api/portfolio/holdings/route.ts:90` | `select("*")` busca todas as colunas de `portfolio_positions`, incluindo campos não retornados ao cliente. Padrão idêntico ao B-07 — mitigado por RLS + filtro por `user_id`. Recomenda-se selecção explícita de colunas na Fase 2 | Holdings Redesign | 2026-05-27 |
| B-11 | `src/app/api/portfolio/holdings/route.ts:88` | `(supabase as any)` type cast para acomodar campos `sold`/`chart_var` recém-adicionados. Não é bypass de segurança (RLS activo); pode mascarar erros de schema. Padrão idêntico ao B-08. Resolver após regenerar tipos | Holdings Redesign | 2026-05-27 |
| B-12 | `src/lib/supabase/middleware.ts:33` | Protecção de rotas usa `pathname.startsWith(r)` — um match por prefixo. Para `/tax-calculator` não há sobreposição (nenhuma rota pública partilha o prefixo), mas o padrão é frágil se no futuro existir uma rota pública cujo caminho comece por um prefixo protegido (ex.: `/settings-public`). Recomenda-se match exacto ou com fronteira de segmento (`=== r || startsWith(r + "/")`). Risco actual negligível — registado como informacional, não introduzido por esta feature | Tax Calculator | 2026-06-03 |

---

## Achados Aceites (risco reconhecido, sem acção)

| ID | Arquivo | Problema | Motivo de aceite | Data |
|----|---------|----------|------------------|------|
| A-01 | `src/app/(auth)/passphrase/page.tsx:57` | Mensagem "Palavra-passe incorrecta" confirma existência do utilizador (user enumeration) | App single-user por design — risco desprezível | 2026-05-23 |

---

## Achados Resolvidos

| ID | Arquivo (original) | Problema | Resolvido por | Data |
|----|--------------------|----------|---------------|------|
| M-02 | `src/components/portfolio/portfolio-client.tsx:45` | `body.error` da API logado em `console.error` | Delete da página `/portfolio` — ficheiro removido (commit `4873021`) na sessão da feature Reformular Holdings (Fase 1) | 2026-06-09 |
| M-03 | `src/components/portfolio/portfolio-client.tsx:37,56` | `id` em URLs de PATCH/DELETE sem `encodeURIComponent` | Delete da página `/portfolio` — componente e rotas PATCH/DELETE removidos (commit `4873021`) | 2026-06-09 |
| B-02 | `src/components/portfolio/portfolio-client.tsx:27` | `console.error` expõe stack trace na consola do browser | Delete da página `/portfolio` — ficheiro removido (commit `4873021`) | 2026-06-09 |

---

## Instruções para o Security Reviewer

A cada ciclo de desenvolvimento, após a auditoria:

1. **Adicionar novos achados** nas tabelas acima com o ID sequencial correcto (M-XX, B-XX, A-XX)
2. **Verificar se algum achado aberto foi resolvido** pela feature actual — se sim, mover para "Resolvidos" com a data e feature
3. **Não duplicar** — verificar se o achado já existe antes de adicionar
4. **Relatório completo** continua a ser guardado em `.claude/reports/security-[feature].md`

---

## Resumo de Estado

| Categoria | Abertos | Resolvidos | Aceites |
|-----------|---------|------------|---------|
| Crítico   | 0       | 0          | 0       |
| Alto      | 0       | 0          | 0       |
| Médio     | 1       | 2          | 0       |
| Baixo     | 11      | 1          | 1       |
| **Total** | **12**  | **3**      | **1**   |
