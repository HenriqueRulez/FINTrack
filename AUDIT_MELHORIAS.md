# FINTrack — Auditoria de Segurança e Correção Financeira

> **Data:** 2026-08-04 · **Auditor:** Fable 5 · **Executor previsto:** Opus
> **Escopo:** app principal (`src/app`, `src/lib`, `src/components`, `supabase/`). O sandbox `/projeto-fable-5` foi excluído da auditoria funcional por instrução do dono, **mas os seus restos criam riscos no app principal — ver C-02**.
>
> Cada item diz **o problema**, **a prova (ficheiro:linha)** e **o que fazer**. Ordem de execução recomendada no fim.

---

## CRÍTICOS — Segurança

### C-01 · Passphrase default `fintrack` semeada na migration, sem forma de trocar

> **Status 2026-08-05: RESOLVIDO (decisão do dono).** Migrations 0004/0006 removidas — o owner é criado no Dashboard do Supabase Cloud com passphrase forte, e a passphrase troca-se no Dashboard (Authentication → Users → Reset password). O `fintrack` deixou de existir. A UI de mudança de passphrase dentro do app (item 1 abaixo) foi dispensada por agora: app single-user pessoal, reset via Dashboard é suficiente. Ver `MIGRACAO_SUPABASE_CLOUD.md`, Passos 3-4.

- **Prova:** `supabase/migrations/0004_owner_user.sql` cria `owner@fintrack.local` com password `fintrack` (bcrypt de valor conhecido, comentado no próprio ficheiro). A página `/settings` (`src/app/(dashboard)/settings/page.tsx`) não tem UI de mudança de passphrase — o comentário "change it in Settings after first login" aponta para uma feature que não existe.
- **Agravante:** o email do owner está hardcoded no bundle do browser (`src/app/(auth)/passphrase/page.tsx:21`, já registado como M-01 em `SECURITY_FINDINGS.md`), e a anon key do Supabase é pública por design — qualquer pessoa pode fazer brute-force **directamente no endpoint do GoTrue**, ignorando a UI. Não há lockout nem captcha.
- **O que fazer:**
  1. Criar UI de mudança de passphrase em `/settings` usando `supabase.auth.updateUser({ password })` (rota API autenticada, rate-limited, com validação de força mínima — ex.: ≥ 12 caracteres).
  2. Na migration (ou num script de setup), ler a passphrase inicial de uma env var (`OWNER_INITIAL_PASSPHRASE`) em vez de literal `'fintrack'`; falhar o setup se ausente.
  3. Configurar rate limits de auth do Supabase (GoTrue `RATE_LIMIT_*` no `config.toml`) e, se o app for exposto à internet, captcha do GoTrue.

### C-02 · Restos do sandbox: rotas API sem auth + RLS aberto a `anon` no mesmo deploy

> **Status 2026-08-04: RESOLVIDO (Opção A executada, decisão do dono).** Sandbox removido por completo — páginas, rotas `/api/fable5`, componentes, libs, migrations 0010/0011 e config Playwright. O motor de ledger foi preservado em `src/lib/portfolio/ledger.ts` (testes em `tests/unit/ledger.spec.ts`) para servir de base ao F-03. Detalhes em `MIGRACAO_SUPABASE_CLOUD.md`.

Mesmo "ignorando" o `/projeto-fable-5`, o código está **deployado junto com o app principal** e é atacável de forma independente:

- **Rotas sem autenticação com escrita no banco:** `src/app/api/fable5/transactions/route.ts` (GET/POST/DELETE), `.../transactions/[id]/route.ts` (PATCH/DELETE), `.../settings`, `.../portfolio`, `.../chart`, `.../assets/[ticker]` — nenhuma chama `auth.getUser()`.
- **RLS aberto:** `supabase/migrations/0010_fable5_schema.sql:51-56` e `0011_fable5_transactions.sql:74-76` — políticas `FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)` nas tabelas `f5_*`. Qualquer pessoa com a anon key (pública) lê/escreve essas tabelas mesmo sem passar pelas rotas.
- **Proxy não autenticado ao Yahoo Finance:** o POST de `/api/fable5/transactions` chama `getQuote()` com ticker arbitrário sem auth — abuso externo consome quota/billing do Yahoo em teu nome.
- **Rate limit contornável:** as rotas fable5 usam `x-forwarded-for` como chave (`clientIp()`), header controlado pelo cliente quando não há proxy confiável à frente.
- **Middleware não cobre o sandbox:** `src/lib/supabase/middleware.ts:4` — `/projeto-fable-5` não está em `PROTECTED`.
- **O que fazer (decidir explicitamente com o dono, depois executar):**
  - **Opção A (recomendada se o sandbox está morto):** apagar `src/app/projeto-fable-5/`, `src/app/api/fable5/`, `src/components/fable5/`, `src/lib/fable5/`, `tests/fable5/`, `playwright.fable5.config.ts`; nova migration a dropar `f5_positions`, `f5_price_cache`, `f5_settings`, `f5_assets`, `f5_transactions`.
  - **Opção B (se o código do sandbox vai ser promovido — ver F-03):** portar a lógica (`lib/fable5/ledger.ts` é bom) para o app principal **com auth + RLS por user_id**, e apagar o resto na mesma.
  - Em qualquer caso: nunca manter rotas de escrita sem auth num app com dados financeiros.

