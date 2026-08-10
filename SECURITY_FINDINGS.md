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

### BAIXO / INFORMACIONAL

| ID | Arquivo | Problema | Feature de origem | Data |
|----|---------|----------|-------------------|------|
| B-03 | `src/lib/rate-limit.ts:14` | Rate limiter em memória sem purge de entradas expiradas — potencial memory leak (negligível para app pessoal) | Ticker Validation | 2026-05-23 |
| B-04 | `src/lib/yahoo-finance/client.ts:27` | Cache do Yahoo Finance sem limite de tamanho de entradas (mitigado pelo rate limit de 20 req/min no verify-ticker) | Ticker Validation | 2026-05-23 |
| B-05 | `src/lib/yahoo-finance/client.ts:45` | `historyCache` (Map) para dados históricos sem limite de entradas — memory leak potencial idêntico ao B-04. Negligível para app pessoal com <100 tickers | Portfolio Aggregated View | 2026-05-23 |
| B-06 | `src/lib/yahoo-finance/client.ts:104` | `console.error` em `getHistory` loga ticker + objecto de erro completo do Yahoo Finance (stack trace) nos logs do servidor. Risco baixo: ticker é validado por Zod, log é server-side | Portfolio Aggregated View | 2026-05-23 |
| B-09 | `src/hooks/useAnimations.ts:8`, `src/components/settings/AnimationsToggle.tsx:8` | `useState(true)` como valor inicial antes de ler localStorage — flash visual de animações durante hidratação SSR→client se utilizador as tiver desactivado. Sem impacto de segurança | Dashboard Visual Redesign | 2026-05-26 |
| B-14 | `src/lib/yahoo-finance/client.ts:199`, `client.ts:54` | Nova `getHistoryRange`: `console.error` loga ticker + objecto de erro completo do Yahoo (mesmo padrão do B-06) e `historyRangeCache` (Map) é acumulado sem limite de entradas (mesmo padrão do B-04/B-05). Server-side; ticker vem do ledger do próprio utilizador (não input arbitrário). Memory leak negligível para app pessoal | Etapa 3 AUDIT (portfólio derivado) | 2026-08-05 |
| B-16 | Processo — `supabase/migrations/0014_import_support.sql` aplicada ao Supabase **Cloud** via `yes \| npx supabase db push`, auto-confirmando o prompt interactivo e saltando a confirmação humana | A `0014` é **aditiva e reversível** (`ADD COLUMN` com default constante = metadata-only no PG11+; `CREATE UNIQUE INDEX` parcial) e não toca dados existentes, logo o risco técnico DESTA aplicação é baixo. O risco real é de **governança**: o mesmo padrão aplicado a uma migração destrutiva (DROP/ALTER TYPE/rewrite) ou ao ambiente errado remove o último gate humano antes de uma alteração irreversível em produção, sem checkpoint. Não reutilizar o auto-confirm para migrações não-aditivas; rever `supabase db diff`/dry-run e confirmar manualmente | CSV Import (Trading212) | 2026-08-06 |
| B-17 | `src/lib/validations/import.ts:15`, `src/app/api/transactions/import/route.ts:67` | DoS por payload: o cap de ~2MB do Zod (`.max` sobre o comprimento da string) só corre **depois** de `request.json()` já ter bufferizado o corpo inteiro em memória. Route Handlers do Next 15 não impõem limite de body por omissão, logo o cap NÃO limita a memória do parse do JSON — só limita o trabalho do `parseCsv` e o payload de BD. Mitigado: endpoint autenticado (app single-user — só o dono é principal) + rate limit 10/min. Parser é O(n) single-pass, sem ReDoS/backtracking, memória O(n) mesmo com input adversarial (aspas não fechadas, muitas colunas, newlines) dentro do cap | CSV Import (Trading212) | 2026-08-06 |

---

## Achados Aceites (risco reconhecido, sem acção)

