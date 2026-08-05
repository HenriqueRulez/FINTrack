# FINTrack — Tarefas

> **Regra:** Toda tarefa passa pelo pipeline completo `PO → Designer → SM → Engineer → QA → Security Review`.
> Claude executa diretamente apenas quando o utilizador pedir explicitamente.

## Redesigns Visuais (pipeline completa — iniciar com PO)

> Cada item abaixo requer o mesmo processo do Dashboard: PO cria working item com base nos protótipos em `.claude/design-handoff/project/`, depois segue pipeline completa. Primeira fase: apenas visual com dados mockados, sem funcionalidades.

- [x] Alteração nas seguintes páginas: _(feito 2026-06-09, execução directa + testes Playwright realinhados)_
  - Holdings
    - Remoção do Botão "Add position" na pagina holdings. Explicação: Holdings deve mostrar a visão geral da carteira de investimentos. Apenas entraremos com dados/editaremos dentro de TRANSACTIONS
    - Por padrão, o botão "native" deve estar selecionado.
  - Performance
    - Adicionar o tipo do ativo, assim como temos na pagina holdings
    - No nome do ativo, adicionar " | LSE " e etc, assim como está na página holdings, mesmo estilo.
- [x] **Holdings** — `Holdings.html` → nova página `/holdings` com 7 KPIs + tabela ordenável com alocação visual por ticker e logo colorido por classe de activo
- [x] **Performance** — `Performance.html` → nova página `/performance` com KPI strip com micro-visualizações (gauge, barra split, tick rows) + tabela de trade analysis com sparklines de 30 dias
- [x] **Transactions** — `Transactions.html` → nova página `/transactions` com filtros, tabs por tipo (BUY/SELL/CASH/DIV/etc.), tabela com badges coloridos e modo de edição
- [x] **Tax Calculator** — `Tax Calculator.html` → nova página `/tax-calculator` com 3 KPIs (Total Tax Liability, Capital Gains Tax, Dividend Tax) + painel Capital Gains + painel Dividend Tax

## Manutenção (manual — fazer EU, não pela pipeline)

- [x] **[EU]** Rever TODOS os agentes em `.claude/agents/*.md` e garantir que seguem o template correcto do `ola-sayer.md`
  - **Template de referência:** `.claude/agents/ola-sayer.md`
  - **O que verificar em cada agente** (`po`, `designer`, `frontend`, `sm`, `engineer`, `qa`, `security-reviewer`, `bug-reporter`, `db-schema-designer`):
    - Frontmatter completo: `name`, `description` (com blocos `<example>`/`<commentary>`), `model`, `color`, `memory: project`
    - Secção **Persistent Agent Memory** presente e a apontar para `.claude/agent-memory/<nome>/`
  - **Objectivo:** uniformizar todos os agentes ao formato do `ola-sayer` (o template validado como correcto)

## Auditoria — itens adiados (fora do ciclo de auditoria de 2026-08)

> Registados aqui por decisão do dono para serem feitos noutro momento. Detalhe completo em `AUDIT_MELHORIAS.md`.

- [ ] **M-01 — Expandir testes unitários da matemática financeira.** Base já existe (`src/lib/portfolio/ledger.ts` + `tests/unit/ledger.spec.ts`, 11 testes). Falta cobrir: conversão fx (moeda ≠ EUR à data), venda parcial vs. total, oversell rejeitado, fees compra vs. venda em cenários combinados. Correr com `npx playwright test -c playwright.unit.config.ts`.

## Features

- [x] Feedback de erro ao adicionar ticker inválido — mostrar mensagem clara quando o ticker não existe no Yahoo Finance (actualmente silencioso)
- [x] Validação/busca de ticker — mecanismo para verificar o ticker correcto antes de salvar (ex: botão "Verificar" que mostra nome + preço antes de confirmar)
- [x] Reformular página de "Holdings", algumas coisas irão se manter, outras alterar ou remover por completo.
  - Deverá ter os campos **Company**, **Tipo**, **Portifolio%**, **Shares**, **Preço médio pago**, **current price**, **Ganho/perda**, **Total investido**
    - Descrição dos campos: - **Company**: mostrar o ticker do item, além disso deve ser adicionado o mercado do ticker em especifico e o ícone do ticker E.g.: "´[icone]´ WEBN.DE | XETRA", "´[icone]´AAPL | NASDAQ" , etc. Basicamente, o jeito que está agora está ótimo, será apenas adicionar o ícone da respectiva company no lugar da letra escrita - **Tipo**: ETF, Stock, Cripto, etc - **Portifolio%**: Do mesmo jeito que está agora, mostra a % total do que eu detenho, baseado na carteira inteira - **Total investido**: Valor mostrando o total investido - **Shares**: Quantidade total que possuo - **Preço médio**: O preço médio deve levar em consideração a soma de todas as entradas de mesmo ticker da segunda tabela, fazendo o calculo correto para definir o preço médio pago pelas posições. DO mesmo jeito que está atualmente - **current price**: valor atual do item - **Ganho/perda**: Valor mostrando o montante total e % (como está atualmente) com base no valor agregado da segunda tabela
    <!--[TBD] - Segunda tabela: **Ticker**, **Nome completo**, **Broker**, **Tipo**, **Quantidade total**, **Preço médio pago**, **valor atual**, **data de compra**
    - Descrição dos campos: (Os omitidos serão como os da tabela 1)
      - **Broker**: Dropdown contendo a lista de possiveis broker (Degiro, Trading212 e Mirae)
      - **data de compra**: Data no padrão DD/MM/YYYY -->
  - Ao clicar no botão "**+ Adicionar posição**", os campos devem corresponder ao necessário das tabelas, com excessão dos campos que serão preenchidos por calculos com base na entrada do utilizador.
  - O campo **MOEDA** deve estar preenchdo com EUR, por padrão
