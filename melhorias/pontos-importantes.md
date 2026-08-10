# Pontos Importantes — Self-Improvement

> Registo acumulado. Cada entrada segue: [Criticidade] - Sessão [data] / Pergunta / Resposta / Como melhorar / Arquivo.
> Regra: só factos verificados, sem especulação, sem complacência.

---

[MÉDIO] - Sessão: 06-08-26 às 10:14
Quais são os pontos que estou menos confiante?
Resposta:
- **Estado real da suite E2E.** Corri a suite completa 1× (envenenada pelo teste de logout) e o subconjunto isolado (holdings/performance/transactions) 2×, com resultados INCONSISTENTES: testes de holdings que passaram na 1ª corrida falharam na 2ª por contaminação de estado (partilham um só ledger do user de teste). Logo, NÃO tenho um verde reproduzível para estas specs. O que está sólido é o desbloqueio de auth (setup passa) e a correção da matemática (51 testes unitários verdes, determinísticos). O que NÃO está sólido é a taxa de aprovação real do E2E — é flaky.
- **Se a linha antiga da main (backup) tem otimizações salváveis.** Verifiquei que a main atual faz 1 request Yahoo por ticker (`getQuotes` em `src/lib/yahoo-finance/client.ts:200`, P-01 ainda aberto) e não tem `scripts/db-backup`. O CLAUDE.md da linha antiga (`main-backup-prepromote`) afirma `prices.ts` com "batch 1-request-N-tickers". Não confirmei em CÓDIGO se o batch foi realmente implementado nessa linha — só o afirma a doc. Confiança: média.
Como melhorar:
- E2E: dar isolamento por spec (tickers únicos por ficheiro + cleanup transaccional garantido) antes de confiar num número de aprovação. Nunca reportar "passa" a partir de uma única corrida flaky.
- Salvamento: correr `git diff main main-backup-prepromote -- src/lib/portfolio/prices.ts src/lib/yahoo-finance/` para confirmar factualmente se o batch (P-01) existe no backup e vale cherry-pick.
Arquivo: `src/lib/yahoo-finance/client.ts`, `tests/e2e/*.spec.ts`

---

[ALTO] - Sessão: 06-08-26 às 10:14
Qual é o maior ponto que estou a deixar passar sobre a situação? O que não compreendo?
Resposta:
- **Promover a branch a `main` pode ter REGREDIDO trabalho que só existia na linha sem-auth (agora em `main-backup-prepromote`).** Facto verificado: a `main` atual não tem `scripts/`, não tem `db:backup`/`db:restore` no `package.json`, e mantém o fan-out de 1 request/ticker ao Yahoo. A linha antiga tinha commits dedicados a scripts de backup (`08c3b99`) e a doc afirma batch de quotes. A premissa implícita de que "a branch do AUDIT é estritamente melhor que a main" pode ser falsa em performance/tooling — houve DUAS linhas de trabalho paralelas desde 2026-08-04 e cada uma tem coisas que a outra não tem.
- **A app deixou de ser "single-user" de facto.** Esta sessão criou um user de teste dedicado (`e2e@fintrack.local`) no MESMO projeto Supabase Cloud. A justificação de segurança aceite ("app single-user, cache poisoning auto-infligido") já não é literalmente verdadeira: o Cloud tem agora 2 principais autenticados.
Como melhorar:
- Antes de qualquer promoção/merge de branches divergentes, correr `git diff`/`git log` das duas pontas e listar o que CADA lado tem a mais — apresentar isso ao dono ANTES de escolher, não depois. (Lição de processo para o Claude: verificar a relação branch↔main logo no início quando um merge é antecipado, não no fim.)
- Fazer um diff dirigido `main` vs `main-backup-prepromote` e cherry-pick do que valha (candidatos: P-01 batch quotes, scripts de backup se aplicáveis ao modelo Cloud).
Arquivo: `main-backup-prepromote` (branch git), `TODO.md` (P-01)

---