---

## CRÍTICOS — Correção Financeira

*(estamos a lidar com dinheiro; números errados são bugs críticos mesmo sem "falha de segurança")*

### F-01 · Mistura de moedas em TODOS os agregados de patrimônio

- **Problema:** posições têm `currency` (`EUR`/`USD`/`BRL`... — `0001_initial_schema.sql:59`), mas todos os cálculos somam `quantity × price` **sem converter**, e formatam o resultado como EUR:
  - `src/app/(dashboard)/dashboard/page.tsx:100-106` (totalValue/totalCost)
  - `src/app/api/portfolio/summary/route.ts:77-81`
  - `src/app/api/portfolio/holdings/route.ts:129-150` (market value, unrealized/realized P&L)
  - `src/app/api/portfolio/chart/route.ts:98-107` (série do gráfico)
- **Consequência:** com uma posição em USD e outra em EUR, o "patrimônio total" é aritmeticamente sem sentido. O seed actual tem posições GBP e USD — os números exibidos hoje já estão errados.
- **O que fazer:** definir moeda base (EUR); converter cada posição com fx à data (par Yahoo `USDEUR=X` etc., com cache — o padrão `captureFxToEur`/`getFxOnDate` do sandbox é um bom modelo); nunca somar valores de moedas diferentes sem conversão. Adicionar teste unitário que falhe se moedas forem misturadas.

### F-02 · Realized P&L é inventado

- **Prova:** `src/app/api/portfolio/holdings/route.ts:142-150` — comentário admite: usa `current_price` como *proxy* do preço de venda para posições `sold`. O P&L realizado exibido não corresponde a nenhuma venda real.
- **O que fazer:** calcular realized P&L a partir do ledger de transações (proceeds da venda − custo médio na data − fees), como o motor `lib/fable5/ledger.ts` (`applyTx`, método de custo médio) já faz correctamente. Depende de F-03.

### F-03 · Duas fontes de verdade que não se falam

- **Problema:** existem `transactions` (ledger buy/sell/cash/div — `0009_investment_ledger.sql`) e `portfolio_positions` (posições com `avg_price` mantido à mão — `0001`). **Nada deriva positions das transactions.** Dashboard, summary, holdings, chart e movers leem `portfolio_positions`; a página `/transactions` lê o ledger. Os dois podem (e vão) divergir — o requisito declarado é "source of truth = transactions".
- **O que fazer:** eleger o ledger `transactions` como única fonte de verdade. Derivar holdings/performance/dashboard dele em runtime (o motor puro `lib/fable5/ledger.ts` — `buildLedger`, `buildTimeline`, `validateLedger` — já implementa exactamente isto e deve ser portado para `src/lib/portfolio/ledger.ts` com testes unitários). `portfolio_positions` passa a cache derivado ou é eliminado.

### F-04 · Páginas mostram dados MOCK como se fossem reais

- **Prova:**
  - `/holdings`: `src/components/holdings/HoldingsPage.tsx` renderiza `mock-data.ts`; `HoldingsCard.tsx:61-64` chama `fetch("/api/portfolio")` e **descarta a resposta** ("Data is not used here yet"). A API real `/api/portfolio/holdings` existe e não é usada por ninguém.
  - `/performance`: `src/components/performance/PerformancePage.tsx` — 100% `mock-data.ts`, zero fetch.
  - Dashboard: "Day P&L" e "Cash reserve" são placeholders fixos em 0 apresentados como KPIs reais (`summary/route.ts:87-88`, `dashboard/page.tsx`).
  - Banco: `0009_investment_ledger.sql` **semeia 13 transações fictícias** no owner — dados falsos misturados com os reais no ledger "source of truth".
- **O que fazer:** ligar `/holdings` e `/performance` às APIs reais (derivadas do ledger, ver F-03); migration de limpeza dos seeds mock; remover KPIs sem dado real ou implementá-los (Day P&L = close de ontem vs. preço actual; Cash = derivável das linhas `cash` do ledger).