- [ ] Botão de logout na página de Configurações
- [ ] Dashboard com dados reais — patrimônio total (`Σ current_price × quantity`), número de posições, ganho/perda geral, breakdown por tipo de ativo
- [ ] Gráficos no Dashboard — ~4-5 charts relevantes (patrimônio, distribuição por tipo, ganho/perda, evolução)
- [ ] Forçar refresh de preços — botão "Atualizar Preços" na página do portfólio que invalida o cache e busca preços frescos do Yahoo Finance

## Sugestões Fable 5 (análise de 2026-06-10)

> Análise directa do código (Claude, modelo Fable 5) em duas passagens: 1ª — Performance, Segurança e Usabilidade (API + fluxo de dados); 2ª — frontend profundo (componentes, duplicação, formatação, a11y).
> Todos os achados foram verificados no código com referência `ficheiro:linha` — zero suposições.
> Achados já registados em `SECURITY_FINDINGS.md` (M-01, B-03/04/05, B-07/08, B-10/11, B-12) **não** foram duplicados aqui.
> Verificado e sem achados: headers de segurança (`next.config.ts` já tem X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS), CSP com nonce por request (`src/proxy.ts`), padrão canónico auth→rate-limit→Zod→DB em todas as 8 API routes, `user_id` sempre da sessão.

### Performance

- [ ] **P-01 — Cotações Yahoo em lote: 1 request em vez de N** _(prioridade: alta — maior ganho real de latência)_
  - **Facto:** `getQuotes()` em `src/lib/yahoo-finance/client.ts:74-82` faz `Promise.all(tickers.map(getQuote))` → **uma chamada HTTP ao Yahoo por ticker**. O `yahoo-finance2@3.3.0` instalado suporta `quote(string[])` num único request (verificado em `node_modules/yahoo-finance2/esm/src/modules/quote.d.ts:517` — overloads para array com retorno em Array/Map/Object).
  - **Porquê:** com o cache de 15 min expirado, `GET /api/portfolio` e o dashboard pagam N round-trips ao Yahoo. Em lote é 1 round-trip independente do número de posições — menos latência e menos risco de rate-limit/bloqueio pelo Yahoo (o app inteiro depende deste fornecedor não-oficial).
  - **Como aplicar:** em `getQuotes()`, separar tickers com cache válido dos stale; chamar `yahooFinance.quote(staleTickers)` uma única vez; preencher o cache por símbolo a partir do array devolvido. Manter `getQuote()` singular para o `verify-ticker`. Atenção: o tipo manual do `require` (linhas 4-19) precisa de ganhar o overload de array. Testar com tickers mistos (válidos + inválidos) — em lote, um símbolo inexistente não deve derrubar os restantes.

- [ ] **P-02 — `GET /api/portfolio`: N updates paralelos + re-fetch → 1 escrita e zero re-fetch** _(prioridade: média)_
  - **Facto:** `src/app/api/portfolio/route.ts:63-80` faz um `UPDATE` por posição stale (N round-trips ao Postgres) e depois **re-busca a tabela inteira** (linhas 84-91) só para devolver os preços que acabou de escrever.
  - **Porquê:** N+2 queries onde bastavam 2. O re-fetch é dispensável: os novos preços já estão em memória (`quotes`).
  - **Como aplicar:** (1) aplicar os preços em memória sobre o array `positions` já carregado e devolvê-lo directamente, eliminando o re-fetch; (2) substituir os N updates por um único `upsert` com a lista de `{id, current_price, price_updated_at}` (ou uma RPC). Combinar com S-02 (extrair o refresh para um POST dedicado).

- [ ] **P-03 — Dashboard sem streaming: a página bloqueia até o último fetch do Yahoo terminar** _(prioridade: média)_
  - **Facto:** `src/app/(dashboard)/dashboard/page.tsx:208-235` faz `await getDashboardData()` completo (query DB + históricos + quotes de todas as posições) antes de enviar qualquer HTML. Os componentes `HeroSection`, `KpiGrid`, `PortfolioChartClient` e `TopMoversSection` **já aceitam `isLoading`** mas recebem sempre `false`.
  - **Porquê:** no primeiro acesso com cache do Yahoo frio, o utilizador olha para uma página em branco enquanto N chamadas externas terminam. Os dados do DB (hero + KPIs) estão prontos em milissegundos e podiam aparecer de imediato.
  - **Como aplicar:** dividir em async components com `<Suspense>`: hero/KPIs (só DB) renderizam primeiro; chart e movers (dependem do Yahoo) ficam atrás de boundaries com skeleton de fallback (a infra de skeleton já existe em `src/components/ui/skeleton.tsx` e nas props `isLoading`). Sem nova dependência — é só reorganizar a page.

