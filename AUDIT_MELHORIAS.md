# FINTrack — Auditoria de Segurança e Correção Financeira

> **Data:** 2026-08-04 · **Auditor:** Fable 5 · **Executor previsto:** Opus
> **Escopo:** app principal (`src/app`, `src/lib`, `src/components`, `supabase/`). O sandbox `/projeto-fable-5` foi excluído da auditoria funcional por instrução do dono, **mas os seus restos criam riscos no app principal — ver C-02**.
>
> Cada item diz **o problema**, **a prova (ficheiro:linha)** e **o que fazer**. Ordem de execução recomendada no fim.

---

## 🧭 PONTO DE PARTIDA — lê isto primeiro (atualizado 2026-08-05)

**Se estás a retomar numa sessão nova (terminal ou web), começa por aqui.**

### Onde estamos
- ✅ **Infraestrutura pronta.** O banco foi migrado do Supabase local (Docker) para o **Supabase Cloud**. Schema limpo — **3 tabelas de utilizador** (`profiles`, `transactions`, `ai_insights`); `portfolio_positions` foi **dropada** na Etapa 3 (migration `0012`). RLS ativo e confirmado, app a arrancar e login a funcionar. Guia: `MIGRACAO_SUPABASE_CLOUD.md`.
- ✅ **Sandbox fable5 removido** por completo (C-02) — o motor de cálculo foi preservado em `src/lib/portfolio/ledger.ts` com testes em `tests/unit/ledger.spec.ts` (correr: `npx playwright test -c playwright.unit.config.ts`).
- ✅ **Etapas 1 e 2 CONCLUÍDAS (2026-08-05):** o ledger `transactions` é a fonte única com moeda base EUR (F-03/F-01), integridade no schema + API (A-01), e CRUD completo em `/transactions` verificado e2e no browser (F-05). Migrations `0010` (CHECKs) e `0011` (GRANTs) aplicadas ao Cloud. 30/30 testes unitários, typecheck/lint a zero.
- ✅ **Etapa 3 CONCLUÍDA e com TODOS os gates passados (2026-08-05):** commit `973bcc0`. Todos os leitores (`dashboard`, `summary`, `holdings`, `movers`, `chart` + nova rota `performance`) derivam agora do ledger via `derivePortfolio` — **mocks e placeholders falsos eliminados** (F-04), realized P&L real do ledger (F-02), gráfico "Portfolio over time" reconstruído com carry-forward de closes e invested só a partir da 1ª compra (A-02). Tabela `portfolio_positions` **dropada** (migration `0012`, aplicada ao Cloud). UI **EUR em tudo** (toggle de moeda + FX mock removidos). A-03 coberto em dashboard/holdings/performance (banner de erro vs carteira vazia, aviso de preço indisponível). Bug apanhado no QA e corrigido: `PortfolioChart` deixou de cair para dados fabricados quando vazio. **Gates:** 36/36 unitários + typecheck/lint a zero; **QA** verificou o wire real no browser e reescreveu os specs e2e; **Security Review APROVADO** (0 crítico/alto/médio novos; fechou B-07/B-08/B-10/B-11; abriu B-13/B-14 higiene).
- ⚠️ **Bloqueio de infra (não-código):** a suite e2e Playwright não corre — `E2E_PASSPHRASE=fintrack` em `.env.local` já não bate com a passphrase real do Cloud (rodada no C-01). Bloqueia TODOS os specs e2e. Desbloquear: pôr o valor real em `.env.local` ou criar utilizador de teste dedicado.
- ✅ **AUDIT COMPLETO — 15/15 pontos resolvidos (2026-08-06).** Últimos a fechar: A-03, M-02, M-03, M-04 e **M-01** (51 testes unitários, incl. fx no timeline + ciclos reabertos). M-03 = cache persistente `price_cache` (migration `0013`, Security APROVADO). E2E desbloqueado. Resta apenas dívida de manutenção da suite E2E (G-05), fora dos 15 pontos.

- ✅ **M-02 + M-04 FEITOS (2026-08-05):** commit `7413266`. M-02 (higiene, sem schema): double-casts removidos (B-13), middleware por segmento (B-12), purge/cap nos caches (B-03/04/05/14), logs por `err.message` (B-06/14), badge `TX_COUNT=13` do sidebar removida. M-04: CSP `unsafe-inline` documentado como aceite (`A-02` em SECURITY_FINDINGS).

