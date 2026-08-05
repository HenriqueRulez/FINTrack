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
| B-09 | `src/hooks/useAnimations.ts:8`, `src/components/settings/AnimationsToggle.tsx:8` | `useState(true)` como valor inicial antes de ler localStorage — flash visual de animações durante hidratação SSR→client se utilizador as tiver desactivado. Sem impacto de segurança | Dashboard Visual Redesign | 2026-05-26 |
| B-12 | `src/lib/supabase/middleware.ts:33` | Protecção de rotas usa `pathname.startsWith(r)` — um match por prefixo. Para `/tax-calculator` não há sobreposição (nenhuma rota pública partilha o prefixo), mas o padrão é frágil se no futuro existir uma rota pública cujo caminho comece por um prefixo protegido (ex.: `/settings-public`). Recomenda-se match exacto ou com fronteira de segmento (`=== r || startsWith(r + "/")`). Risco actual negligível — registado como informacional, não introduzido por esta feature | Tax Calculator | 2026-06-03 |
| B-13 | `src/app/(dashboard)/dashboard/page.tsx:119`, `api/portfolio/{holdings:96,summary:58,movers:44,chart:57,performance:84}/route.ts` | Double-cast `(data ?? []) as unknown as TransactionRow[]` no resultado do `.select()` do ledger em 6 ficheiros — contorna a inferência de tipos do Supabase e pode mascarar drift de schema em compile time. NÃO é bypass de segurança (RLS de `transactions` + `.eq("user_id", user.id)` activos). Sucessor higiénico do B-08/B-11; resolver regenerando `database.ts` e tipando o retorno | Etapa 3 AUDIT (portfólio derivado) | 2026-08-05 |
| B-14 | `src/lib/yahoo-finance/client.ts:199`, `client.ts:54` | Nova `getHistoryRange`: `console.error` loga ticker + objecto de erro completo do Yahoo (mesmo padrão do B-06) e `historyRangeCache` (Map) é acumulado sem limite de entradas (mesmo padrão do B-04/B-05). Server-side; ticker vem do ledger do próprio utilizador (não input arbitrário). Memory leak negligível para app pessoal | Etapa 3 AUDIT (portfólio derivado) | 2026-08-05 |

---

## Achados Aceites (risco reconhecido, sem acção)

| ID | Arquivo | Problema | Motivo de aceite | Data |
|----|---------|----------|------------------|------|
| A-01 | `src/app/(auth)/passphrase/page.tsx:57` | Mensagem "Palavra-passe incorrecta" confirma existência do utilizador (user enumeration) | App single-user por design — risco desprezível | 2026-05-23 |
| A-02 | `src/proxy.ts:15` | CSP com `style-src 'self' 'unsafe-inline'` — permite estilos inline, vector teórico de exfiltração via CSS injection | Necessário para o runtime do TailwindCSS v4 (injecta estilos inline); o resto do CSP é forte (script-src com nonce + strict-dynamic, object-src none, frame-ancestors none, HSTS via upgrade-insecure-requests). Sem input de utilizador renderizado como HTML/CSS não sanitizado. Achado M-04 do AUDIT. | 2026-08-05 |

---

## Achados Resolvidos

| ID | Arquivo (original) | Problema | Resolvido por | Data |
|----|--------------------|----------|---------------|------|
| M-02 | `src/components/portfolio/portfolio-client.tsx:45` | `body.error` da API logado em `console.error` | Delete da página `/portfolio` — ficheiro removido (commit `4873021`) na sessão da feature Reformular Holdings (Fase 1) | 2026-06-09 |
| M-03 | `src/components/portfolio/portfolio-client.tsx:37,56` | `id` em URLs de PATCH/DELETE sem `encodeURIComponent` | Delete da página `/portfolio` — componente e rotas PATCH/DELETE removidos (commit `4873021`) | 2026-06-09 |
| B-02 | `src/components/portfolio/portfolio-client.tsx:27` | `console.error` expõe stack trace na consola do browser | Delete da página `/portfolio` — ficheiro removido (commit `4873021`) | 2026-06-09 |
| B-07 | `src/app/api/portfolio/summary/route.ts`, `chart/route.ts`, `movers/route.ts` | `select("*")` em `portfolio_positions` nas 3 routes | Etapa 3 AUDIT — routes reescritas para derivar de `transactions` com selecção explícita (`LEDGER_COLUMNS`); `portfolio_positions` DROPPED (migration `0012`, commit `973bcc0`) | 2026-08-05 |
| B-08 | `src/app/api/portfolio/summary/route.ts`, `chart/route.ts`, `movers/route.ts` | `(supabase as any)` type cast nas 3 routes | Etapa 3 AUDIT — cast removido na reescrita das routes (commit `973bcc0`) | 2026-08-05 |
| B-10 | `src/app/api/portfolio/holdings/route.ts:90` | `select("*")` em `portfolio_positions` | Etapa 3 AUDIT — route reescrita com selecção explícita (`LEDGER_COLUMNS`); tabela DROPPED (commit `973bcc0`) | 2026-08-05 |
| B-11 | `src/app/api/portfolio/holdings/route.ts:88` | `(supabase as any)` type cast | Etapa 3 AUDIT — cast removido na reescrita da route (commit `973bcc0`) | 2026-08-05 |

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
| Baixo     | 9       | 5          | 2       |
| **Total** | **10**  | **7**      | **2**   |