- [ ] **P-04 — Transactions: fetch client-side em `useEffect` cria waterfall** _(prioridade: média — definir o padrão antes da Fase 1 do épico)_
  - **Facto:** `src/components/transactions/TransactionsPage.tsx:161-184` busca `/api/transactions` no mount de um client component. Sequência: HTML → download do bundle → hidratação → fetch → render. O dashboard usa o padrão oposto (fetch server-side, comentário em `dashboard/page.tsx:58`: "no internal HTTP round-trip").
  - **Porquê:** o estado "Loading transactions…" aparece em todos os loads, mesmo com a query a demorar milissegundos. Numa app pessoal local a diferença é pequena, mas o épico vai escalar esta página (CRUD, derivação) — o padrão escolhido agora propaga-se.
  - **Como aplicar:** `src/app/(dashboard)/transactions/page.tsx` (Server Component) faz a query Supabase server-side (como o dashboard) e passa `initialData` como prop; `TransactionsPage` mantém o estado client para filtros/sort e usa o fetch só para revalidar após mutações (Fase 1). Alinhar com o SM antes de implementar a Fase 1.

- [ ] **P-05 — Caches em memória sem purga (consolidação dos achados B-03/B-04/B-05)** _(prioridade: baixa)_
  - **Facto:** já registados em `SECURITY_FINDINGS.md` — `rate-limit.ts:14`, e os dois Maps de cache em `yahoo-finance/client.ts:41,45` crescem sem limite nem sweep.
  - **Porquê está aqui:** não é para duplicar o registo, é para propor **uma resolução única** em vez de três correcções avulsas.
  - **Como aplicar:** um helper partilhado `ttlMap` (Map + TTL + sweep no acesso ou limite LRU de ~200 entradas) em `src/lib/`, usado pelos três. Resolve os três findings num PR pequeno. Para app pessoal é cosmético — fazer quando tocar nesses ficheiros por outro motivo.

- [ ] **P-06 — `TxTable`: componente `SortTh` definido dentro do componente pai — remount dos headers a cada render** _(prioridade: média — bug real de foco, não só perf)_
  - **Facto:** `function SortTh(...)` está declarada **dentro do corpo** de `TxTable` (`src/components/transactions/TxTable.tsx:97-140`) e usada como JSX (`<SortTh col="date" …/>`). Em React, isso cria um tipo de componente novo a cada render do pai → o React desmonta e remonta todos os `<th>` em cada render (cada clique de sort, cada toggle de filtro/density).
  - **Porquê:** além do trabalho de DOM desnecessário, há um efeito visível: **o foco de teclado no botão de sort perde-se** ao ordenar (o botão é destruído e recriado) — quebra navegação por teclado. O `HoldingsTable.tsx` faz certo (array `COLUMNS` + render inline, `SortArrow` top-level); o `TxTable` é a excepção.
  - **Como aplicar:** mover `SortTh` para o top-level do ficheiro, passando `sort`/`onSort` por props (já recebe tudo o que precisa). Mudança mecânica, sem alteração visual.

- [ ] **P-07 — `useAnimations`: 13 instâncias independentes para uma preferência global** _(prioridade: baixa-média)_
  - **Facto:** 13 componentes chamam `useAnimations()` (grep em `src/`), e cada chamada cria o seu próprio `useState` + `useEffect` que lê `localStorage` e escreve a classe `animations-enabled` no `<body>` (`src/hooks/useAnimations.ts:10-21`). Como o estado só é lido no mount, componentes já montados **não reagem** quando o toggle muda nas Settings — só o booleano JS fica stale (a classe do body muda na hora). Detalhe: o gate JS é em grande parte redundante — o CSS já faz o gating (`globals.css:262-282`: `.rise` só anima sob `.animations-enabled`), portanto `animationsEnabled ? "rise" : ""` duplica uma decisão que o CSS já toma.
  - **Porquê:** 13 leituras de localStorage + 13 efeitos a escrever a mesma classe por página, e uma fonte de verdade fragmentada que já diverge na prática.
  - **Como aplicar:** componentes que só usam o booleano para compor a classe `rise dX` podem aplicá-la **incondicionalmente** e deixar o CSS decidir — deixam de precisar do hook. Manter o hook apenas onde o booleano controla comportamento JS (verificar `PortfolioChart`, que pode usá-lo para animação do Recharts) e no `AnimationsToggle`. Se sobrar mais de um consumidor JS, promover a Context no layout. Relaciona-se com o B-09 (flash de hidratação) já registado no `SECURITY_FINDINGS.md`.

- [ ] **P-08 — Peso 300 da IBM Plex Mono carregado e nunca usado** _(prioridade: baixa — ganho pequeno, esforço de uma linha)_
  - **Facto:** `src/app/layout.tsx:8` carrega os weights `["300","400","500","600","700"]`, mas não existe nenhum `font-light` nem `font-weight: 300` em `src/` (verificado por grep; 400-700 têm uso).
  - **Como aplicar:** remover `"300"` do array — um ficheiro de fonte a menos no first load de todas as páginas. Conferir visualmente depois (se algum protótipo HTML em `design-handoff` usar 300, decidir antes).

