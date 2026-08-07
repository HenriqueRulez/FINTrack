# FINTrack — Pipeline & Qualidade

> **2026-08-07 — nova leva definida.** A Fase 1 (gate determinístico no CI) está feita e verde em `main`; o registo completo mantém-se abaixo. A secção **"Próxima leva — Pipeline, robustez e qualidade"** no fim deste ficheiro define o trabalho seguinte: mais verificações determinísticas no CI (nunca no QA), robustez da automação e redução de gasto de tokens.

## CI Fase 1: gate determinístico em GitHub Actions

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

---

# Próxima leva — Pipeline, robustez e qualidade (definida 2026-08-07)

> Princípio inalterado: **tudo o que é determinístico corre no CI, nunca no QA.** Esta leva expande o gate, fecha buracos de robustez observados e corta mais gasto de tokens dos agentes. Cada item tem base factual verificada em 2026-08-07 (refs ficheiro:linha). Ordem = prioridade.

## Bloco A — Fechar e endurecer o gate actual

### A1. Branch protection em `main` (carry-over da Fase 1 — acção manual do utilizador)

- [ ] O único passo que falta da Fase 1 (ver "Passos manuais do utilizador" acima). Sem isto o CI é informativo: vermelho não bloqueia merge nem push.
- **Porquê primeiro:** todos os itens abaixo aumentam o gate; um gate que não morde não vale o investimento.

### A2. Instalar `gh` CLI + autenticar — a base da robustez de automação

- [x] Instalar GitHub CLI no ambiente dev (Windows) e autenticar (`gh auth login`). **FEITO 2026-08-07** — `gh` 2.97.0 instalado em `C:\Program Files\GitHub CLI\gh.exe` (fora do PATH; invocar por caminho completo) e autenticado no keyring (scopes `gist`/`read:org`/`repo`/`workflow`).
- **Facto (histórico, já resolvido):** em 2026-08-06 `gh` não existia neste ambiente (bash e PowerShell). Desde 2026-08-07 existe e é usado de facto: PRs #6 e #7 criadas por `gh pr create`, CI confirmado por `gh run watch`/`gh run list`.
- **O que desbloqueia:** (1) orquestrador confirma "CI verde" com facto (`gh run list --limit 1`) em vez de assumir — 1 comando barato substitui suposição; (2) branch protection configurável via `gh api` (fecha A1 sem UI); (3) fluxo branch→PR→merge automatizável de ponta a ponta.
- **Verificação FEITA:** `gh run list --branch <branch>` devolveu os runs reais do repo (usado no B2-parte2, 2026-08-07).

### A3. Passo pós-push obrigatório do orquestrador: confirmar o CI (depende de A2)

- [ ] Adicionar ao fluxo de trabalho (CLAUDE.md, secção "Gate Determinístico"): após qualquer push, o orquestrador corre `gh run watch` (ou `gh run list --limit 1`) e regista o resultado real. Proibido declarar "CI verde" sem esse output.
- **Nota 2026-08-07:** o comportamento já foi praticado de facto nos B3 e B2-parte2 (CI confirmado por `gh run watch` antes de declarar verde), mas a **regra escrita no CLAUDE.md continua por adicionar** — é isso que fecha o checkbox.
- **Porquê:** hoje o resultado do CI só é visível na UI do GitHub — o fecho do loop depende do utilizador ir ver. Robustez = o pipeline confirma-se a si próprio. Custo: ~zero tokens (um comando, output de 3 linhas).

### A4. Guard no auto-heal do lockfile — não deixar o fallback esconder drift real

