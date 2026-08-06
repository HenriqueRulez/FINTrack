# FINTrack — CI Fase 1: gate determinístico em GitHub Actions

> Objetivo aprovado em 2026-08-06. **Só a Fase 1.** A Fase 2 (E2E em CI) está explicitamente fora deste TODO.
> A feature anterior (Import CSV Trading212) está concluída e versionada — recuperável no histórico git deste ficheiro.

## Objetivo central — porque isto existe

Tirar a camada de verificação **determinística** do subagente QA e passá-la para GitHub Actions, com um fim claro: **reduzir ao máximo o gasto de tokens, automatizando o máximo de testes possível sem que o agente QA os tenha de correr — mantendo 100% da qualidade, eficiência e segurança do aplicativo.**

Hoje o QA (um subagente LLM) corre `typecheck`, `lint` e os 75 unit tests a cada ciclo. É trabalho 100% determinístico, que não precisa de inteligência nenhuma e que queima tokens (ex.: ~166k tokens num único ciclo de QA). Movê-lo para CI:

- **Minimiza tokens ao máximo:** o agente deixa de executar estes testes; passa apenas a LER o resultado verde/vermelho do CI (ou nem isso, quando o gate já protege a PR).
- **Automatiza o máximo de testes fora do agente:** typecheck + lint + todos os unit tests correm sozinhos, a cada push/PR, sem intervenção.
- **Mantém 100% da qualidade, eficiência e segurança:** o gate é exactamente o mesmo conjunto de verificações — nada é removido, relaxado ou saltado. Só muda quem as executa: CI grátis e reprodutível, em vez de um agente pago. A segurança do app não depende destes testes correrem num agente; depende de correrem sempre — e o CI garante isso melhor.

## Escopo — SÓ Fase 1

Um workflow que corre, a cada push e PR, a camada que não precisa de browser, banco nem secrets:

```
npm ci → npm run typecheck → npm run lint → npx playwright test -c playwright.unit.config.ts
```

Factos que tornam isto seguro e barato (validados 2026-08-06):

- `playwright.unit.config.ts`: `testDir: tests/unit`, `fullyParallel`, **sem webServer, sem browser, sem banco** (comentário explícito na própria config).
- 75 unit tests determinísticos (parser CSV, mapper T212, ledger, fx, derive, chart-series, financial-edge, write-path).
- `package-lock.json` versionado → `npm ci` reprodutível.
- **Zero secrets:** nada toca Supabase, Yahoo Finance ou Anthropic. Nenhuma chave é exposta ao CI.

## Tarefas

### 1. `.github/workflows/ci.yml`

- [ ] Triggers: `push` (todas as branches) + `pull_request` (para `main`).
- [ ] Runner `ubuntu-latest`; Node 20 LTS (alinhar com a versão local); cache de npm via `actions/setup-node`.
- [ ] Passos, nesta ordem (qualquer um vermelho falha o job — é o gate):
  1. `actions/checkout`
  2. `actions/setup-node` (Node 20, `cache: npm`)
  3. `npm ci`
  4. `npm run typecheck`
  5. `npm run lint`
  6. `npx playwright test -c playwright.unit.config.ts`
- [ ] SEM `playwright install` de browsers, SEM secrets, SEM webServer, SEM Supabase.

### 2. Integração no fluxo de trabalho

- [ ] Actualizar `CLAUDE.md`: o gate determinístico (typecheck/lint/unit) passa a ser responsabilidade do CI, não do QA. O QA foca-se no que exige agente (E2E/visual) e apenas LÊ o status do CI — não re-executa a camada determinística.
- [ ] (Opcional) Badge de status do CI no `README`.

## O que NÃO entra — Fase 2, fora deste TODO

- **E2E no CI.** Exige, nesta ordem: (a) projeto Supabase **separado para testes** (não produção); (b) fixture sintética/anonimizada commitada (a real `positions_export/trading212.csv` é gitignored por conter dados pessoais); (c) correcção do drift da `E2E_PASSPHRASE`; (d) resolução da flakiness G-05 (isolamento de estado por spec). É um mini-projeto próprio — pôr E2E flaky em CI produziria vermelho por instabilidade, não por bugs, custando mais tempo de dev e minando a confiança no gate.
- Build de produção / deploy no CI.

## Execução

Tarefa de **infra/CI** — sem UI e sem lógica de negócio, por isso `Designer` e `Frontend` não se aplicam (decisão consciente, análoga ao `db-schema-designer` estar fora do pipeline). Implementação pelo `engineer` (ou directa); a "verificação" é o próprio primeiro run verde do CI.

## Verificação

- [ ] Primeiro run do CI passa verde numa PR de teste.
- [ ] **Aviso de baseline:** o primeiro run corre typecheck/lint sobre o repo INTEIRO, não só sobre uma feature. Se houver dívida pré-existente noutros ficheiros, aparece aqui. É o baseline real — limpar se vier vermelho.
- [ ] Prova de que o gate morde: um push com um unit test propositadamente partido deixa o CI vermelho.
- [ ] Confirmar que o QA deixou de correr typecheck/lint/unit no seu fluxo (passa a ler o status do CI).