- [ ] **P-09 — Código morto no frontend: `AddPositionModal` e o array `TRANSACTIONS`** _(prioridade: baixa)_
  - **Facto:** `src/components/holdings/AddPositionModal.tsx` não é importado por nenhum ficheiro (órfão desde a remoção do botão "Add position" da Holdings, TODO linha 12); o array mock `TRANSACTIONS` (13 entradas em `src/components/transactions/mock-data.ts:48-67`) deixou de ter importadores quando a Fase 0 ligou a página à API — só os helpers (`fmt`, `fmtDate`, `TYPE_TABS`, `TYPE_LABEL`) continuam usados.
  - **Porquê:** código morto confunde os agentes da pipeline (vão "encontrar" um modal que parece o caminho certo para a Fase 1) e engorda revisões.
  - **Como aplicar:** apagar `AddPositionModal.tsx` (a Fase 1 do épico vai criar o modal Add em `transactions/`, não reaproveitar este) e remover o array `TRANSACTIONS`, movendo os helpers vivos para um `helpers.ts` (ver também I-02 sobre o naming `mock-data.ts`).

### Segurança

- [ ] **S-01 — Login passphrase: mover o `signInWithPassword` para uma rota server-side** _(prioridade: alta — resolve o M-01 aberto e dá controlo de brute-force)_
  - **Facto:** `src/app/(auth)/passphrase/page.tsx:20-23` chama `supabase.auth.signInWithPassword` directamente do browser com o email `owner@fintrack.local` hardcoded (achado M-01, aberto desde 2026-05-23). Consequência adicional nunca registada: **o rate limiter da app não cobre o login** — `rateLimit()` só corre em API routes nossas; o fluxo actual vai do browser directo ao GoTrue, ficando dependente apenas dos limites default do Supabase Auth.
  - **Porquê:** o login é a única porta da app. Uma rota própria permite: esconder o email do bundle (fecha o M-01), aplicar o nosso `rateLimit()` com janela agressiva (ex.: 5 tentativas/min por IP), e normalizar a resposta de erro.
  - **Como aplicar:** criar `POST /api/auth/login` — pattern canónico mas sem o passo de auth (é a rota que cria a sessão): rate limit por IP → Zod (`passphrase: z.string().min(1).max(200)`) → `signInWithPassword({ email: process.env.LOGIN_EMAIL, password })` com o client server-side de `@/lib/supabase/server` (os cookies de sessão são definidos pelo handler) → 200/401 genérico. A page passa a fazer `fetch("/api/auth/login")`. `LOGIN_EMAIL` **sem** prefixo `NEXT_PUBLIC_`. Ao fechar, mover M-01 para "Resolvidos" no `SECURITY_FINDINGS.md`.

- [ ] **S-02 — `GET /api/portfolio` tem efeitos de escrita (viola semântica de método safe)** _(prioridade: média)_
  - **Facto:** o `GET` escreve `current_price`/`price_updated_at` no banco (`src/app/api/portfolio/route.ts:63-80`). `HoldingsCard.tsx:58-70` explora isso como botão de refresh, **descartando a resposta**.
  - **Porquê:** GET deve ser safe/idempotente (RFC 9110 §9.2.1). GETs com escrita são disparados por qualquer coisa que assuma "GET é inofensivo" (proxies, prefetchers, scanners, testes) e tornam o comportamento dependente de quem leu por último. Também impede cache HTTP futuro.
  - **Como aplicar:** extrair o refresh para `POST /api/portfolio/refresh` (auth → rate limit próprio, ex. 10/min → actualiza preços stale → devolve posições actualizadas). `GET /api/portfolio` passa a só ler. De brinde implementa o item "Forçar refresh de preços" da secção Features e dá um destino real ao botão do `HoldingsCard` (ver U-02).

- [ ] **S-03 — `verify-ticker` aceita qualquer string; `history` valida formato — alinhar pela mais estrita** _(prioridade: média)_
  - **Facto:** `src/app/api/portfolio/verify-ticker/route.ts:7-9` valida apenas `min(1).max(20).trim` — espaços e símbolos arbitrários chegam a `yahooFinance.quote()`. A rota irmã `history/route.ts:8-13` já valida `regex(/^[A-Z0-9.\-]+$/i)`.
  - **Porquê:** defesa em profundidade na fronteira com a lib externa (o yahoo-finance2 monta URLs com este valor) e consistência — duas rotas com regras diferentes para o mesmo conceito é convite a regressão. O plano da Fase 1 do épico reusa o `verify-ticker` no modal Add: alinhar antes de ganhar mais um consumidor.
  - **Como aplicar:** criar `TickerSchema` único em `src/lib/validations/portfolio.ts` (regex + max 20 + transform `toUpperCase`) e importá-lo nas duas rotas (e no futuro modal). Uma fonte de verdade, três usos.

- [ ] **S-04 — Cinco rotas API sem nenhum consumidor na UI — decidir o destino de cada uma** _(prioridade: média)_
  - **Facto:** grep de `fetch("/api` em `src/` devolve exactamente 2 chamadas (`/api/transactions` e `/api/portfolio`). Sem consumidor: `summary`, `chart`, `movers` (o dashboard calcula tudo server-side inline, duplicando a lógica delas), `holdings` (a página Holdings ainda é mock) e `verify-ticker` (o consumidor morreu com a remoção de `/portfolio`, commit `4873021`).
  - **Porquê:** rota exposta é superfície autenticada a auditar e manter; `chart`/`movers` disparam chamadas Yahoo por request. Pior: a lógica de summary/chart/movers existe **em dois sítios** (rotas + `dashboard/page.tsx`) — vão divergir.
  - **Como aplicar (decisão por rota, não em bloco):** `verify-ticker` — **manter** (reservada pelo plano da Fase 1 para o modal Add). `holdings` — **manter** (é o alvo do wiring da Fase 2). `summary`/`chart`/`movers` — escolher uma fonte: ou o dashboard passa a consumi-las (e remove a lógica inline), ou removem-se as rotas e a lógica vive só no server component; recomendação: remover as rotas — o dashboard é Server Component, o round-trip HTTP interno não acrescenta nada. Antes de remover, verificar os testes e2e que as referenciam.