### Estado dos 15 pontos
| Resolvido |
|---|
| C-02, C-01, A-04, F-03, F-01, A-01, F-05, F-04, F-02, A-02, A-03, M-01, M-02, M-03, M-04 |

**✅ 15 dos 15 pontos resolvidos (2026-08-06). AUDIT COMPLETO.** M-01 fechado: 51 testes unitários (incl. combinações fx no timeline e P&L em ciclos reabertos com fx).
† A-03: varredura concluída (portfólio + `/transactions` cobertos; `/settings` n/a; `/tax-calculator` fora de escopo, ver `TODO.md` U-01).
M-03: cache persistente `price_cache` (migration `0013`, GRANT a `authenticated`) via pipeline completa — Security APROVADO, 45 testes verdes.

**E2E desbloqueado (2026-08-06):** user de teste dedicado + `auth.setup.ts` via `@supabase/ssr`; specs de dados passam em corrida limpa. Resta dívida de manutenção da suite (isolamento/specs desatualizados) — fora dos 15 pontos, registada em `TODO.md` G-05. Ver PRÓXIMO PASSO.

### Etapa 1 — Fundação: FEITA em código (2026-08-05)
Decisões do dono (registadas): moeda base **EUR fixo**; `portfolio_positions` **é eliminada** (drop físico na Etapa 3, quando os leitores forem religados); metadata do ticker (name/asset_type/chart_var) **derivada** do Yahoo + determinística, sem tabela nova; âmbito da etapa = **só fundação** (sem mudança visível — o ledger está vazio até a Etapa 2).

Entregue e verificado (typecheck + lint a zero):
- **A-01** — `supabase/migrations/0010_transactions_integrity.sql`: CHECKs de `qty>0/price>=0` (buy/sell), `fx>0`, `fee>=0`. **Aplicada ao Cloud.**
- **F-01** — `getFxToEur()` em `src/lib/yahoo-finance/client.ts`: câmbio live moeda→EUR com cache 15 min.
- **F-03** — `src/lib/portfolio/derive.ts` (puro, fonte única: ledger→holdings/sumário em EUR, preços injectáveis) + `src/lib/portfolio/prices.ts` (provider Yahoo+fx) + `tests/unit/derive.spec.ts` (9 testes).

### 👉 PRÓXIMO PASSO (atualizado 2026-08-06)

**Os 15 pontos do AUDIT estão fechados (14 resolvidos + M-01 em expansão contínua).** A-03 e M-03 fechados pela pipeline completa. O **E2E foi DESBLOQUEADO** (2026-08-06) — deixa de ser bloqueio:

1. **E2E desbloqueado** ✅ (2026-08-06). O dono criou um user de teste dedicado (`E2E_EMAIL`/`E2E_PASSPHRASE` em `.env.local`). Feito: `playwright.config.ts` carrega o `.env.local` via `@next/env`; `tests/e2e/auth.setup.ts` autentica o user de teste com o próprio `@supabase/ssr` e injecta os cookies de sessão (contorna o email fixo `owner@fintrack.local` da UI de login, sem tocar na conta real). **Prova de execução:** numa corrida limpa, as specs centrais de `/holdings` com dados reais passam (KPI strip, Realized P/L +50 € do ciclo MSFT, tabela 9 colunas, AAPL Shares/Avg/Invested/Portfolio%, sort, refresh) — valida F-02/F-03/F-04 end-to-end contra o Cloud.

**⚠️ Dívida de manutenção da suite E2E (pré-existente, NÃO é um dos 15 pontos; registada em `TODO.md` G-05):** a suite completa não fica verde por defeitos das próprias specs, expostos agora que corre autenticada: (a) o teste de logout faz `signOut` global e revoga a sessão partilhada, envenenando todos os testes seguintes; (b) `transactions-ledger.spec` espera 13 transações mock da migration `0009` (removidas no F-04); (c) specs partilham um só ledger → contaminação de estado/flaky; (d) drift spec-vs-UI (empty/error-state, formato "| EUR", opacity, `.overflow-x-auto`). É uma passagem de manutenção de testes, não regressão de produto nem do M-03.