- [x] Endurecer o passo 3 do `ci.yml` (linhas 30-37): o fallback `npm install` hoje aceita **qualquer** divergência de lockfile, não só a wasm. Se um dia o lockfile dessincronizar por outra razão (dep adulterada, versão nova não commitada), o CI "cura" silenciosamente e fica verde com deps diferentes das versionadas. **FEITO 2026-08-07** (branch `ci/lockfile-guard`).
- **Como:** após o `npm install` do fallback, o passo chama `node .github/scripts/lockfile-guard.mjs`. O guard **não** usa `git diff --name-only` (que só diz que o ficheiro mudou) — parseia o mapa `packages` do lockfile commitado (`git show HEAD:package-lock.json`) vs o do disco já reconciliado e compara a **forma material** de cada entrada (version/resolved/integrity/dependencies…), extraindo o nome real do pacote (último segmento após o derradeiro `node_modules/`, apanhando entradas aninhadas como `.../node_modules/@emnapi/core`). Mudança material só em pacotes da allowlist wasm — `@emnapi/*` (core/runtime/wasi-threads), `@tailwindcss/oxide-wasm32-wasi`, `@img/sharp-wasm32`, `@unrs/resolver-binding-wasm32-wasi` — → exit 0 com `::warning::` (comportamento preservado); qualquer outro pacote com identidade alterada → exit 1 com `::error::` + `git diff` do lockfile no log.
- **Premissa corrigida (facto do CI, run 31187107446):** a spec assumia "diff só wasm". Falso. O `npm install` no Linux faz DUAS coisas benignas: (1) adiciona as entradas wasm; (2) **remove o flag `"peer": true`** (e um `"dev": true`) de ~19 pacotes normais (react, zod, typescript, eslint, @supabase/supabase-js…) — version/resolved/integrity IDÊNTICOS. `peer`/`dev`/`optional` são bookkeeping do npm (derivado do grafo, sem código) e diferem por versão do npm. Alargar a allowlist por NOME a esses 19 deixaria passar um bump malicioso de react/zod; em vez disso o guard ignora só as flags de bookkeeping e compara a identidade real. Assim um bump de `version`/`integrity` de qualquer não-wasm **continua** a morder.
- **Prova local (2026-08-07):** 5 cenários sintéticos contra o lockfile real — (T1) `@emnapi` version → verde; (T2) `zod` version → vermelho+diff; (T3) remover `peer:true` de react → verde (identidade intacta); (T4) cenário real (add `@emnapi/core` + remover `peer`/`dev` de 5 normais) → verde+warning; (T5) peer-flip benigno + bump malicioso de react juntos → vermelho, só `react` offender. Lockfile restaurado sem alterações. 3 checks determinísticos verdes (typecheck 0, lint 0, test:unit 75 passed) — o guard vive em `.github/scripts/`, fora do escopo de `eslint src tests` e do `tsc`.
- **Porquê:** segurança de supply chain > conveniência. O auto-heal foi desenhado para UM caso crónico (TODO, secção 1b); o guard garante que continua restrito a drift sem código — e como o `npm ci` do CI falha em todo o run, o fallback e o guard são exercidos a cada run.

### A5. `npm audit` como job do CI — tirar mais um passo determinístico de um agente — FEITO 2026-08-07

- [x] Novo job `security-audit` (nome "Security audit") no `ci.yml`: `npm audit --audit-level=high`. Começa **não-required** (informativo); promover a required após ~2 semanas sem falsos vermelhos (CVEs novos pintam o audit de vermelho sem commit nenhum — observar a taxa antes de gatear). **FEITO** na branch `ci/security-audit`.
- [x] Actualizar `.claude/agents/security-reviewer.md`: deixa de executar `npm audit`; passa a ler o resultado do último run do job "Security audit" via `gh` (`gh run list --workflow=ci.yml --limit 1` + `gh run view <id> --json jobs`) e a registá-lo no relatório com a referência do run (ID + URL). **FEITO.**
- **Decisão de implementação (com prova, 2026-08-07):** o job **NÃO reutiliza** o auto-heal+guard do gate. `npm audit` lê apenas o `package-lock.json` — não precisa de `node_modules` nem de `npm ci`. Verificado localmente: `npm audit --audit-level=high` contra só o lockfile (sem `node_modules`) devolveu `found 0 vulnerabilities`, exit 0. Assim o job é só checkout@v5 + setup-node@v5 (Node 24, cache npm) + `npm audit` — evita duplicar a lógica frágil de instalação (goal explícito) e é mais rápido. Job SEPARADO/independente do "Deterministic gate" (não o toca).
- **Facto:** o security-reviewer corria `npm audit --audit-level=high` a cada ciclo — determinístico, zero inteligência, pago em tokens. Mesma lógica da Fase 1: muda quem executa, não o que se verifica.

### A6. Auto-merge não dispara para PR aberta DEPOIS do CI correr — descoberto no B3 (2026-08-07) — DECIDIDO 2026-08-07: opção processo