[ALTO] - Sessão: 06-08-26 às 10:14
Levando em conta o /goal do AUDIT, há algum ponto importante a passar? (regra de negócio, segurança, inconsistência de requisitos)
Resposta:
- **Rede de segurança de testes E2E está partida num app financeiro.** O AUDIT fechou 15/15 nos pontos, mas a suite E2E não fica verde (logout com `signOut()` GLOBAL que revoga a sessão partilhada — `logout-button.tsx:16`; specs desatualizados que esperam 13 tx mock removidas no F-04; contaminação de estado; drift spec-vs-UI). Num tracker de dinheiro, sem E2E fiável uma regressão de cálculo/UX pode passar despercebida. Registado como G-05 no TODO, mas é maior que "higiene".
- **Inconsistência de segurança introduzida ESTA sessão:** o parecer do Security Review aceitou o cache poisoning do `price_cache` (RLS `USING(true)`) com o argumento "app single-user". Como agora existe um 2º user (o de teste) no mesmo Cloud, esse 2º principal pode escrever no `price_cache` e falsear preços mostrados ao owner (TTL 15 min). Risco real baixo (user controlado, só para testes), mas a JUSTIFICAÇÃO escrita ficou factualmente incorreta.
- **Requisito vs realidade:** o CLAUDE.md do projeto (agora na main) descreve app auth+Cloud; a memória de projeto tinha registado esta divergência como confusão desde 2026-08-05 — ou seja, o repo esteve em estado ambíguo por dias e ninguém tinha reconciliado o git com a realidade da app até esta sessão.
Como melhorar:
- Tratar a dívida E2E (G-05) como gate antes de considerar o AUDIT "encerrado operacionalmente": decidir `signOut({ scope: 'local' })` vs isolar o teste; apagar/reescrever specs mortos; isolar estado por spec.
- Reavaliar a aceitação do `price_cache`: ou apagar o user de teste do Cloud quando não se testa, ou restringir a política de escrita, ou atualizar o texto do achado para reconhecer o 2º principal. Não deixar uma justificação de segurança que já não é verdadeira.
Arquivo: `SECURITY_FINDINGS.md`, `TODO.md` (G-05), `tests/e2e/dashboard-visual-redesign.spec.ts`

---

[MÉDIO] - Sessão: 06-08-26 às 13:26
Quais são os pontos que você está menos confiante?
Resposta:
- **Qualidade do código da feature `csv-import`, em primeira mão.** Orquestrei a pipeline inteira por subagentes e NÃO li a lógica dos ficheiros de implementação (parser `csv.ts`, mapper `trading212.ts`, endpoint `route.ts`). O que confirmei EU PRÓPRIO: os ficheiros existem (git status) e a `0014_import_support.sql` é de facto aditiva (li-a: `ADD COLUMN` + índice parcial, reversível). Tudo o resto sobre correcção do código é relato do Engineer/QA/Security, não verificação minha. Confiança: média — apoiada em evidência indirecta forte (o E2E importou 56 linhas via o endpoint que escreve `external_id`, logo as colunas existem no Cloud), mas não é leitura directa.
- **Reprodutibilidade do E2E 12/12.** O QA reportou 12/12 num spec novo (`tests/e2e/csv-import.spec.ts`). Não tenho evidência de que foi corrido mais do que uma vez. A lição registada na sessão de 10:14 (mesmo dia) foi explícita: "nunca reportar verde a partir de uma corrida flaky". Este spec auto-semeia (o `beforeAll` limpa e repovoa), por isso é internamente determinístico, mas a estabilidade sob repetição/concorrência com os outros specs NÃO foi medida.
- **Direcção do fx fora da fixture.** O mapper escolhe a direcção do exchange rate (directo vs 1/rate) por reproduzir o `Total (EUR)` da linha. Para a fixture real dá 0 erros. NÃO verifiquei robustez para exports arbitrários do T212 onde ambas as direcções possam cair dentro do EPS — num tracker de dinheiro, uma escolha errada corrompe silenciosamente o custo médio. Os CAs só afirmam o resultado da fixture, não a robustez do heurístico.
Como melhorar:
- Antes de dar uma feature financeira por fechada, ler pessoalmente pelo menos o núcleo de cálculo (mapper de fx, oversell guard) mesmo quando a pipeline aprova — o custo de contexto é justificável quando o output é dinheiro.
- E2E: correr o spec novo 2–3× (e junto do resto da suite) antes de afirmar verde; medir, não assumir.
- fx: adicionar um unit test adversarial com uma linha onde as duas direcções competem, para provar que o heurístico falha-fecha (marca erro) em vez de escolher em silêncio.
Arquivo: `src/lib/import/trading212.ts`, `tests/e2e/csv-import.spec.ts`

---