**Lembretes operacionais (inalterados):**
- Migrations → `npx supabase db push` (Cloud ligado); **não existe `db:backup`**. `database.ts` é mantido **à mão** (sem `gen types` contra o Cloud).
- Testes unitários (a fonte de verdade da matemática financeira): `npx playwright test -c playwright.unit.config.ts` → **51 verdes** (inclui M-03 e M-01).
- E2E: user de teste dedicado em `.env.local` (`E2E_EMAIL`/`E2E_PASSPHRASE`); `npx playwright test`. Correr specs de dados em isolamento até a dívida de isolamento da suite ser tratada.
- Toda rota nova segue o pattern canónico do `CLAUDE.md` (auth `getUser` → rate limit → Zod → `user_id` da sessão) e **toda tabela nova precisa de GRANT a `authenticated`**.
- `npm run typecheck` e `npm run lint` a zero em cada passo; atualizar os status **neste ficheiro** ao fechar cada item.

### O plano completo (4 etapas)
1. **Fundação** — `F-03` + `A-01` + `F-01` ✅ *feito; migration `0010` aplicada ao Cloud*
2. **Entrada de dados** — `F-05` (CRUD de transações) — **API + UI + e2e verificado** ✅ *app funcional* ⭐
3. **Ligar páginas aos dados reais** — `F-04` + `F-02` + `A-02` ✅ *mocks eliminados; `portfolio_positions` dropada (`0012`); EUR em tudo; 36 testes; QA + Security APROVADOS (`973bcc0`)*
4. **Robustez e afinação** — `A-03` (resto) + `M-02` + `M-03` + `M-04`

> Regras transversais: seguir o pattern canónico de API route do `CLAUDE.md`; `npm run typecheck` e `npm run lint` a zero em cada passo; atualizar os status **neste ficheiro** ao fechar cada item.

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

> **Status 2026-08-05: FUNDAÇÃO FEITA.** `getFxToEur()` (câmbio live moeda→EUR, cache 15 min) em `src/lib/yahoo-finance/client.ts`; `derive.ts` já converte valor de mercado a EUR. Falta: aplicar nas rotas/páginas de leitura (Etapa 3) e capturar fx-on-date na escrita (Etapa 2). Moeda base = EUR fixo (decisão do dono).

- **Problema:** posições têm `currency` (`EUR`/`USD`/`BRL`... — `0001_initial_schema.sql:59`), mas todos os cálculos somam `quantity × price` **sem converter**, e formatam o resultado como EUR:
  - `src/app/(dashboard)/dashboard/page.tsx:100-106` (totalValue/totalCost)
  - `src/app/api/portfolio/summary/route.ts:77-81`
  - `src/app/api/portfolio/holdings/route.ts:129-150` (market value, unrealized/realized P&L)
  - `src/app/api/portfolio/chart/route.ts:98-107` (série do gráfico)
- **Consequência:** com uma posição em USD e outra em EUR, o "patrimônio total" é aritmeticamente sem sentido. O seed actual tem posições GBP e USD — os números exibidos hoje já estão errados.
- **O que fazer:** definir moeda base (EUR); converter cada posição com fx à data (par Yahoo `USDEUR=X` etc., com cache — o padrão `captureFxToEur`/`getFxOnDate` do sandbox é um bom modelo); nunca somar valores de moedas diferentes sem conversão. Adicionar teste unitário que falhe se moedas forem misturadas.

### F-02 · Realized P&L é inventado

> **Status 2026-08-05: RESOLVIDO (Etapa 3).** O `holdings/route.ts` já não usa `current_price` como proxy de venda — deriva de `derivePortfolio`, e o realized P&L vem do motor de custo médio do ledger (`buildLedger` → `TickerAggregate.realizedEur`: proceeds − custo médio na data − fees). A rota `/performance` (nova) e o dashboard usam a mesma fonte. Coberto por testes (`derive.spec.ts`, `financial-edge.spec.ts`).

- **Prova:** `src/app/api/portfolio/holdings/route.ts:142-150` — comentário admite: usa `current_price` como *proxy* do preço de venda para posições `sold`. O P&L realizado exibido não corresponde a nenhuma venda real.
- **O que fazer:** calcular realized P&L a partir do ledger de transações (proceeds da venda − custo médio na data − fees), como o motor `lib/fable5/ledger.ts` (`applyTx`, método de custo médio) já faz correctamente. Depende de F-03.