| ID | Arquivo | Problema | Motivo de aceite | Data |
|----|---------|----------|------------------|------|
| A-01 | `src/app/(auth)/passphrase/page.tsx:57` | Mensagem "Palavra-passe incorrecta" confirma existência do utilizador (user enumeration) | App single-user por design — risco desprezível | 2026-05-23 |
| A-02 | `src/proxy.ts:15` | CSP com `style-src 'self' 'unsafe-inline'` — permite estilos inline, vector teórico de exfiltração via CSS injection | Necessário para o runtime do TailwindCSS v4 (injecta estilos inline); o resto do CSP é forte (script-src com nonce + strict-dynamic, object-src none, frame-ancestors none, HSTS via upgrade-insecure-requests). Sem input de utilizador renderizado como HTML/CSS não sanitizado. Achado M-04 do AUDIT. | 2026-08-05 |
| A-03 | `supabase/migrations/0013_price_cache.sql:38-48` | RLS permissiva em `price_cache`: policies `TO authenticated USING(true)/WITH CHECK(true)` sem `user_id` — qualquer utilizador autenticado pode INSERT/UPDATE/DELETE qualquer linha (cache poisoning: alterar preço/nome de um ticker afecta o valor de portfólio mostrado a todos, até ao TTL). SEM vazamento de dados de utilizador: tabela não tem `user_id` nem PII; preço/nome de ticker são dados de mercado PÚBLICOS. | Aceite por design: app single-user (o único principal autenticado é o dono → poisoning é auto-infligido). Impacto adicional bounded: TTL de 15 min regenera a linha no próximo fetch ao Yahoo, CHECKs validam a linha (`price>0`, tamanhos de `currency`/`name`/`ticker`), GRANT só a `authenticated` (nada a `anon`). Restringir writes ao nível de RLS exigiria caminho de escrita via `service_role` (mudança arquitectural), sem ganho para app single-user. | 2026-08-06 |
| M-04 | `src/lib/rate-limit.ts:12-14`, `src/app/api/auth/login/route.ts:17` | Rate limit anti-brute-force do login é um `Map` em MEMÓRIA. Em serverless/multi-instância seria por-instância, não global → contornável. Após FIN-8, é a defesa central de um login cujo único segredo é a passphrase. | **Aceite ENQUANTO o deploy for local / instância única** (decisão do dono, FIN-10, 2026-08-10: app ainda não deployada). Nesse modelo o `Map` é global ao processo → o limite funciona como esperado. **Reavaliar OBRIGATORIAMENTE se deployar em serverless/multi-instância** (ex.: Vercel): aí o limite passa a ser por-instância e a opção Upstash/Supabase-backed (FIN-10) deve ser reaberta. Mitigação real entretanto: força da passphrase. Distinto do B-03 (memory leak do purge, não a eficácia do limite). | 2026-08-10 |

---

## Achados Resolvidos