### Usabilidade

- [ ] **U-01 — Páginas com dados fictícios sem qualquer indicação visual** _(prioridade: alta — é uma app financeira)_
  - **Facto:** Holdings (`HoldingsPage.tsx:10-13` importa `HOLDINGS` do mock, com FX fixo EUR↔USD 1.09/0.92 em `holdings/mock-data.ts:135-138`), Performance e Tax Calculator renderizam dados de `mock-data.ts`. Dashboard e Transactions já mostram dados reais. Nada na UI distingue umas das outras.
  - **Porquê:** o utilizador navega de uma página com o património real para outra com números inventados **com o mesmo aspecto de produção**. Numa app de finanças, confundir demo com real é o pior erro de UX possível.
  - **Como aplicar:** badge discreto "demo data" no `PageHead` das 3 páginas mock (um span com `text-muted-foreground` + borda, estilo dos badges existentes), removido quando a Fase 2 ligar cada página ao ledger. Esforço de minutos, elimina o risco até a derivação chegar.

- [ ] **U-02 — Botão refresh do Holdings: spinner gira, nada acontece** _(prioridade: média — resolvido de graça pelo S-02)_
  - **Facto:** `HoldingsCard.tsx:58-70` faz `fetch("/api/portfolio")` e descarta a resposta; a tabela continua a mostrar o mock (o próprio comentário no código o admite). O spinner de 400ms comunica "actualizei os preços" — falso.
  - **Como aplicar:** curto prazo, esconder o botão enquanto a página for mock (coerente com U-01). Definitivo: na Fase 2, o botão chama o `POST /api/portfolio/refresh` do S-02 e a tabela re-busca os holdings.

- [ ] **U-03 — Delete de transações abre `alert()` nativo** _(prioridade: média — entra na Fase 1 do épico)_
  - **Facto:** `TransactionsPage.tsx:264-266` — `alert("Would delete N transaction(s)")`, stub conhecido da Fase 0.
  - **Porquê:** alert nativo quebra o design system (o projecto tem `src/components/ui/alert-dialog.tsx` exactamente para isto) e bloqueia automação de browser — o QA do projecto usa Chrome real e dialogs nativos penduram a sessão de testes.
  - **Como aplicar:** na Fase 1, `DELETE /api/transactions` real com `AlertDialog` de confirmação. Até lá, preferível desactivar o botão Delete (tooltip "available soon") a manter um alert que finge funcionar.

- [ ] **U-04 — Transactions abre na tab "Buy/Sell" mostrando 7 de 13 transações** _(prioridade: baixa — decisão de produto)_
  - **Facto:** `activeTab` inicial é `"bs"` (`TransactionsPage.tsx:141`); a tab All mostra as 13. O QA da Fase 0 já tinha registado a observação.
  - **Porquê:** primeira impressão de um ledger deve ser o livro completo; abrir num subconjunto sugere que faltam registos.
  - **Como aplicar:** mudar o default para `"all"` (uma linha) — mas validar com o PO se o default "bs" veio do protótipo de propósito.

- [ ] **U-05 — "Show: N" não é paginação — transações além das primeiras N ficam inacessíveis** _(prioridade: baixa hoje, alta quando o ledger crescer)_
  - **Facto:** `paged = filtered.slice(0, pageSize)` (`TransactionsPage.tsx:228-231`); o `TxFooter.tsx` só oferece 10/20/50/100, sem navegação de páginas. Com 101+ transações numa tab, as restantes são invisíveis.
  - **Porquê:** com CRUD real (Fase 1) e uso contínuo, o ledger ultrapassa 100 linhas num ano normal de actividade.
  - **Como aplicar:** paginação client-side (estado `page` + `slice(page*size, (page+1)*size)` + botões prev/next no `TxFooter`) chega para milhares de linhas; só considerar `range()` server-side se um dia pesar. Encaixar no plano da Fase 1 ou 2.

- [ ] **U-06 — Idioma misto PT/EN na UI e nas respostas da API** _(prioridade: baixa)_
  - **Facto:** a decisão aprovada do épico é idioma EN, e Dashboard/Holdings/Transactions já estão em EN — mas a página de passphrase está em PT (`passphrase/page.tsx:42,57,65`: "Digite a palavra-passe…", "Palavra-passe incorrecta.", "A verificar...") e o `verify-ticker` devolve mensagem de erro em PT (`route.ts:49-51`). Formatação numérica usa `Intl pt-PT` em todo o lado (consistente entre si).
  - **Como aplicar:** traduzir as strings restantes para EN (passphrase page + mensagens de erro de API destinadas à UI). Manter `pt-PT` nos formatos numéricos se for essa a preferência — mas registar a decisão no `DESIGN.md` para os agentes pararem de alternar.

