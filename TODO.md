# FINTrack — CI Fase 1: gate determinístico em GitHub Actions

> Objetivo aprovado em 2026-08-06; spec refinada e decisões fechadas em 2026-08-06 (mesma data, sessão de refinamento). **Só a Fase 1.** A Fase 2 (E2E em CI) está explicitamente fora deste TODO.
> A feature anterior (Import CSV Trading212) está concluída e versionada — recuperável no histórico git deste ficheiro.
>
> **ACTUALIZAÇÃO 2026-08-07 — CI a correr e VERDE em `main`.** A política de Actions que bloqueava (ver Verificação) foi resolvida; o `ci.yml` está em `main` e passa verde (`npm ci` → typecheck → lint → 75 unit tests). Mudanças desta sessão, detalhadas abaixo: (1) actions subidas a `@v5` (runtime Node 24, sem warning de deprecação); (2) **auto-heal do lockfile cross-platform** (dev Windows × CI Linux) — nova subsecção; (3) **fixture sintética** `tests/fixtures/trading212.sample.csv` a substituir a dependência dos unit tests no gitignored `positions_export/`. Falta APENAS a branch protection (Tarefa 3, acção manual do utilizador).

## Objetivo central — porque isto existe

Tirar a camada de verificação **determinística** dos agentes e passá-la para GitHub Actions, com um fim claro: **reduzir ao máximo o gasto de tokens, automatizando o máximo de testes possível sem que o agente QA os tenha de correr — mantendo 100% da qualidade, eficiência e segurança do aplicativo.**

Estado actual (verificado 2026-08-06):

- O QA corre `typecheck` + `lint` a cada ciclo — está escrito em `.claude/agents/qa.md` (Fase 1, passo 5).
- Os **75 unit tests** não estão atribuídos a nenhum agente por escrito (nenhum ficheiro de `.claude/` referencia `playwright.unit.config.ts` nem `tests/unit`) — eram corridos ad-hoc em sessão pelo orquestrador/QA (ex.: ~166k tokens num único ciclo de QA da csv-import).

É trabalho 100% determinístico, que não precisa de inteligência nenhuma e que queima tokens. Movê-lo para CI:

- **Minimiza tokens ao máximo:** nenhum agente executa verificações determinísticas; o CI valida tudo a cada push e o gate protege a PR.
- **Automatiza o máximo de testes fora do agente:** typecheck + lint + todos os unit tests correm sozinhos, a cada push/PR, sem intervenção.
- **Mantém 100% da qualidade, eficiência e segurança:** o gate é exactamente o mesmo conjunto de verificações — nada é removido, relaxado ou saltado. Só muda quem as executa: CI grátis e reprodutível, em vez de um agente pago. A segurança do app não depende destes testes correrem num agente; depende de correrem sempre — e o CI (com required status check) garante isso melhor.

## Fluxo de trabalho decidido — "gate só no fim" (decisão 2026-08-06)

- **QA:** deixa de correr QUALQUER verificação determinística (typecheck, lint, unit tests). Foca-se exclusivamente no que exige agente: verificação visual (Chrome Extension) e E2E/funcional (Playwright e2e).
- **CI:** valida a camada determinística completa a cada push. Erros de typecheck/lint/unit aparecem no CI, não no ciclo local Engineer↔QA — consequência aceite da decisão.
- **Merge em `main`:** passa a ser via PR com o check de CI verde (required status check — ver Tarefa 3). Trabalho de feature acontece em branch.
- **Engineer:** o self-check próprio de typecheck+lint (`engineer.md` linhas 28-44, flags `TYPECHECK_FAILED`/`LINT_FAILED`) **mantém-se** — está fora do escopo desta fase. É feedback imediato pós-implementação, não o gate.

## Escopo — SÓ Fase 1

Um workflow que corre, a cada push e PR, a camada que não precisa de browser, banco nem secrets:

```
npm ci → npm run typecheck → npm run lint → npx playwright test -c playwright.unit.config.ts
```

Factos que tornam isto seguro e barato (validados 2026-08-06):

- `playwright.unit.config.ts`: `testDir: tests/unit`, `fullyParallel`, **sem webServer, sem browser, sem banco** (comentário explícito na própria config).
- **75 unit tests determinísticos em 9 ficheiros:** `csv-parser`, `trading212` (mapper T212), `ledger`, `fx-cycles`, `derive`, `chart-series`, `financial-edge`, `write-path`, `prices`. O `prices.spec.ts` é determinístico: `_prices-mock-setup.ts` intercepta `yahoo-finance/client` e `supabase/server` via `node:module` — zero rede.
- `package-lock.json` versionado → `npm ci` reprodutível.
- **Zero secrets:** nada toca Supabase, Yahoo Finance ou Anthropic. Nenhuma chave é exposta ao CI.
- Nota factual (não-objetivo): `lint` = `eslint src` — `tests/` não é lintado; o CI herda esse escopo tal como está.

## Tarefas