| ID | Arquivo (original) | Problema | Resolvido por | Data |
|----|--------------------|----------|---------------|------|
| M-01 | `src/app/(auth)/passphrase/page.tsx:21` | Email `owner@fintrack.local` hardcoded no bundle do browser — reduz o ataque à só a password | BUG-1/FIN-8 — auth movido para server-side: nova rota `POST /api/auth/login` (rate limit + Zod + server client) lê o email de env server-only `AUTH_OWNER_EMAIL`; o Client Component passou a fazer `fetch` sem email. `grep "owner@fintrack" src/` já não retorna nenhum Client Component | 2026-08-08 |
| M-02 | `src/components/portfolio/portfolio-client.tsx:45` | `body.error` da API logado em `console.error` | Delete da página `/portfolio` — ficheiro removido (commit `4873021`) na sessão da feature Reformular Holdings (Fase 1) | 2026-06-09 |
| M-03 | `src/components/portfolio/portfolio-client.tsx:37,56` | `id` em URLs de PATCH/DELETE sem `encodeURIComponent` | Delete da página `/portfolio` — componente e rotas PATCH/DELETE removidos (commit `4873021`) | 2026-06-09 |
| B-02 | `src/components/portfolio/portfolio-client.tsx:27` | `console.error` expõe stack trace na consola do browser | Delete da página `/portfolio` — ficheiro removido (commit `4873021`) | 2026-06-09 |
| B-07 | `src/app/api/portfolio/summary/route.ts`, `chart/route.ts`, `movers/route.ts` | `select("*")` em `portfolio_positions` nas 3 routes | Etapa 3 AUDIT — routes reescritas para derivar de `transactions` com selecção explícita (`LEDGER_COLUMNS`); `portfolio_positions` DROPPED (migration `0012`, commit `973bcc0`) | 2026-08-05 |
| B-08 | `src/app/api/portfolio/summary/route.ts`, `chart/route.ts`, `movers/route.ts` | `(supabase as any)` type cast nas 3 routes | Etapa 3 AUDIT — cast removido na reescrita das routes (commit `973bcc0`) | 2026-08-05 |
| B-10 | `src/app/api/portfolio/holdings/route.ts:90` | `select("*")` em `portfolio_positions` | Etapa 3 AUDIT — route reescrita com selecção explícita (`LEDGER_COLUMNS`); tabela DROPPED (commit `973bcc0`) | 2026-08-05 |
| B-11 | `src/app/api/portfolio/holdings/route.ts:88` | `(supabase as any)` type cast | Etapa 3 AUDIT — cast removido na reescrita da route (commit `973bcc0`) | 2026-08-05 |
| B-01 | `next` (dependência transitiva) | `postcss@8.4.31` interno do Next.js — GHSA-qx2v-qp2m-jg93 (XSS build-time) | Patch do Next.js — `npm audit` (full) reporta **0 vulnerabilidades**; verificado na auditoria da feature CSV Import | 2026-08-06 |
| B-12 | `src/lib/supabase/middleware.ts:33` | Protecção de rotas usava `pathname.startsWith(r)` (match por prefixo puro, frágil a `/settings-public` vs `/settings`) | Match por fronteira de segmento (`pathname === r \|\| pathname.startsWith(r + "/")`) implementado no commit `7413266` (AUDIT M-02). **NÃO** resolvido pela transactions-redesign; correcção de entrada obsoleta do ledger, verificada nesta auditoria (código actual em `middleware.ts:35-37`) | 2026-08-05 |
| B-13 | `src/app/(dashboard)/dashboard/page.tsx:119`, `api/portfolio/{holdings:96,summary:58,movers:44,chart:57,performance:84}/route.ts` | Double-cast `(data ?? []) as unknown as TransactionRow[]` no `.select()` do ledger em 6 ficheiros | FIN-7/TD-6 — verificado que os double-casts JÁ NÃO existem no código actual: os 6 locais usam agora a anotação `const rows: TransactionRow[] = data ?? []` (o read do ssr infere `never[]`, atribuível ao tipo alvo — sem `as unknown as`). Substituição feita em refactor anterior; FIN-7 confirmou a ausência e alinhou o padrão | 2026-08-08 |
| B-15 | `src/lib/portfolio/prices.ts:106` (write) | Higiene de tipos: `(supabase as any)` no `upsert` de `price_cache`. NÃO era bypass — RLS activo + GRANT só a `authenticated`. Parte de leitura já resolvida em FIN-7/TD-6; a causa raiz do cast de escrita era a incompat. `@supabase/ssr@0.6.1` × `@supabase/supabase-js@2.112.1` (Schema colapsava para `never`) | TD-7/FIN-9 — bump `@supabase/ssr` 0.6.1→0.12.4 (peer `^2.111.0`, satisfeita por 2.112.1) restaura a assinatura de genéricos correcta; o `upsert` tipa nativamente com `Database`; cast+eslint-disable removidos; `tsc` verde. `grep "supabase as any" src` = 0 ocorrências | 2026-08-10 |
| B-18 | `src/app/api/transactions/import/route.ts:201` (+ `api/transactions/route.ts:160` insert, `api/transactions/[id]/route.ts:186` update, não rastreados por finding próprio) | Higiene de tipos: `(supabase as any)` nos writes do ledger. NÃO era bypass — `user_id` da sessão, RLS activo, postgrest parametrizado. Mesma causa raiz do B-15 (write): incompat. `@supabase/ssr@0.6.1` × `supabase-js@2.112.1` | TD-7/FIN-9 — bump `@supabase/ssr` 0.6.1→0.12.4; os 3 writes (`insert` do import, `insert` do POST, `update` do PATCH) tipam nativamente com `TablesInsert`/`TablesUpdate`; casts+eslint-disable removidos; `tsc`/`lint` verdes; `grep` = 0 ocorrências. Lógica de segurança à volta intacta (auth→rateLimit→Zod→user_id da sessão) | 2026-08-10 |

---

## Auditorias sem novos achados

| Feature | Ficheiros auditados | Resultado | Data |
|---------|---------------------|-----------|------|
| logout-settings-page (TD-3 / FIN-4) | `src/components/settings/logout-button.tsx`, `src/app/(dashboard)/settings/page.tsx` (contexto: `src/lib/auth.ts`, `src/lib/supabase/client.ts`) | **Zero achados.** Client Component sem imports server-only, usa `client.ts` (só `NEXT_PUBLIC_*`); página protegida por `requireUser()` (usa `getUser()`, redirect p/ `/passphrase`); `user.email`/`user.id` mostrados só ao próprio dono autenticado (single-user); sem XSS sinks, sem secrets. `npm audit` (job CI "Security audit") = `success` | 2026-08-08 |

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
| Médio     | 0       | 3          | 1       |
| Baixo     | 8       | 10         | 3       |
| **Total** | **8**   | **13**     | **4**   |