### F-03 · Duas fontes de verdade que não se falam

> **Status 2026-08-05: FUNDAÇÃO FEITA.** `src/lib/portfolio/derive.ts` (puro) deriva holdings + sumário do ledger `transactions` — fonte única — em EUR, com preços injectados (`prices.ts` = provider Yahoo+fx). Testes em `tests/unit/derive.spec.ts`. Falta (Etapa 3): religar dashboard/summary/holdings/movers/chart a este módulo e **dropar `portfolio_positions`** (decisão do dono: eliminada). Metadata do ticker derivada do Yahoo + determinística, sem tabela nova.

- **Problema:** existem `transactions` (ledger buy/sell/cash/div — `0009_investment_ledger.sql`) e `portfolio_positions` (posições com `avg_price` mantido à mão — `0001`). **Nada deriva positions das transactions.** Dashboard, summary, holdings, chart e movers leem `portfolio_positions`; a página `/transactions` lê o ledger. Os dois podem (e vão) divergir — o requisito declarado é "source of truth = transactions".
- **O que fazer:** eleger o ledger `transactions` como única fonte de verdade. Derivar holdings/performance/dashboard dele em runtime (o motor puro `lib/fable5/ledger.ts` — `buildLedger`, `buildTimeline`, `validateLedger` — já implementa exactamente isto e deve ser portado para `src/lib/portfolio/ledger.ts` com testes unitários). `portfolio_positions` passa a cache derivado ou é eliminado.

### F-04 · Páginas mostram dados MOCK como se fossem reais

> **Status 2026-08-05: RESOLVIDO (Etapa 3).** `/holdings` e `/performance` fazem fetch das APIs reais derivadas do ledger; `HoldingsPage`/`PerformancePage` são agora data-driven. `mock-data.ts` (holdings + performance) e componentes órfãos (`CurrencySelector`, `AllocPill`, `Sparkline`) apagados. O `HoldingsCard.refresh` já não chama a rota morta a descartar a resposta. KPIs falsos removidos: "Cash reserve"=0 e "Day P&L"=0 fora; Day P&L agora é real (close anterior vs preço live, **null → "—"** se indisponível, nunca 0 falso). Os seeds mock do `0009` não são reintroduzidos (a tabela lida é o ledger real do utilizador).

- **Prova:**
  - `/holdings`: `src/components/holdings/HoldingsPage.tsx` renderiza `mock-data.ts`; `HoldingsCard.tsx:61-64` chama `fetch("/api/portfolio")` e **descarta a resposta** ("Data is not used here yet"). A API real `/api/portfolio/holdings` existe e não é usada por ninguém.
  - `/performance`: `src/components/performance/PerformancePage.tsx` — 100% `mock-data.ts`, zero fetch.
  - Dashboard: "Day P&L" e "Cash reserve" são placeholders fixos em 0 apresentados como KPIs reais (`summary/route.ts:87-88`, `dashboard/page.tsx`).
  - Banco: `0009_investment_ledger.sql` **semeia 13 transações fictícias** no owner — dados falsos misturados com os reais no ledger "source of truth".
- **O que fazer:** ligar `/holdings` e `/performance` às APIs reais (derivadas do ledger, ver F-03); migration de limpeza dos seeds mock; remover KPIs sem dado real ou implementá-los (Day P&L = close de ontem vs. preço actual; Cash = derivável das linhas `cash` do ledger).

### F-05 · O app principal não tem caminho de escrita — não é funcional