[ALTO] - Sessão: 06-08-26 às 13:26
Qual é o maior ponto que eu estou deixando passar sobre a situação no momento? O que eu não compreendo?
Resposta:
- **Apliquei uma alteração de schema ao Supabase Cloud cujo ficheiro de migração NÃO está versionado.** Facto verificado por git status: `supabase/migrations/0014_import_support.sql` aparece como `??` (untracked) e o Engineer já a aplicou ao Cloud (`yes | npx supabase db push`). Ou seja, o Cloud está À FRENTE do controlo de versões: a coluna existe na base de produção mas a migração não está em nenhum commit. Um clone limpo do HEAD não tem a `0014`; e o auto-confirm removeu o gate humano ANTES desse desalinhamento ser notado. A soma de B-16 (auto-confirm) + ficheiro untracked é pior que cada parte isolada.
- **Toda a suite E2E corre contra o Cloud de produção — não há isolamento.** Não há BD local (sem Docker; projecto ligado ao Cloud `oxcrzaquvjljcyrtekcx`). Esta sessão LIMPOU o ledger do user `e2e@fintrack.local` e deixou lá 56 transacções Trading212. Isto liga-se DIRECTAMENTE às duas flags ALTO da sessão das 10:14 (2º principal no Cloud; justificação do `price_cache` já falsa): cada ciclo de teste degrada mais a premissa "single-user" e muta estado real. O QA foi honesto que isto agrava o G-05 (quebra `transactions-ledger.spec.ts`, que espera 13 tx semeadas).
- **Nada foi commitado.** O `/goal` ("concluir o TODO.md, funcionando e testado") está cumprido na working tree, mas 6 ficheiros modificados + 8 novos estão por versionar. "Concluído" no código ≠ "concluído" no repositório.
Como melhorar:
- Regra de processo: uma migração aplicada ao Cloud tem de ser committada NO MESMO passo — aplicar sem versionar cria drift silencioso. Verificar `git status` do ficheiro de migração imediatamente após `db push`.
- Reconhecer que "app single-user" já não descreve o Cloud (2 principais, estado de teste acumulado). Decidir de vez: BD local efémera para E2E, OU um projecto Supabase separado para testes, OU limpeza transaccional garantida. Não deixar testes a mutar produção.
- Ao fechar um `/goal`, dizer explicitamente ao dono o que ficou por commitar e perguntar se quer commit — não deixar implícito.
Arquivo: `supabase/migrations/0014_import_support.sql`, `tests/e2e/`, `SECURITY_FINDINGS.md` (B-16)

---

[ALTO] - Sessão: 06-08-26 às 13:26
Levando em consideração o que foi feito nesse último /goal, existe algum ponto importante que estou deixando passar? (regra de negócio, segurança, inconsistência de requirements)
Resposta:
- **Regra de negócio (correcção monetária) — o heurístico de direcção do fx pode falhar em silêncio.** Já descrito na Pergunta 1, mas é regra de negócio, não só confiança: o mapper infere a direcção do câmbio por bater com o `Total (EUR)`. Num ledger de custo médio, uma inferência errada não gera erro visível — gera um preço de compra errado que se propaga a holdings/performance. A feature está aprovada com base numa única fixture (T212, moedas EUR/USD). Requisito implícito não coberto: comportamento com GBP real e com linhas onde a direcção é ambígua.
  - **CORRECÇÃO (após ler `normalizeFx`, mesma sessão às ~13:40):** rebaixo isto de ALTO para BAIXO. Escrevi o parágrafo acima com base no resumo do Engineer, ANTES de ler o código — falso positivo meu. A função é fail-closed: testa `rate` e `1/rate`, escolhe a que reproduz o Total, e marca `error` se nenhuma bate dentro da tolerância (~5%). A direcção errada erra por ~`rate²` (≈17% para USD ~1.08, mais para GBP ~0.86), logo é rejeitada. A única janela ambígua é `rate` ∈ [0.975, 1.025] (a ~2.5% da paridade), onde nenhuma das moedas suportadas EUR/USD/GBP vive, e onde o erro máximo seria ~5%. Para as moedas suportadas o heurístico é sólido. Lição: não classificar severidade antes de ler o código-fonte relevante.