- [x] `ci.yml` linha 5 corre só em `on: [push]`. O `automerge.yml` reage a `workflow_run` do CI. Fluxo típico do CLAUDE.md = push da branch → CI corre → **só depois** se abre a PR. Nessa ordem, o `workflow_run` do push já completou quando a PR ainda não existia; o `automerge` correu, não encontrou PR (`gh pr list` vazio), saiu 0 e **nunca mais re-dispara**. Resultado: PR fica aberta, verde e mergeable, mas parada. **RESOLVIDO por processo (ver decisão abaixo).**

#### Decisão (2026-08-07): **opção processo**, os workflows ficam como estão

Escolhida a alternativa de processo — abrir a PR **enquanto o run do CI do push ainda está `in_progress`** (ou, se já completou, re-disparar com `gh run rerun <id>`). Nenhuma alteração a `ci.yml` nem a `automerge.yml`.

**Porquê (com prova, não suposição):**

- **A opção processo funciona sem intervenção manual — provado 2 vezes.** No B3 a PR #6 foi aberta DEPOIS do run do push completar → ficou parada e só fechou com `gh run rerun 31174921198` (re-disparo manual). Nesta sessão a **PR #9 (A5) foi aberta ENQUANTO o run do push `31190012853` estava `in_progress`** → o `workflow_run` desse run acordou o `automerge` (run `31190070504`, `success`, 14:55:52) → PR #9 `MERGED` 14:56:00 **sem nenhum `gh run rerun`**. A ordem "PR aberta antes do run completar" é o que resolve, e é barata (zero mudanças de infra).
- **A opção infra sai mais cara e arriscada.** Adicionar `pull_request→main` ao `ci.yml` NÃO deduplica com o run do push: para `push`, `github.ref` = `refs/heads/<branch>`; para `pull_request`, `github.ref` = `refs/pull/<N>/merge` (factos documentados do GitHub). Como os refs diferem, o `concurrency: ci-${{ github.ref }}` + `cancel-in-progress` **não** cancela um contra o outro → passariam a correr DOIS runs completos (gate + security-audit) por cada push a uma branch com PR aberta. Isso **dobra o gasto de CI** — o oposto do objetivo-norte desta leva (minimizar tokens/minutos). Além disso, o `if` do `automerge` (linha 27, `event == 'push'`) filtraria fora o `workflow_run` originado por `pull_request` (que traz `event == 'pull_request'`), logo o fix infra exigiria também rever esse `if` — mais superfície, mais risco, para resolver um problema que o processo já resolve de graça.

**Regra operacional (para o orquestrador):** ao mergear uma branch via PR, abrir a PR **antes de o run do CI do push completar** (na prática: `git push` e logo a seguir `gh pr create`, enquanto `gh run list` mostra o run `in_progress`). Se o run já tiver completado quando a PR abre, forçar novo `workflow_run` com `gh run rerun <run-id>` do run do push. Prova de sucesso: a PR auto-mergeia sem `gh pr merge` manual.

- **Nota (carry-over):** a robustez definitiva desta ordem vive melhor numa regra escrita do fluxo do orquestrador; fica registada aqui no TODO conforme a decisão. Se um dia o custo de duplicação deixar de ser problema (ex.: CI muito curto), reavaliar a opção infra com concurrency reescrita (`group` comum a push×PR) — não é o caso hoje.

## Bloco B — Alargar a cobertura determinística (mesmo gate, mais dentes)

### B1. Lint cobrir `tests/` — 21 ficheiros de teste sem lint hoje — FEITO 2026-08-07

- [x] Mudar `package.json` linha 9: `"lint": "eslint src"` → `"lint": "eslint src tests"` e corrigir o que aparecer. **FEITO** na branch `ci/lint-tests` (commit `d10568b`).
- **O que apareceu ao lintar `tests/`:** 0 errors, 1 warning — uma directiva `eslint-disable no-console` inútil em `tests/e2e/csv-import.spec.ts:90` (o flat config não activa `no-console`). Removida no mesmo commit.
- **Facto:** `eslint src` deixa os 21 `.ts` de `tests/` (9 unit + 11 e2e + setup) fora do lint — o CI herda esse buraco (nota factual na secção "Escopo" da Fase 1). Testes são código: um `await` esquecido num spec passa em silêncio e vira flakiness.
- **Verificação FEITA:** `npm run lint` local exit 0 com o novo escopo; **CI verde no push** — run `31171391257` (job "Deterministic gate", todos os steps `success`, incl. `npm run lint`). `npm run typecheck` (0) e unit tests (75 passed) também verdes local e no CI.