### Inconsistências e qualidade de código (frontend — 2ª passagem)

- [ ] **I-01 — Componentes duplicados entre módulos de página** _(prioridade: média — a dívida cresce a cada feature)_
  - **Facto:** `holdings/TypeBadge.tsx` e `performance/TypeBadge.tsx` são **idênticos byte a byte** (MD5 `A6A2856E…` igual, verificado). `CompanyCell.tsx`/`AssetCell.tsx` e `KpiStrip.tsx`/`KPIStrip.tsx` são pares paralelos com o mesmo papel (hashes diferem, conteúdo quase igual). `SortArrow` está definido 3× (`TxTable.tsx:27`, `HoldingsTable.tsx:62`, `TradeTable.tsx:62`, os dois primeiros idênticos); os tipos `SortState`/`SortDir`/`Density` estão declarados 2-3× em ficheiros diferentes; `sortTransactions` (`TransactionsPage.tsx:78`) e `sortRows` (`HoldingsPage.tsx:66`) implementam o mesmo algoritmo.
  - **Porquê:** é consequência directa do pipeline gerar cada página isolada. Sem regra, a Fase 2 (derivação) vai criar a 4ª cópia. Cada correcção visual (ex.: mudar o estilo dos badges) hoje exige tocar 2-3 ficheiros e é fácil esquecer um — divergência silenciosa.
  - **Como aplicar:** criar `src/components/shared/` com `TypeBadge` (variant por asset class), `SortArrow`, tipos de sort e `Density`; substituir os usos (typecheck garante a migração). E registar a regra no `CLAUDE.md`/agente frontend: *"na 2ª ocorrência de um componente igual entre módulos, promover a `shared/`"* — senão a pipeline reintroduz o padrão.

- [ ] **I-02 — Dois formatos de dinheiro na mesma app** _(prioridade: média — é uma app financeira)_
  - **Facto:** Transactions formata com `toLocaleString("en-GB")` + símbolo manual à esquerda → `€1,234.00` (`transactions/mock-data.ts:105-125`); Holdings e Dashboard usam `Intl.NumberFormat("pt-PT")` → `1 234,00 €` (`holdings/mock-data.ts:159-171`, `dashboard/page.tsx:16-22`, `summary/route.ts:18-24`). A quantidade em `TxTable.tsx:303` também usa `en-GB`. O mesmo valor monetário muda de cara conforme a página.
  - **Porquê:** separador decimal trocado entre páginas (`1,234.00` vs `1 234,00`) é exactamente o tipo de coisa que mina confiança num tracker financeiro — e o `formatEur` está literalmente duplicado entre `dashboard/page.tsx` e `summary/route.ts`.
  - **Como aplicar:** decidir UM locale de exibição (decisão de produto — EN-GB combina com a decisão de idioma EN; pt-PT combina com o hábito do utilizador), centralizar num `formatCurrency` em `src/lib/utils.ts` (o CLAUDE.md já documenta esse helper como morada canónica) e substituir `fmt`/`formatMoney`/`formatEur`. Registar a escolha no `DESIGN.md`.

- [ ] **I-03 — Metadata e `lang` do documento desactualizados e em conflito com o produto** _(prioridade: baixa — visível em todo o lado)_
  - **Facto:** `src/app/layout.tsx:11-15` declara `title: "FINTrack — Controle Financeiro"` e descrição sobre "finanças pessoais" — o produto actual é um tracker de **investimentos** (o módulo income/expense foi dropado na migration 0009). `<html lang="pt-BR">` (linha 23) contradiz a decisão de UI em EN e os textos EN das páginas; strings PT escondidas em atributos de acessibilidade: caption "Histórico de transacções" (`TxTable.tsx:145`), aria-labels "Posição activa"/"Posição fechada" (`TradeTable.tsx:78,92`) ao lado de texto visível "Active"/"Closed".
  - **Porquê:** o title aparece na tab do browser sempre; `lang` errado afecta screen readers e corretores; aria-label num idioma e texto visível noutro confunde tecnologia assistiva.
  - **Como aplicar:** actualizar metadata (ex.: "FINTrack — Investment Portfolio Tracker"), alinhar `lang` com a decisão do U-06, e varrer atributos a11y junto com a tradução do U-06.

- [ ] **I-04 — Sparklines da Performance são números inventados a partir de um seed** _(prioridade: alta enquanto não houver badge demo; resolve-se na Fase 2)_
  - **Facto:** `performance/Sparkline.tsx:15-33` **gera** a série com um PRNG determinístico (`seed`, `dir30`) — não há dados reais por trás; `EnrichedTrade` carrega `_seed/_dir30/_pct30` (`TradeTable.tsx:47-49`). É a instância mais enganosa do U-01: um gráfico de 30 dias com cara de série temporal real.
  - **Como aplicar:** coberto pelo badge "demo data" do U-01 no curto prazo. Na Fase 2, alimentar com dados reais — a rota `GET /api/portfolio/history` (1h de cache) já devolve exactamente os 30 dias de closes de que a sparkline precisa (é uma das rotas hoje sem consumidor, ver S-04).

## Sugestões Gerais (configuração e processo — 2026-06-10)

> Análise da camada de configuração/processo (Claude, modelo Fable 5): `.claude/`, git, CI, testes, dependências, env.
> Mesma regra das Sugestões Fable 5: cada item com facto verificado. Nada foi implementado.