- **Segurança/governança — o padrão `yes | npx supabase db push` foi normalizado nesta sessão.** Registado como B-16 (BAIXO, porque a `0014` é aditiva). O risco não é esta migração; é o padrão. O mesmo auto-confirm numa migração destrutiva ou no ambiente errado apaga o último gate humano antes de dano irreversível. Combinado com o ficheiro de migração untracked (Pergunta 2), o Cloud recebeu uma mudança de schema sem confirmação humana E sem rasto em VCS.
- **Inconsistência de requirements/config — `E2E_PASSPHRASE=fintrack` está errado.** O QA confirmou que o valor documentado "fintrack" faz o login falhar (`Invalid login credentials`) e que o `.env.local` real é que prevalece. É drift de configuração que bloqueia o próximo a correr o E2E. Não foi eu que injectei esse valor — vem da config/docs de teste do projecto — mas ficou por reconciliar.
- **Ledger `total` redundante para buy/sell.** O `total` gravado = coluna "Total (EUR)" do ficheiro, mas holdings/performance recomputam de `qty·price·fx` para buy/sell. Os dois podem divergir; hoje o `total` é display-only nesses tipos, mas é uma fonte latente de confusão (dois números que deviam ser um).
Como melhorar:
- fx: teste adversarial + decidir a política explícita "em ambiguidade, marca erro" (fail-closed) e documentá-la no working item, não só no código.
- Governança: proibir auto-confirm de `db push` para migrações não-aditivas; exigir revisão de `db diff` + confirmação manual (já recomendado em B-16 — elevar de recomendação a regra no CLAUDE.md se o dono concordar).
- Reconciliar `E2E_PASSPHRASE`: alinhar docs/config de teste com o `.env.local` real antes da próxima corrida E2E.
Arquivo: `src/lib/import/trading212.ts`, `SECURITY_FINDINGS.md` (B-16, B-17, B-18), `.env.local`

---

[MÉDIO] - Sessão: 10-08-26 às 09:33
Quais são os pontos que você está menos confiante?
Resposta:
- **O caminho de login REAL do dono nunca foi exercido de ponta a ponta.** No FIN-8 movi a auth para `POST /api/auth/login` (server-side). O QA provou por curl que um login válido devolve `200` + cookie de sessão e que `/dashboard` fica acessível — MAS usando a conta de teste `e2e@fintrack.local` (aliasada temporariamente em `AUTH_OWNER_EMAIL`), não a passphrase real de `owner@fintrack.local` (que não existe em nenhum ficheiro acessível), e sem browser real (Chrome Extension offline). Logo, o fluxo que o dono usa de facto — email fixo do owner + a sua passphrase, na UI — não foi verificado nesta sessão. Confiança na lógica do código: alta; no fluxo do owner em produção: não verificado.
- **Zero cobertura de CI da nova rota de login.** Verifiquei que o `e2e-smoke` do CI corre APENAS `smoke.spec.ts` (`playwright.smoke-public.config.ts`, `testMatch: /smoke\.spec\.ts/`), que testa redirect + render da passphrase, NÃO um POST real a `/api/auth/login`. O gate required (Deterministic gate) é typecheck+lint+unit. O meu spec novo é local-only. Resultado: a rota de auth mais crítica da app não tem nenhum teste automático em CI — uma regressão no cookie/sessão do server client passaria verde.
- **A premissa do FIN-9 (que `@supabase/ssr@0.12.4` corrige o colapso para `never`) é inferência, não facto.** Baseia-se na peerDependency `supabase-js ^2.111.0` declarada pela 0.12.4; NÃO fiz o upgrade nem testei. É uma hipótese razoável, não verificada.
Como melhorar:
- Para mudanças de auth, exigir prova do fluxo real (conta do owner, browser real) OU um teste de CI dedicado à rota de login antes de merge — curl com conta aliasada é evidência parcial, não suficiente para o gate.
- Antes de abrir um item de "upgrade X corrige Y", validar a hipótese num branch descartável (upgrade + typecheck) e anexar o resultado ao item, em vez de inferir do peer range.
Arquivo: `src/app/api/auth/login/route.ts`, `playwright.smoke-public.config.ts`, `tests/e2e/fix-email-hardcoded-passphrase.spec.ts`

---