### F-05 · O app principal não tem caminho de escrita — não é funcional

- **Prova:** todas as rotas em `src/app/api/` são `GET` (grep confirmado); `AddPositionModal.tsx:25` — "TODO: wire to POST /api/holdings when Engineer implements the API route". Não há como registrar uma compra/venda pela UI.
- **O que fazer:** implementar CRUD de transações (`POST/PATCH/DELETE /api/transactions[/id]`) seguindo o pattern canónico do CLAUDE.md (auth → rate limit → Zod → user_id da sessão), com **validação de ledger** antes de persistir (venda não pode exceder posição — reusar `validateLedger`), e wiring da UI (form de transação em `/transactions`; o `AddPositionModal` de holdings deve morrer ou criar transações, não posições).

---

## ALTOS

### A-01 · Ledger sem validação de integridade no schema nem na API

- **Prova:** `0009_investment_ledger.sql` — `qty`/`price` são NULLable sem CHECK de positividade para `buy`/`sell`; `total` é livre (não conferido contra `qty×price±fee`); `fx` sem limites; nenhuma rota valida oversell.
- **O que fazer:** na migration: `CHECK (type NOT IN ('buy','sell') OR (qty > 0 AND price >= 0))`; na API de escrita (F-05): Zod com limites superiores razoáveis (`qty ≤ 1e9`, `price ≤ 1e9` — evita overflow/`Infinity` em agregados JS), recomputar `total` no servidor em vez de aceitar do cliente, e `validateLedger` para oversell.

### A-02 · Gráfico "Portfolio over time" com matemática errada

- **Prova:** `chart/route.ts:98-107` e `dashboard/page.tsx:131-146`:
  1. A linha "invested" aplica `avg_price × quantity` a **todas** as datas do histórico, incluindo antes da compra existir (o schema de positions nem tem data de compra).
  2. Em datas onde um ticker não tem candle (feriados de mercados diferentes, cripto vs. bolsa), esse ticker simplesmente não soma — o gráfico mostra dips falsos no patrimônio.
- **O que fazer:** resolver via F-03 — construir a série a partir do ledger (`buildTimeline` dá qty por ticker por data) × preço histórico com carry-forward do último close conhecido; invested só a partir da data de cada compra. Converter moedas (F-01).

### A-03 · Falhas silenciosas mostram 0,00 € em vez de erro

- **Prova:** `dashboard/page.tsx` — `catch { return empty }` engole qualquer erro (DB fora, Yahoo fora) e renderiza patrimônio 0,00 €, indistinguível de uma carteira real a zero. `getQuote`/`getHistory` (`src/lib/yahoo-finance/client.ts:69,103`) devolvem `null`/`[]` em erro, e os callers usam fallback `avg_price` sem sinalizar.
- **O que fazer:** distinguir "sem dados" de "erro": estado de erro na UI (banner "preços indisponíveis, valores desactualizados"), e nos KPIs marcar quando o preço usado é fallback (`price_updated_at` antigo). Num app financeiro, número silenciosamente errado é pior que erro visível.

### A-04 · Dependências: 12 vulnerabilidades (8 high) + lockfile quebrado

> **Status 2026-08-05: RESOLVIDO.** `npm install` re-sincronizou o lockfile (`npm ci` volta a funcionar) e `npm audit fix` levou a **0 vulnerabilidades**. Só o `package-lock.json` mudou — `package.json` intacto (fixes só em deps transitivas, sem risco para o runtime). typecheck e lint a zero.

- **Prova:** `npm audit` → 12 vulns (2 low, 2 moderate, 8 high): `sharp <0.35.0`, `fast-uri`, `brace-expansion` (DoS), `hono`, `body-parser`, `postcss`/`@babel/core` (transitivas, maioria dev/build). Além disso **`npm ci` falha** — `package-lock.json` dessincronizado do `package.json` (pacotes `@emnapi/*` em falta) → builds não reprodutíveis, CI impossível.
- **O que fazer:** `npm install` para re-sincronizar o lockfile e commitá-lo; `npm audit fix`; re-correr `npm audit` e registar o que sobrar em `SECURITY_FINDINGS.md`. Considerar bump do Next (16.2.6 → última patch).

---

## MÉDIOS

### M-01 · Zero testes da matemática financeira

> **Status 2026-08-05: ADIADO (decisão do dono) — rastreado em `TODO.md`.** Parcialmente iniciado: o motor de ledger foi salvo em `src/lib/portfolio/ledger.ts` com uma suite unitária em `tests/unit/ledger.spec.ts` (11 testes verdes). A expansão da cobertura (conversão fx, mais casos de P&L) fica para um momento posterior, fora deste ciclo de auditoria.