- [ ] **G-01 — CRÍTICO: a passphrase real está commitada no git** _(fazer primeiro)_
  - **Facto:** `.claude/settings.local.json` está **trackeado no repositório** (confirmado via `git ls-files`; o `.gitignore` não o cobre) e contém a passphrase em texto claro dentro de várias entradas de permissão (ex.: linhas 45, 49-60: `$env:E2E_PASSPHRASE = 'fintrack'`). O repo tem remote (`origin/main`), portanto o segredo já saiu da máquina.
  - **Porquê:** é a única credencial que protege a app inteira (S-01 da secção acima torna-a ainda mais central). Segredo em git fica no **histórico** mesmo depois de apagado do ficheiro.
  - **Como aplicar:** (1) `git rm --cached .claude/settings.local.json` + adicionar `.claude/settings.local.json` ao `.gitignore` (`settings.local.json` é, por convenção do Claude Code, pessoal e não-versionado); (2) limpar as entradas de permissão que embebem a passphrase literal; (3) **trocar a passphrase** no Supabase — é a forma simples de invalidar o que está no histórico; purgar o histórico (`git filter-repo`) é opcional num repo pessoal privado, trocar o segredo é o que conta; (4) conferir que o novo valor vive só em `.env.local` (`E2E_PASSPHRASE`), que já está ignorado.

- [ ] **G-02 — Allowlist de permissões inchada e com entradas perigosamente amplas**
  - **Facto:** `.claude/settings.local.json` acumula ~60 entradas, na maioria one-offs com paths absolutos e comandos literais de sessões antigas. Entre elas, três genéricas demais: `PowerShell(Remove-Item *)` (apagar qualquer coisa sem prompt), `PowerShell(docker exec *)` (comando arbitrário em qualquer container, incluindo o Postgres com os dados) e `Bash(npm install *)` — esta última contradiz a tua própria política de "explicar antes de instalar qualquer pacote".
  - **Como aplicar:** recomeçar a allowlist do zero: remover as 3 amplas, descartar os one-offs, e mover o conjunto pequeno e estável (`npm run *`, `npx playwright *`, `npx supabase *`, `git -C *`) para `.claude/settings.json` **partilhado** (esse sim versionado — vale também para os subagentes). A skill `/fewer-permission-prompts` automatiza a triagem a partir dos transcripts.

- [ ] **G-03 — Zero CI: typecheck, lint e build só correm quando alguém se lembra**
  - **Facto:** não existe `.github/` no repo. Os gates de qualidade (typecheck zero erros, lint, e2e) dependem todos de execução manual ou da disciplina dos agentes.
  - **Porquê:** o pipeline de agentes é bom mas corre na tua máquina; um push com working tree "verde local" pode quebrar o build de produção sem ninguém notar. CI é a rede de segurança que não depende de memória.
  - **Como aplicar:** GitHub Actions mínimo — um workflow com `npm ci` → `npm run typecheck` → `npm run lint` → `npm run build` em push/PR para `main`. Os e2e ficam fora do CI por agora (precisam do Supabase local + passphrase); um job de `npm audit --audit-level=high` é grátis e alinha com o gate do Security Reviewer.

- [ ] **G-04 — Trabalho aprovado acumula dias no working tree; tudo acontece na `main`**
  - **Facto:** a Fase 0 do épico (migration aplicada + API + wiring + 26 testes QA-aprovados em 2026-06-09) continua **inteiramente não commitada** um dia depois; `git branch -a` mostra apenas `main`. Os commits recentes são genéricos ("chore: fixed holdings page").
  - **Porquê:** um `git checkout` errado, um crash de disco ou um agente com permissão ampla (ver G-02: `Remove-Item *`) apaga dias de trabalho aprovado. E sem branch, não há como separar a Fase 1 a meio se a Fase 0 precisar de hotfix.
  - **Como aplicar:** instituir a regra **"QA aprovou ⇒ commit imediato"** (o gate já existe no pipeline — só falta o commit como passo final da skill `/verify-feature` ou do ciclo Engineer↔QA). Para o épico: uma branch por fase (`feat/ledger-fase-1`) com merge à main no fim do Security Review. Registar a regra no `CLAUDE.md`.

- [ ] **G-05 — Suite e2e contém spec de uma página que já não existe**
  - **Facto:** `tests/e2e/portfolio.spec.ts` navega 4× para `/portfolio` (linhas 4, 10, 26, 49) — página removida no commit `4873021`. O spec está trackeado e faria a suite completa falhar (ou testa um redirect que ninguém definiu como comportamento).
  - **Porquê:** specs mortos minam a confiança na suite — "falhou? ah, deve ser o do portfolio" é o primeiro passo para ignorar falhas reais. Nota relacionada: vários specs (`*-redesign.spec.ts`) validam páginas ainda mock que a Fase 2 vai re-ligar a dados reais — vão precisar de revisão em bloco nessa altura.
  - **Como aplicar:** apagar `portfolio.spec.ts` agora; na Fase 2, incluir no plano do SM a tarefa explícita de realinhar os specs das páginas que mudarem de mock→real (em vez de deixar o QA descobrir).