[ALTO] - Sessão: 10-08-26 às 09:33
Qual é o maior ponto que eu estou deixando passar sobre a situação no momento? O que eu não compreendo?
Resposta:
- **O braço de QA visual da pipeline está NÃO-FUNCIONAL e mesmo assim continuámos a fazer merge.** A Chrome Extension esteve indisponível ("Browser extension is not connected") nas DUAS execuções de QA desta sessão (FIN-8 e FIN-4). Como a verificação visual é o único gate visual da pipeline, ambas as features foram para `main` com QA PARCIAL — nunca vistas num browser real. Registei BUG-2 e BUG-3, mas o ponto sistémico é maior: fundi DUAS mudanças de UI de autenticação (login e logout) sem uma única verificação visual real, e o padrão "extensão offline → PARCIAL → merge na mesma" repetiu-se sem eu questionar se o gate está de facto operacional.
- **Combinado, o risco é auth sem rede de segurança de runtime.** O gate required do CI não corre login/logout; o smoke não cobre a nova rota; o QA de browser esteve cego. Para um refactor de auth numa app de dinheiro, o comportamento em runtime foi validado só por curl headless com conta aliasada. Não compreendo ainda a CAUSA da extensão estar offline (config? sessão? processo do QA?) — e sem isso, o gate visual continuará a falhar silenciosamente na próxima feature.
Como melhorar:
- Tratar "Chrome Extension indisponível" como FALHA de gate, não como PARCIAL-que-se-funde: ou se resolve a ligação antes do merge, ou o dono decide explicitamente aceitar o risco por escrito. Não normalizar o merge-à-volta-do-gate.
- Diagnosticar de raiz porque é que `tabs_context_mcp` devolve "not connected" nesta máquina antes da próxima feature com UI — é a 2ª sessão consecutiva afectada.
Arquivo: `.claude/agents/qa.md`, `.issues/bugs.md` (BUG-2, BUG-3)

---

[ALTO] - Sessão: 10-08-26 às 09:33
Levando em consideração o que foi feito nesse último /goal, existe algum ponto importante que estou deixando passar? (regra de negócio, segurança, inconsistência de requirements)
Resposta:
- **Segurança — o rate limit que "validei" no login é ineficaz no deploy real.** O FIN-8 protege `/api/auth/login` com `rateLimit()` por IP (10/min). Mas `src/lib/rate-limit.ts:12-14` é um `Map` em memória, com comentário do próprio autor: "resets on server restart / Replace with Upstash Redis in v2 for multi-instance deployments". Num ambiente serverless/multi-instância (típico de Next em produção), o limite é POR INSTÂNCIA, não global — cada cold start tem o seu Map, e a passphrase é o ÚNICO segredo da app. Ou seja, a única defesa anti-brute-force do login pode ser largamente contornável em produção, e eu tratei-a como "presente e correcta" sem qualificar isto. Não é regressão desta sessão (o rate-limit já era assim), mas ao mover a auth para esta rota tornei-o a defesa central sem o sinalizar.
- **Inconsistência de requirements — a AC do FIN-8 nomeia um teste que não testa o que afirma.** A AC2 dizia "Login por passphrase continua funcional (smoke E2E verde)", mas o smoke público NUNCA faz login (só redirect/render). A própria AC prescreve uma prova que o teste nomeado não pode dar; o QA teve de contornar com curl. AC sub-especificada — cruzar com a lição de 06-08 ("não reportar verde a partir de teste que não cobre o caminho").
- **Reclassificação de achados de segurança para Backlog.** Fechei o FIN-7 movendo B-15/B-18 para o FIN-9, que ficou em **Backlog** (não Todo). São higiene de tipos (o próprio finding diz "não é bypass de segurança"), logo severidade real baixa — mas o padrão de mover findings tagueados de segurança para Backlog ao marcar o pai "Done" merece atenção para não os perder de vista.
- **Cross-reference (padrão recorrente, 3ª sessão):** o BUG-4 que o QA do FIN-4 encontrou — `signOut()` scope=global a envenenar a sessão partilhada dos specs @authed — é EXACTAMENTE o problema descrito nas entradas de 06-08 (10:14 e 13:26) como `logout-button.tsx:16` / G-05. Continua aberto (TD-1/FIN-2 + BUG-4). Um problema previsto há dias, reconfirmado, e ainda sem correcção num app financeiro — a dívida de E2E não está a ser tratada como gate.
Como melhorar:
- Elevar o rate-limit em memória a achado explícito no `SECURITY_FINDINGS.md` (defesa anti-brute-force não-global no login single-secret) e decidir: store distribuído (Upstash) OU aceitar o risco documentado. Não deixar "validei o rate limit" sem a ressalva serverless.
- Ao escrever ACs, garantir que o teste nomeado cobre o caminho afirmado; se não cobre, mudar a AC ou o teste — não deixar o QA contornar.
- Puxar o TD-1/FIN-2 (suite E2E + `signOut` local vs global) para cima: é a 3ª sessão a registá-lo; ou se resolve, ou o dono aceita explicitamente conviver com ele.
Arquivo: `src/lib/rate-limit.ts`, `src/app/api/auth/login/route.ts`, `SECURITY_FINDINGS.md`, `.issues/tech-debt.md` (TD-1/FIN-2), `.issues/bugs.md` (BUG-4)