> **Status 2026-08-05: API + UI FEITAS (falta só QA e2e).** API: `POST /api/transactions` e `PATCH`/`DELETE /api/transactions/[id]` no pattern canónico (auth→rate limit→Zod→user_id da sessão). A-01 na API: `total` recomputado no servidor (`computeTotal`), `fx` capturado à data (`getFxOnDate`; 502 se indisponível), limites Zod (qty/price/fee ≤ 1e9), e `validateLedger` a rejeitar oversell — incluindo apagar uma compra que suporta uma venda (`src/lib/portfolio/write-guard.ts`). UI (agente frontend): `TxModal` (criar/editar buy/sell, valida com o mesmo `TransactionCreateSchema`, nunca envia fx/total, mostra erros do servidor verbatim em PT), delete em massa ligado ao `DELETE` com banner de falhas 422, coluna de edição só para buy/sell; `AddPositionModal` confirmado como dead code (não renderizado) e marcado como tal. **VERIFICADO e2e no browser 2026-08-05** contra o Cloud real: POST 201 (com fx USD→EUR capturado 0.8660 + total recomputado), oversell POST 422 (mensagem PT), PATCH 200 (total recomputado, fx preservado), DELETE 200; transação de teste limpa no fim. typecheck/lint a zero; 30/30 testes unitários.
>
> **Bug de infra descoberto e corrigido no e2e:** todas as queries às tabelas devolviam `42501 permission denied` — as migrations SQL puras (0001/0009) criaram as tabelas sem `GRANT` às roles da API do Supabase (o RLS estava certo, mas o privilégio de tabela por baixo dele faltava). Corrigido pela migration **`0011_grant_authenticated.sql`** (GRANT SELECT/INSERT/UPDATE/DELETE a `authenticated` nas 4 tabelas de utilizador; nada a `anon`), aplicada ao Cloud.

- **Prova:** todas as rotas em `src/app/api/` são `GET` (grep confirmado); `AddPositionModal.tsx:25` — "TODO: wire to POST /api/holdings when Engineer implements the API route". Não há como registrar uma compra/venda pela UI.
- **O que fazer:** implementar CRUD de transações (`POST/PATCH/DELETE /api/transactions[/id]`) seguindo o pattern canónico do CLAUDE.md (auth → rate limit → Zod → user_id da sessão), com **validação de ledger** antes de persistir (venda não pode exceder posição — reusar `validateLedger`), e wiring da UI (form de transação em `/transactions`; o `AddPositionModal` de holdings deve morrer ou criar transações, não posições).

---

## ALTOS

### A-01 · Ledger sem validação de integridade no schema nem na API

> **Status 2026-08-05: PARCIAL.** Camada de schema **aplicada ao Cloud** — `supabase/migrations/0010_transactions_integrity.sql`: CHECK `type NOT IN ('buy','sell') OR (qty>0 AND price>=0)`, `fx>0 AND fx<1e6`, `fee>=0`. A camada de API (Zod com limites, recomputar `total` no servidor, `validateLedger` p/ oversell) entra com o write path — Etapa 2 (F-05, EM CURSO).

- **Prova:** `0009_investment_ledger.sql` — `qty`/`price` são NULLable sem CHECK de positividade para `buy`/`sell`; `total` é livre (não conferido contra `qty×price±fee`); `fx` sem limites; nenhuma rota valida oversell.
- **O que fazer:** na migration: `CHECK (type NOT IN ('buy','sell') OR (qty > 0 AND price >= 0))`; na API de escrita (F-05): Zod com limites superiores razoáveis (`qty ≤ 1e9`, `price ≤ 1e9` — evita overflow/`Infinity` em agregados JS), recomputar `total` no servidor em vez de aceitar do cliente, e `validateLedger` para oversell.

### A-02 · Gráfico "Portfolio over time" com matemática errada

> **Status 2026-08-05: RESOLVIDO (Etapa 3).** Série reconstruída a partir do ledger: `buildTimeline` dá qty por ticker por data; `getHistoryRange` (novo, no cliente Yahoo, cache 1h) traz closes no range; `buildChartSeries` (puro, em `src/lib/portfolio/chart-series.ts`) faz **carry-forward** do último close conhecido (mata os dips falsos em dias sem candle) e só aplica invested a partir da 1ª compra de cada ticker. Conversão a EUR com fx live por moeda (simplificação documentada; o invested usa fx-por-data via ledger). 6 testes unitários em `chart-series.spec.ts`. Rota e dashboard partilham `chart-data.ts` (sem duplicar o algoritmo).

- **Prova:** `chart/route.ts:98-107` e `dashboard/page.tsx:131-146`:
  1. A linha "invested" aplica `avg_price × quantity` a **todas** as datas do histórico, incluindo antes da compra existir (o schema de positions nem tem data de compra).
  2. Em datas onde um ticker não tem candle (feriados de mercados diferentes, cripto vs. bolsa), esse ticker simplesmente não soma — o gráfico mostra dips falsos no patrimônio.