### B2. Script `test:unit` — um comando canónico em vez de três cópias — PARCIAL 2026-08-07

- [x] Adicionar a `package.json`: `"test:unit": "playwright test -c playwright.unit.config.ts"`. **FEITO** no commit `d10568b` (branch `ci/lint-tests`) — o script foi antecipado aqui porque a condição do goal de B1 o referenciava; decisão consciente do utilizador.
- [x] Substituir a invocação literal no `ci.yml` (linha 43) por `npm run test:unit`. **FEITO E MERGED** (2026-08-07, PR `ci/testunit-canonico` → `main`) — o `ci.yml` passo 6 passa a chamar `npm run test:unit` (script canónico em `package.json:11` desde `d10568b`); os três checks locais verdes (typecheck 0, lint 0, test:unit 75 passed) e CI verde confirmado.
- **Facto:** o comando `npx playwright test -c playwright.unit.config.ts` está hoje duplicado em `ci.yml`, no TODO e na prática local — três sítios para dessincronizar quando a config mudar de nome.

### B3. Alinhar `@types/node` com o runtime Node 24

- [x] `package.json`: `@types/node` `^20` → `^24`. **FEITO E MERGED** (2026-08-07, PR #6 `ci/types-node-24` → `main`, squash `bfb103b`) — instalado `@types/node@24.13.3`, lockfile reconciliado; typecheck+lint+test:unit locais verdes (75 passed), zero erros de tipo revelados pelos tipos do Node 24. **CI verde confirmado** (job "Deterministic gate" do commit `96b77b5` = `success`, lido por GET público). Auto-merge server-side fechou a PR (ver nota A6 abaixo sobre o re-disparo manual que foi preciso).
- **Facto:** registado como nota na Tarefa 1 da Fase 1; o typecheck valida hoje contra tipos do Node 20 enquanto o CI corre Node 24 — APIs novas do 24 passariam despercebidas ou dariam falso erro.

### B4. `next build` no CI — investigar e decidir (não implementar às cegas)

- [ ] Investigar se `npm run build` corre sem secrets reais (as env `NEXT_PUBLIC_SUPABASE_URL`/anon key podem ser exigidas no build; testar com valores dummy). Se correr limpo: adicionar como job separado (não-required no início) — o build apanha erros que typecheck não vê (violações de fronteira server/client, imports de `server-only` em Client Components — exactamente as regras de segurança do CLAUDE.md). Se exigir secrets ou for instável: registar a conclusão aqui e fechar o item como "não vale".
- **Custo estimado:** +2-4 min de CI grátis por push. **Decisão consciente, com prova, antes de gatear.**

## Bloco C — Desbloquear E2E em CI (os pré-requisitos concretos da Fase 2)

> A Fase 1 declarou E2E-em-CI fora de escopo por 4 bloqueadores. Esta leva ataca-os um a um, por ordem. **Nenhum E2E entra no gate required enquanto for flaky** — vermelho por instabilidade mina a confiança no gate.

### C1. Migrar `csv-import.spec.ts` para a fixture sintética

- [ ] `tests/e2e/csv-import.spec.ts:31` lê `positions_export/trading212.csv` (gitignored, dados pessoais). Trocar para `tests/fixtures/trading212.sample.csv` (sintética, versionada — os unit tests já a usam desde 2026-08-07) e ajustar as asserções aos valores da fixture.
- **É o último spec com dependência de dados pessoais** — depois disto, todos os specs correm de um checkout limpo.

### C2. Unificar as variáveis de ambiente do E2E — eliminar o drift

- [ ] **Facto (drift real):** `auth.setup.ts:15-18` exige `E2E_EMAIL` **e** `E2E_PASSPHRASE` (aborta sem ambas), mas `qa.md` (Fase 3, passo 13) instrui apenas `E2E_PASSPHRASE=fintrack` — funciona só porque `E2E_EMAIL` vive em `.env.local`, invisível ao comando. Num checkout de CI, nada disto existe.
- [ ] Definir UMA fonte de verdade: `.env.test` versionado com o utilizador de teste dedicado (email de teste + passphrase de teste — validar que NÃO são credenciais de produção antes de versionar; se forem, criar utilizador E2E próprio primeiro). `auth.setup.ts` carrega-o; `qa.md` deixa de prefixar vars à mão; o CI (futuro) usa o mesmo ficheiro.
- **Verificação:** `npx playwright test tests/e2e/smoke.spec.ts` verde num shell limpo sem prefixo de vars.

### C3. Matar a flakiness G-05 — isolamento de estado por spec

- [ ] Dívida registada desde o AUDIT: specs partilham estado (dados criados por um spec aparecem noutro). Introduzir setup/teardown por spec (criar e apagar os próprios dados via API autenticada) ou reset de banco entre projects do Playwright. Medir: 3 runs completos consecutivos verdes localmente = critério de "estável".
- **Gate de entrada para C4** — E2E instável não sobe para CI.

### C4. Supabase efémero no runner + smoke E2E no CI

- [ ] Depois de C1-C3: investigar `supabase start` (stack local via Docker) no runner ubuntu como banco efémero por run — elimina a necessidade de projeto Cloud de teste e de secrets no CI. Job novo (não-required) a correr **apenas** `smoke.spec.ts` + `auth.setup.ts` com browser instalado (`npx playwright install chromium --with-deps`).
- [ ] Só depois de N runs estáveis: decidir alargar aos restantes specs e/ou promover a required. Cada promoção é decisão registada aqui, não automatismo.

## Bloco D — Robustez do processo dos agentes (tokens + reprodutibilidade)

### D1. Dev server do QA — arranque e paragem determinísticos

- [ ] **Facto (memória do projecto):** o QA deixa dev server órfão após os ciclos — processos `next dev` acumulam-se. Corrigir na config e2e do Playwright: usar `webServer` (arranca o dev server se não estiver up, mata-o no fim, `reuseExistingServer: true` para dev local). Actualizar `qa.md` (Fase 2, passo "Sempre execute esta fase") para deixar de assumir servidor pré-existente.
- **Ganho:** QA reprodutível de ambiente limpo + fim dos órfãos.

### D2. Auditoria periódica do gasto por agente — medir antes de optimizar mais

- [ ] Uma vez por leva: registar tokens consumidos por fase da pipeline (PO/Designer/Frontend/SM/Engineer/QA/Security) no fim de cada feature, numa tabela neste ficheiro. A Fase 1 nasceu de uma medição real (~166k tokens num ciclo de QA); sem números novos, a próxima optimização é palpite.
- **Regra:** só se optimiza o que se mediu. Se a medição mostrar que o QA visual é agora o maior custo, esse é o próximo alvo — não antes.

## O que NÃO entra nesta leva

- Alterar o self-check do Engineer (typecheck+lint pós-implementação mantém-se — feedback imediato, decisão da Fase 1).
- Regressão E2E completa no CI (só smoke, e só após C1-C3; alargamento é decisão futura registada).
- Deploy/CD.
- Badge de README (continua sem existir README; reabrir se um for criado).

## Ordem de execução recomendada

```
A1 (utilizador) → A2 → A3 ─┐
                            ├→ B1 → B2 → B3 → B4 (investigação)
A4, A5, A6 (paralelo a B) ─┘
C1 → C2 → C3 → C4 (sequencial — cada um é gate do seguinte)
D1 em qualquer altura; D2 no fim de cada feature
```

> **Estado 2026-08-07:** FEITOS e merged — **A2** (gh instalado+autenticado), **A4** (guard supply-chain no auto-heal do lockfile, PR #8), **A5** (job `security-audit`/`npm audit` no CI + reviewer lê do CI, PR #9), **A6** (decidido: opção processo — abrir a PR enquanto o run do push está `in_progress`; sem mudança de infra), **B1** (lint cobre `tests/`, PR #4), **B2** (script `test:unit` + `ci.yml` a usá-lo, PRs #4/#7), **B3** (`@types/node` ^24, PR #6). POR FAZER — **A1** (branch protection, acção do utilizador), **A3** (praticado, falta a regra no CLAUDE.md), **B4** (investigação), bloco **C** (E2E em CI), bloco **D** (robustez do processo).

Itens B4, C1, D1 são pequenos e maioritariamente independentes — candidatos a uma única sessão de engineer. C2-C4 são a espinha da Fase 2 e merecem pipeline própria.

[ignorar essa linha]