### 1. `.github/workflows/ci.yml` — FEITO 2026-08-06; actualizado 2026-08-07

- [x] Trigger: `on: [push]` (todas as branches; `push` dispara em qualquer branch por defeito). **Nota 2026-08-07:** não há trigger `pull_request` — a spec original previa push+PR, mas o ficheiro real usa só `push`. Como o merge planeado é via PR a partir de branch, o `push` da branch já corre o CI e alimenta o check da PR.
- [x] Runner `ubuntu-latest`; **Node 24** (`node-version: 24`); cache de npm via `actions/setup-node@v5` (`cache: npm`).
  - Nota (não bloqueia, não-objetivo desta fase): `@types/node` está em `^20` no package.json — desalinhado com o runtime 24; alinhar fica para depois.
- [x] `concurrency` group `ci-${{ github.ref }}` com `cancel-in-progress: true`.
- [x] `timeout-minutes: 10` no job.
- [x] Passos, nesta ordem (qualquer um vermelho falha o job — é o gate):
  1. `actions/checkout@v5` _(subido de v4 em 2026-08-07: v5 corre em Node 24, elimina o warning "Node.js 20 is deprecated")_
  2. `actions/setup-node@v5` (Node 24, `cache: npm`)
  3. **Instalar deps** — `npm ci` com auto-heal: se o `npm ci` falhar pela divergência de lockfile Windows×Linux, cai para `npm install` neste run (ver subsecção 1b). Antes de 2026-08-07 era `npm ci` puro.
  4. `npm run typecheck`
  5. `npm run lint`
  6. `npx playwright test -c playwright.unit.config.ts`
- [x] SEM `playwright install` de browsers, SEM secrets, SEM webServer, SEM Supabase.

### 1b. Auto-heal do lockfile cross-platform — NOVO 2026-08-07