- **O que fazer:** resolver via F-03 — construir a série a partir do ledger (`buildTimeline` dá qty por ticker por data) × preço histórico com carry-forward do último close conhecido; invested só a partir da data de cada compra. Converter moedas (F-01).

### A-03 · Falhas silenciosas mostram 0,00 € em vez de erro

> **Status 2026-08-06: RESOLVIDO (varredura das restantes superfícies concluída).** Além do portfólio (Etapa 3), varridas `/settings`, `/transactions` e `/tax-calculator`:
> - `/settings` — **n/a**: não faz fetch de dados financeiros (só `user.email`/`user.id` + toggle de animações), sem risco de valor falso silencioso.
> - `/transactions` — **já cumpre**: `TransactionsPage.tsx` sinaliza `loadError` (banner no fetch) e `deleteError` (`role="alert"`) nas falhas de delete.
> - `/tax-calculator` — **fora de escopo** (decisão do dono, 2026-08-06): página 100% mock (`SAMPLE_EVENTS_2026`/`EMPTY_EVENTS`), honest-empty por default, sample atrás de toggle rotulado. Registado como dívida em `TODO.md` (U-01), candidato a feature futura via pipeline.
>
> **Estado 2026-08-05 (portfólio):** `/dashboard`, `/holdings` e `/performance` distinguem três estados: erro (banner `role="alert"`, Hero recebe `null` — nunca €0 falso), carteira vazia (zeros legítimos) e preços indisponíveis (`role="status"` / aviso por linha com `priceMissing`/`hasPriceGaps`).

- **Prova:** `dashboard/page.tsx` — `catch { return empty }` engole qualquer erro (DB fora, Yahoo fora) e renderiza patrimônio 0,00 €, indistinguível de uma carteira real a zero. `getQuote`/`getHistory` (`src/lib/yahoo-finance/client.ts:69,103`) devolvem `null`/`[]` em erro, e os callers usam fallback `avg_price` sem sinalizar.
- **O que fazer:** distinguir "sem dados" de "erro": estado de erro na UI (banner "preços indisponíveis, valores desactualizados"), e nos KPIs marcar quando o preço usado é fallback (`price_updated_at` antigo). Num app financeiro, número silenciosamente errado é pior que erro visível.

### A-04 · Dependências: 12 vulnerabilidades (8 high) + lockfile quebrado

> **Status 2026-08-05: RESOLVIDO.** `npm install` re-sincronizou o lockfile (`npm ci` volta a funcionar) e `npm audit fix` levou a **0 vulnerabilidades**. Só o `package-lock.json` mudou — `package.json` intacto (fixes só em deps transitivas, sem risco para o runtime). typecheck e lint a zero.

- **Prova:** `npm audit` → 12 vulns (2 low, 2 moderate, 8 high): `sharp <0.35.0`, `fast-uri`, `brace-expansion` (DoS), `hono`, `body-parser`, `postcss`/`@babel/core` (transitivas, maioria dev/build). Além disso **`npm ci` falha** — `package-lock.json` dessincronizado do `package.json` (pacotes `@emnapi/*` em falta) → builds não reprodutíveis, CI impossível.
- **O que fazer:** `npm install` para re-sincronizar o lockfile e commitá-lo; `npm audit fix`; re-correr `npm audit` e registar o que sobrar em `SECURITY_FINDINGS.md`. Considerar bump do Next (16.2.6 → última patch).

---

## MÉDIOS

### M-01 · Zero testes da matemática financeira

> **Status 2026-08-06: RESOLVIDO.** Suite unitária cobre o motor de ledger, a derivação, o write path, o cache de preços e agora as combinações fx que faltavam — **51 testes verdes** em 6 ficheiros: `ledger.spec.ts` (11), `derive.spec.ts` (9), `write-path.spec.ts` (5), `financial-edge.spec.ts` (5), `prices.spec.ts` (9, M-03), `fx-cycles.spec.ts` (6, adicionado 2026-08-06). Os 6 novos fecham os buracos que esta secção apontava: `buildChartSeries` multi-moeda (USD+GBP) com fx por data + carry-forward; `derivePortfolio` multi-moeda em simultâneo; ciclo reaberto com fx (avg reinicia; realized soma os dois ciclos com fx-por-perna); fees em compra E venda com fx≠1; oversell após reabertura parcial. Zero bugs de matemática encontrados na expansão. Correr: `npx playwright test -c playwright.unit.config.ts` → **51 passed**.