Só há e2e Playwright (`tests/e2e/`) e specs do sandbox. Nenhum teste unitário cobre custo médio, P&L, conversão fx, oversell. **O que fazer:** ao portar o motor de ledger (F-03), trazer/expandir `tests/fable5/ledger.spec.ts` como suite unitária do app principal (vitest ou node:test — Playwright não é ferramenta para isto). Casos mínimos: compra múltipla → custo médio; venda parcial → realized P&L; venda total → ciclo fechado; oversell rejeitado; fx ≠ 1; fees em compra vs. venda.

### M-02 · Higiene já registada em SECURITY_FINDINGS.md, ainda aberta

- `select("*")` + casts `(supabase as any)` em summary/chart/movers/holdings (B-07/B-08/B-10/B-11) — regenerar `src/types/database.ts` (`npx supabase gen types`) e remover todos os casts; seleccionar colunas explícitas.
- Middleware por prefixo (B-12) — trocar para match com fronteira de segmento.
- Rate limiter em memória sem purge (B-03) e caches Yahoo sem bound (B-04/B-05) — adicionar purge/LRU simples.

### M-03 · Preços: cache só em memória, refresh duplicado e sem dedupe entre rotas

- **Prova:** `src/lib/yahoo-finance/client.ts` — caches em `Map` morrem a cada restart/deploy (cold start = rajada de chamadas ao Yahoo); dashboard, summary, chart e movers fazem cada um o seu fan-out de `getQuote`/`getHistory` por posição.
- **O que fazer:** cache persistente de preços em tabela (o sandbox tinha `f5_price_cache` — o conceito é bom: `ticker, price, currency, fetched_at`, upsert com TTL) + uma única função `getPricesFor(tickers)` partilhada por todas as rotas. Reduz billing/risco de ban do Yahoo e acelera a UI — objetivo declarado do projeto.

### M-04 · CSP com `style-src 'unsafe-inline'`

`src/proxy.ts:16` — aceitável com Tailwind runtime, mas documentar como aceite em `SECURITY_FINDINGS.md`. O resto dos headers (HSTS, X-Frame-Options DENY, nonce + strict-dynamic) está bom.

---

## O que está BEM (não mexer sem motivo)

- RLS das tabelas principais (`transactions`, `portfolio_positions`, `profiles`) correcto, padrão `(SELECT auth.uid())` (`0002`, `0009`).
- Todas as rotas do app principal: auth primeiro (`getUser`, nunca `getSession`), rate limit por user, Zod nos inputs, `user_id` sempre da sessão. Pattern canónico cumprido.
- Separação server/client dos clientes Supabase e do SDK Anthropic (guard `typeof window` em `src/lib/anthropic/client.ts`).
- Nenhum secret commitado (scan de `sk-ant-`/JWTs limpo; só `.env.example` no git).
- `npm run typecheck` e `npm run lint` passam com zero erros (após `npm install` limpo).
- Headers de segurança + CSP com nonce em `next.config.ts`/`src/proxy.ts`.

---

## Ordem de execução recomendada (para o Opus)

| # | Itens | Porquê primeiro |
|---|-------|-----------------|
| 1 | **C-02** (decidir A ou B com o dono, executar) | Fecha escrita anónima no banco e proxy Yahoo sem auth. Bloqueia tudo o resto porque define se o motor do sandbox é portado (B) ou reescrito (A). |
| 2 | **C-01** | Fecha o acesso por passphrase default/brute-force. Pequeno e independente. |
| 3 | **A-04** | Lockfile + audit fix — destrava CI e builds reprodutíveis antes das mudanças grandes. |
| 4 | **F-03 + F-01** (com M-01) | Motor de ledger único com moeda base + testes unitários. É a fundação de F-02, F-04, A-02. |
| 5 | **F-05 + A-01** | CRUD de transações com validação de ledger — o app passa a ser funcional. |
| 6 | **F-02, F-04, A-02** | Ligar holdings/performance/dashboard ao motor; matar mocks e seeds falsos. |
| 7 | **A-03, M-02, M-03, M-04** | Robustez, higiene e performance de preços. |

> Regras transversais para todo o trabalho acima: seguir o pattern canónico de API route do `CLAUDE.md`; `npm run typecheck` e `npm run lint` a zero em cada passo; actualizar `SECURITY_FINDINGS.md` ao fechar cada item (C-xx/F-xx daqui podem ser referenciados lá).