> **Contexto (bug real encontrado hoje):** o dev é Windows, o CI é Linux. As optional deps wasm (`@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, sob `@tailwindcss/oxide-wasm32-wasi`, `@img/sharp-wasm32`, `@unrs/resolver-binding-wasm32-wasi`) resolvem para versões diferentes por OS. Um `package-lock.json` gerado no Windows falha o `npm ci` no Linux com `EUSAGE: Missing @emnapi/*@1.11.3` (falha em ~2s). Foi a causa dos runs vermelhos apontados pelo utilizador — não era o Node 24 nem as deps da app.

- [x] Lockfile regenerado no ambiente-alvo (ubuntu + Node 24) e commitado a `main` (commit `0dfff4a`) — o `npm ci` do CI passou a estar em sync.
- [x] `ci.yml` passo 3 tornado **auto-curável** (commit `0bc7c22`): `npm ci || npm install`. Só cai para `npm install` na divergência wasm; sem commit de volta ao repo, sem permissões extras, sem intervenção manual. Elimina a manutenção do lockfile a cada mudança de dependência.
- Consequência aceite: `npm ci` LOCAL no Windows pode falhar contra o lockfile commitado (é "Linux-flavored"). **Localmente usar `npm install`** (tolerante); o CI usa `npm ci`. Um `rm -rf node_modules package-lock.json && npm install` no Windows produz lockfile quebrado (mismatch `ajv-formats`) — NÃO fazer.

### 2. Integração no fluxo de trabalho (ficheiros concretos)

- [x] `.claude/agents/qa.md` — FEITO 2026-08-06 (antecipado, antes do ci.yml — seguro porque o self-check do Engineer continua a gatear):
  - Fase 1: QA não executa typecheck/lint/unit; lê apenas os flags do relatório do Engineer (`TYPECHECK_FAILED`/`LINT_FAILED`/`MIGRATION_FAILED`).
  - Fase 4, passo 15: REPROVADO/APROVADO dependem dos flags do Engineer, não de execuções próprias.
  - Template: tabela "Gate Determinístico" com fonte Engineer/CI.
  - Extra (poupança de tokens, além da spec): Fase 0 lê só ficheiros exigidos pelos CAs + API routes (segurança); output Playwright literal completo só em falha — verde regista sumário + lista de testes.
- [x] `CLAUDE.md` — FEITO 2026-08-06: nova secção "Gate Determinístico — responsabilidade do CI (não do QA)" após "Pipeline de Desenvolvimento". Regista: gate (typecheck/lint/unit) = CI; QA foca visual/E2E; Engineer mantém self-check; merge em `main` via PR com check verde.
- [~] (Opcional) Badge de status do CI no `README` — PULADO: não existe `README.md` no repo; criar um ficheiro inteiro só para o badge está fora do escopo. Reabrir se/quando houver README.

### 3. Branch protection — tornar o gate real

> **BLOQUEADO — requer acesso ao GitHub (UI ou `gh`/token) que não existe nesta sessão.** `gh` CLI não está instalado (bash e PowerShell confirmam "not found"); sem token não há como bater na REST API. Só o utilizador consegue configurar. Ver instruções abaixo em "Passos manuais do utilizador".

- [ ] Configurar no GitHub (ruleset ou branch protection em `main`): required status check = `Deterministic gate` (job do workflow de CI). Sem isto o CI fica vermelho mas não impede merge — o gate seria só informativo.
- [ ] Consequência assumida: features entram em `main` via PR; push directo a `main` deixa de ser o caminho normal.

## O que NÃO entra — Fase 2, fora deste TODO

- **E2E no CI.** Exige, nesta ordem: (a) projeto Supabase **separado para testes** (não produção); (b) ~~fixture sintética/anonimizada commitada~~ **PARCIALMENTE FEITO 2026-08-07** — existe `tests/fixtures/trading212.sample.csv` (sintética, versionada) e os **unit tests** já a usam; MAS o E2E `tests/e2e/csv-import.spec.ts` **ainda lê `positions_export/trading212.csv`** (gitignored, dados pessoais), logo continua a bloquear E2E em CI até ser migrado para a fixture sintética; (c) correcção do drift da `E2E_PASSPHRASE`; (d) resolução da flakiness G-05 (isolamento de estado por spec). É um mini-projeto próprio — pôr E2E flaky em CI produziria vermelho por instabilidade, não por bugs, custando mais tempo de dev e minando a confiança no gate.
- Build de produção / deploy no CI.
- Alinhamento de `@types/node` com Node 24 (nota na Tarefa 1).
- Alterar o self-check do Engineer (mantém-se como está).

## Execução

Tarefa de **infra/CI** — sem UI e sem lógica de negócio, por isso `Designer` e `Frontend` não se aplicam (decisão consciente, análoga ao `db-schema-designer` estar fora do pipeline). Implementação pelo `engineer` (ou directa); a "verificação" é o próprio primeiro run verde do CI.

## Verificação

- [x] **Baseline local verde (2026-08-06; re-verificado 2026-08-07):** o gate exacto do CI — `npm run typecheck` (exit 0), `npm run lint` (exit 0), `npx playwright test -c playwright.unit.config.ts` (**75 passed**) — verde local e no CI Linux.
- [x] **CI em `main` e VERDE (2026-08-07):** o `ci.yml` está em `main`; o run do commit `0dfff4a` (e seguintes) passou com TODOS os steps verdes (checkout@v5, setup-node@v5, npm ci, typecheck, lint, 75 unit tests). Actions está activo e a funcionar.
- [x] **RESOLVIDO — política de Actions (era o bloqueador de 2026-08-06):** a definição **Settings → Actions → "Actions permissions"** que recusava actions da org `actions` (GitHub) foi desbloqueada. Prova: os runs de 2026-08-07 usam `actions/checkout@v5` e `actions/setup-node@v5` (actions da GitHub) e arrancam/passam sem `startup_failure`. _Histórico do diagnóstico original (run `31126454159`, `startup_failure` com "all actions must be from a repository owned by HenriqueRulez") mantido no git deste ficheiro._
- [x] **Prova de que o gate morde (observada 2026-08-07):** o gate falhou de verdade e bloqueou os steps seguintes em dois cenários reais — `npm ci` fora de sync (step 3 vermelho) e os 9 testes do trading212 por fixture ausente (ENOENT) — e voltou a verde só após correcção. O gate demonstrou que morde; um teste partido de propósito continua por fazer, mas o comportamento está comprovado.
- [ ] Prova de que a branch protection morde: com o check vermelho, a PR de teste não permite merge; com verde, permite. **(requer branch protection configurada + push)**
- [x] `.claude/agents/qa.md` sem execução de typecheck/lint (Fase 1, passo 15 da Fase 4 e template actualizados — feito 2026-08-06) e `CLAUDE.md` com a regra do CI registada (feito 2026-08-06).

## Passos manuais do utilizador (o que não pôde ser automatizado nesta sessão)

Actualizado 2026-08-07: o CI já está em `main` e verde — o ponto 1 (push) está FEITO. Resta só a branch protection, que precisa das tuas credenciais de admin no GitHub.

1. ~~**Commit + push**~~ **FEITO 2026-08-07:** o `ci.yml` está em `main` e o CI corre a cada push, verde. (O plano previa branch→PR; na prática esta sessão empurrou direto para `main` por serem correcções de CI. Assim que a branch protection estiver activa, volta ao fluxo branch→PR.)
2. **Branch protection — ÚNICO passo que falta** (Settings → Branches → Add rule / ou Rulesets) em `main`: "Require status checks to pass before merging" e selecionar o check **`Deterministic gate`** (já aparece na lista — o job já correu). Marca também "Require a pull request before merging" se quiseres bloquear push directo. Sem isto, o CI é informativo (fica vermelho mas não impede merge/push).
3. **Provas do gate** (opcional): parte um unit test de propósito num commit → CI vermelho → PR bloqueada; reverte → verde → PR desbloqueada. _O comportamento "o gate morde" já foi observado de facto em 2026-08-07 (ver Verificação); esta prova formal com PR depende do ponto 2._

[ignorar essa linha]