Só há e2e Playwright (`tests/e2e/`) e specs do sandbox. Nenhum teste unitário cobre custo médio, P&L, conversão fx, oversell. **O que fazer:** ao portar o motor de ledger (F-03), trazer/expandir `tests/fable5/ledger.spec.ts` como suite unitária do app principal (vitest ou node:test — Playwright não é ferramenta para isto). Casos mínimos: compra múltipla → custo médio; venda parcial → realized P&L; venda total → ciclo fechado; oversell rejeitado; fx ≠ 1; fees em compra vs. venda.

### M-02 · Higiene já registada em SECURITY_FINDINGS.md, ainda aberta

> **Status 2026-08-05: RESOLVIDO (commit `7413266`).** `select("*")`+`(supabase as any)` (B-07/08/10/11) já tinham caído na Etapa 3; o double-cast residual (B-13) foi removido por anotação de tipo nos 6 leitores (postgrest infere limpo com `LEDGER_COLUMNS`). Middleware por fronteira de segmento (B-12). Rate limiter com purge throttled (B-03). Caches Yahoo com TTL-purge + cap (B-04/05/14) via `pruneCache` partilhado. Logs por `err.message` (B-06/14). Badge `TX_COUNT=13` do sidebar removida.

- `select("*")` + casts `(supabase as any)` em summary/chart/movers/holdings (B-07/B-08/B-10/B-11) — regenerar `src/types/database.ts` (`npx supabase gen types`) e remover todos os casts; seleccionar colunas explícitas.
- Middleware por prefixo (B-12) — trocar para match com fronteira de segmento.
- Rate limiter em memória sem purge (B-03) e caches Yahoo sem bound (B-04/B-05) — adicionar purge/LRU simples.

### M-03 · Preços: cache só em memória, refresh duplicado e sem dedupe entre rotas

> **Status 2026-08-06: RESOLVIDO (autorizado pelo dono).** Tabela persistente `price_cache (ticker PK, price, currency, name, fetched_at)` criada na migration `0013` (RLS ligado, policies `TO authenticated`, GRANT obrigatório a `authenticated` — sem `anon`), aplicada ao Cloud. `yahooPriceProvider` (`src/lib/portfolio/prices.ts`) — o ponto único por onde todo o portfólio deriva preços via `derivePortfolio` — passa a ler o `price_cache` (TTL 15 min), só busca ao Yahoo os tickers em falta/stale, e faz upsert dos frescos; falha de DB cai em fallback ao Yahoo sem rebentar (loga só `err.message`). Câmbio fica fora da tabela (é por-moeda, não por-ticker; mantém cache em memória por moeda). **Gates:** 45 testes unitários verdes (9 novos em `tests/unit/prices.spec.ts` cobrindo hit/miss/stale/mix/fallback), typecheck/lint a zero; **Security Review APROVADO** (0 crítico/alto/médio; B-15 informacional de cast de tipos; cache poisoning aceite por design — app single-user, TTL, CHECKs); QA no browser sem regressão. **Fora do âmbito (follow-up registado):** `chart-data`/`day-pnl`/`movers`(sparklines)/`history`/`verify-ticker` continuam só com cache em memória do `client.ts` — não passam pelo provider.

- **Prova:** `src/lib/yahoo-finance/client.ts` — caches em `Map` morrem a cada restart/deploy (cold start = rajada de chamadas ao Yahoo); dashboard, summary, chart e movers fazem cada um o seu fan-out de `getQuote`/`getHistory` por posição.
- **O que fazer:** cache persistente de preços em tabela (o sandbox tinha `f5_price_cache` — o conceito é bom: `ticker, price, currency, fetched_at`, upsert com TTL) + uma única função `getPricesFor(tickers)` partilhada por todas as rotas. Reduz billing/risco de ban do Yahoo e acelera a UI — objetivo declarado do projeto.

### M-04 · CSP com `style-src 'unsafe-inline'`

> **Status 2026-08-05: RESOLVIDO (documentado como aceite).** Registado como `A-02` em `SECURITY_FINDINGS.md` (Achados Aceites): necessário para o runtime do TailwindCSS v4; o resto do CSP é forte (nonce + strict-dynamic, object-src none, frame-ancestors none). Sem acção de código — risco reconhecido.

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
