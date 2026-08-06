# FINTrack — CI Fase 1: gate determinístico em GitHub Actions

> Objetivo aprovado em 2026-08-06; spec refinada e decisões fechadas em 2026-08-06 (mesma data, sessão de refinamento). **Só a Fase 1.** A Fase 2 (E2E em CI) está explicitamente fora deste TODO.
> A feature anterior (Import CSV Trading212) está concluída e versionada — recuperável no histórico git deste ficheiro.

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

### 1. `.github/workflows/ci.yml` — FEITO 2026-08-06

- [x] Triggers: `push` (todas as branches, `branches: ["**"]`) + `pull_request` (para `main`).
- [x] Runner `ubuntu-latest`; **Node 24** (`node-version: 24`); cache de npm via `actions/setup-node@v4` (`cache: npm`).
  - Nota (não bloqueia, não-objetivo desta fase): `@types/node` está em `^20` no package.json — desalinhado com o runtime 24; alinhar fica para depois.
- [x] `concurrency` group `ci-${{ github.ref }}` com `cancel-in-progress: true`.
- [x] `timeout-minutes: 10` no job.
- [x] Passos, nesta ordem (qualquer um vermelho falha o job — é o gate):
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` (Node 24, `cache: npm`)
  3. `npm ci`
  4. `npm run typecheck`
  5. `npm run lint`
  6. `npx playwright test -c playwright.unit.config.ts`
- [x] SEM `playwright install` de browsers, SEM secrets, SEM webServer, SEM Supabase.

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

- **E2E no CI.** Exige, nesta ordem: (a) projeto Supabase **separado para testes** (não produção); (b) fixture sintética/anonimizada commitada (a real `positions_export/trading212.csv` é gitignored por conter dados pessoais); (c) correcção do drift da `E2E_PASSPHRASE`; (d) resolução da flakiness G-05 (isolamento de estado por spec). É um mini-projeto próprio — pôr E2E flaky em CI produziria vermelho por instabilidade, não por bugs, custando mais tempo de dev e minando a confiança no gate.
- Build de produção / deploy no CI.
- Alinhamento de `@types/node` com Node 24 (nota na Tarefa 1).
- Alterar o self-check do Engineer (mantém-se como está).

## Execução

Tarefa de **infra/CI** — sem UI e sem lógica de negócio, por isso `Designer` e `Frontend` não se aplicam (decisão consciente, análoga ao `db-schema-designer` estar fora do pipeline). Implementação pelo `engineer` (ou directa); a "verificação" é o próprio primeiro run verde do CI.

## Verificação

- [x] **Baseline local verde (2026-08-06):** correndo o gate exacto do CI localmente — `npm run typecheck` (exit 0), `npm run lint` (exit 0), `npx playwright test -c playwright.unit.config.ts` (**75 passed**). O primeiro run do CI vai passar verde; não há dívida pré-existente a limpar.
- [x] **Push feito (2026-08-06):** branch `ci/deterministic-gate` está em `origin`. O trigger `push` (todas as branches) disparou o CI — run `31120160661` foi criado (Actions activo no repo).
- [!] **BLOQUEIO CONFIRMADO — GitHub não atribui runner a esta conta (2026-08-06):** provado via API pública com DOIS runs consecutivos, ambos com o mesmo desfecho:
  - Run `31120160661` (commit `0b57f5d`): `conclusion=failure`, job `cancelled`, `runner=[]`, 0 passos executados. Ficou ~15min sem runner e foi cancelado.
  - Run `31121167352` (commit `624095a`, re-trigger deliberado): idêntico — `conclusion=failure`, job `cancelled`, `runner=[]`, 0 passos.
  - Conclusão factual: NÃO é incidente transitório (dois runs, mesma assinatura) nem erro do `ci.yml` (Actions cria o run; nenhum passo chega a correr). É **estado da conta GitHub**: em repo público os runners hosted são grátis/ilimitados, logo runner nunca atribuído = **Actions restrito/suspenso na conta** (causa mais provável: billing — fatura em atraso ou limite de gasto a $0; ou conta por verificar).
  - **Prova adicional com workflow smoke (`.github/workflows/smoke.yml`, um só `echo`, commit `4cf6978`):** o push NÃO criou nenhum run — `total_count` de runs do repo ficou em 2 (só os CI antigos), zero runs para `4cf6978`. Ou seja, o GitHub deixou de sequer AGENDAR runs (evolução: primeiro criava run sem runner → depois nem cria). Confirma que o problema não é o `ci.yml` nem os runners hosted, é o Actions desligado/suspenso na conta.
  - **Acção do utilizador (única forma de destravar):** GitHub → Settings → Billing and plans (verificar fatura pendente / spending limit) e Settings → Actions → General (verificar se Actions está permitido / não "Disable actions"). Sem isto, NENHUM dos itens de verificação abaixo pode correr.
  - URLs: https://github.com/HenriqueRulez/FINTrack/actions/runs/31120160661 · https://github.com/HenriqueRulez/FINTrack/actions/runs/31121167352 · https://github.com/HenriqueRulez/FINTrack/actions
- [ ] Prova de que o gate morde: um push com um unit test propositadamente partido deixa o CI vermelho. **(requer push)**
- [ ] Prova de que a branch protection morde: com o check vermelho, a PR de teste não permite merge; com verde, permite. **(requer branch protection configurada + push)**
- [x] `.claude/agents/qa.md` sem execução de typecheck/lint (Fase 1, passo 15 da Fase 4 e template actualizados — feito 2026-08-06) e `CLAUDE.md` com a regra do CI registada (feito 2026-08-06).

## Passos manuais do utilizador (o que não pôde ser automatizado nesta sessão)

Tudo o que é ficheiro está feito e localmente verificado verde. Falta só o lado GitHub, que precisa das tuas credenciais:

1. **Commit + push da branch** (o ci.yml já existe local, mas o CI só corre depois de estar no GitHub). Sugestão de fluxo, alinhado com o próprio plano (feature em branch → PR):
   ```
   git checkout -b ci/deterministic-gate
   git add .github/workflows/ci.yml CLAUDE.md TODO.md .claude/agents/qa.md
   git commit
   git push -u origin ci/deterministic-gate
   ```
   Abre a PR para `main` no GitHub — o run de CI aparece no separador Checks.
2. **Branch protection** (Settings → Branches → Add rule / ou Rulesets) em `main`: "Require status checks to pass before merging" e selecionar o check **`Deterministic gate`** (só aparece na lista depois do primeiro run). Marca também "Require a pull request before merging" se quiseres bloquear push directo.
3. **Provas do gate** (opcional, mas é a verificação real): parte um unit test de propósito num commit → CI vermelho → PR bloqueada; reverte → verde → PR desbloqueada.