- [ ] **G-06 — Higiene do repo: binário de 640KB e relatório fora da convenção em `.claude/`**
  - **Facto:** `.claude/design-import.tar.gz` (640KB) está commitado (confirmado via `git ls-files`) — os protótipos que ele continha já vivem extraídos em `.claude/design-handoff/`. Existe também `.claude/reports/erro.md`, fora da convenção de naming `{fase}-{slug}.md` dos restantes 40+ relatórios.
  - **Como aplicar:** remover o tar.gz do tracking (o conteúdo extraído fica); renomear ou apagar `erro.md` depois de conferir se ainda tem valor. Opcional: uma linha no `CLAUDE.md` sobre a convenção de naming de `.claude/reports/` para os agentes a respeitarem sozinhos.

- [ ] **G-07 — Dependências: pacote de teste duplicado e CLI em `dependencies` de runtime**
  - **Facto:** `package.json` tem `playwright` **e** `@playwright/test` em devDependencies — o segundo já embute o primeiro; manter os dois convida a versões dessincronizadas. E `shadcn@^4.7.0` (a **CLI** geradora de componentes) está em `dependencies` de produção, quando é ferramenta de desenvolvimento — entra na árvore de produção sem necessidade.
  - **Como aplicar:** remover `playwright` (ficar só com `@playwright/test`) e mover `shadcn` para devDependencies (ou remover — pode usar-se via `npx shadcn` sem instalar). Correr a suite e2e depois para confirmar. Alinha com a política de instalações: menos pacotes em produção = menos superfície de supply chain.

- [ ] **G-08 — Dados financeiros reais sem estratégia de backup visível**
  - **Facto:** o banco vive num Postgres em Docker local (`supabase_db_FINTrack`); nada no repo (scripts, docs, CLAUDE.md) indica backup dos **dados** — as migrations versionam o schema, não o conteúdo do ledger. (Se existir backup fora do repo, ignorar este item.)
  - **Porquê:** a partir da Fase 1, o ledger passa a ser o registo único das tuas transações reais — um `docker volume rm` acidental ou disco corrompido apaga o histórico financeiro sem recuperação.
  - **Como aplicar:** script simples `npx supabase db dump --local --data-only -f backups/fintrack-$(date).sql` + pasta `backups/` no `.gitignore` (ou dump para fora do repo / drive cloud). Documentar a rotina no `CLAUDE.md`. Bónus: correr o dump como passo prévio de qualquer migration destrutiva (a 0009 dropou 2 tabelas — correu bem, mas foi sem rede).

## Bugs

> Pipeline: Bug Reporter → Engineer → QA. Para comportamentos incorretos encontrados em testes manuais.
> Formato obrigatório de cada item:
>
> ```
> - [ ] **[BUG]** Descrição curta do problema
>   - **Expected:** o que deveria acontecer
>   - **Actual:** o que está acontecendo
>   - **Reproduce:** passos para reproduzir
>   - **Severity:** critical / high / medium / low
> ```

## Done

- [x] **[BUG resolvido]** Botão aninhado dentro de botão no "Select All" do modo de edição — transactions-redesign (CA-07)
  - **Causa:** `CheckBox.tsx` renderizava sempre `<button role="checkbox">` e o "Select All" em `FilterRow.tsx` (204-215) envolvia-o noutro `<button onClick={onToggleAll}>` → `<button>` dentro de `<button>`, 2 erros de hidratação React.
  - **Correcção:** prop `interactive` no `CheckBox` (com `interactive={false}` renderiza `<span aria-hidden>` visual-only); o `<button>` exterior do "Select All" assumiu `role="checkbox"` + `aria-checked` (off/on/mixed) + foco por teclado. Único elemento clicável e acessível, comportamento select/deselect-all preservado.
  - **Verificado:** QA APROVADO em 1 ciclo (2026-06-08) — 4/4 CAs em Chrome real + Playwright 9/9. Relatório: `.claude/reports/qa-fix-transactions-select-all-nested-button.md`. (Security Review por correr — pedido do utilizador.)

- [x] **[BUG resolvido]** Dev server HTTP 500 — `Module not found: Can't resolve 'chevron-svg'`
  - **Causa:** Tailwind v4 escaneava `.claude/reports/*.md` e apanhava uma classe arbitrária de exemplo com `background-image:url(...)` apontando para um ficheiro inexistente, que o Turbopack tentava resolver como módulo CSS. (NOTA: não reescrever aqui a sintaxe literal da classe — fica fora dos `@source not` e re-introduz o bug.)
  - **Correcção:** `@source not` para `.claude/`, `tests/`, `supabase/` em `globals.css` (linhas 5-7). Confirmado: server arranca e `/transactions` carrega (2026-05-29).
- [x] Passphrase login
- [x] CRUD de posições no portfólio (ticker, tipo, quantidade, preço médio, moeda)
- [x] Nome automático via Yahoo Finance ao adicionar posição
- [x] Preço atual com cache de 15 minutos (banco + memória)
- [x] Colunas "Preço Atual" e "Total Gasto" na tabela do portfólio
- [x] Refresh automático de preços stale ao abrir o portfólio
- [x] Identidade visual dark mode — paleta teal, IBM Plex Mono, efeitos neon, tokens CSS
- [x] Badges coloridos por tipo de ativo (Stock, ETF, FII, Crypto)
- [x] Ordenação da tabela — mais recente no topo
- [x] Suporte a FII e Crypto no formulário e schema Zod
