# FINTrack — Tarefas

> **Regra:** Toda tarefa passa pelo pipeline completo `PO → Designer → SM → Engineer → QA → Security Review`.
> Claude executa diretamente apenas quando o utilizador pedir explicitamente.

## Redesigns Visuais (pipeline completa — iniciar com PO)

> Cada item abaixo requer o mesmo processo do Dashboard: PO cria working item com base nos protótipos em `.claude/design-handoff/project/`, depois segue pipeline completa. Primeira fase: apenas visual com dados mockados, sem funcionalidades.

- [x] **Holdings** — `Holdings.html` → nova página `/holdings` com 7 KPIs + tabela ordenável com alocação visual por ticker e logo colorido por classe de activo
- [x] **Performance** — `Performance.html` → nova página `/performance` com KPI strip com micro-visualizações (gauge, barra split, tick rows) + tabela de trade analysis com sparklines de 30 dias
- [ ] **Transactions** — `Transactions.html` → nova página `/transactions` com filtros, tabs por tipo (BUY/SELL/CASH/DIV/etc.), tabela com badges coloridos e modo de edição
- [ ] **Tax Calculator** — `Tax Calculator.html` → nova página `/tax-calculator` com 3 KPIs (Total Tax Liability, Capital Gains Tax, Dividend Tax) + painel Capital Gains + painel Dividend Tax

## Features

- [x] Feedback de erro ao adicionar ticker inválido — mostrar mensagem clara quando o ticker não existe no Yahoo Finance (actualmente silencioso)
- [x] Validação/busca de ticker — mecanismo para verificar o ticker correcto antes de salvar (ex: botão "Verificar" que mostra nome + preço antes de confirmar)
- [ ] Reformular página de "Portifolio"
  - Deverá ter 2 tabelas, a primeira tabela será terá a minhas posições consolidadas e segunda tabela será o histórico de compra.
    - Primeira tabela: Deverá ter os campos **Ticker**, **Nome completo**, **Tipo**, **Quantidade total**, **Preço médio pago**, **valor atual**, **Ganho/perda**, **Total investido**, e um **gráfico sparkline**
      - Descrição dos campos:
        - **Ticker**: mostrar o ticker do item, além disso deve ser adicionado o mercado do ticker em especifico e o ícone do ticker E.g.: "´[icone]´ WEBN.DE | XETRA", "´[icone]´AAPL | NASDAQ" , etc,
        - **Nome** completo: Nome completo do ticker
        - **Tipo**: ETF, Stock, Cripto, etc
        - **Quantidade total**: A quantidade total deve ser a SOMA de todas as entradas do mesmo ticker com base na segunda tabela. O valor deve poder retornar números quebrados até 5 casas decimais. Caso seja um número redondo, omitir tudo após a virgula.
        - **Preço médio**: O preço médio deve levar em consideração a soma de todas as entradas de mesmo ticker da segunda tabela, fazendo o calculo correto para definir o preço médio pago pelas posições.
        - **valor atual**: valor atual do item
        - **Ganho/perda**: Valor mostrando o montante total e % (como está atualmente) com base no valor agregado da segunda tabela
        - **Total investido**: Valor mostrando o total investido com base no valor agregado da segunda tabela
        - **gráfico sparkline**: sparkline graph, dos últimos 30 dias mostrando o desempenho do ticker. Funcionalidades adicionais ainda por definir.
    - Segunda tabela: **Ticker**, **Nome completo**, **Broker**, **Tipo**, **Quantidade total**, **Preço médio pago**, **valor atual**, **data de compra**
      - Descrição dos campos: (Os omitidos serão como os da tabela 1)
        - **Broker**: Dropdown contendo a lista de possiveis broker (Degiro, Trading212 e Mirae)
        - **data de compra**: Data no padrão DD/MM/YYYY
  - Ao clicar no botão "**+ Adicionar posição**", os campos devem corresponder ao necessário das tabelas, com excessão dos campos que serão preenchidos por calculos com base na entrada do utilizador.
  - O campo **MOEDA** deve estar preenchdo com EUR, por padrão
- [ ] Botão de logout na página de Configurações
- [ ] Dashboard com dados reais — patrimônio total (`Σ current_price × quantity`), número de posições, ganho/perda geral, breakdown por tipo de ativo
- [ ] Gráficos no Dashboard — ~4-5 charts relevantes (patrimônio, distribuição por tipo, ganho/perda, evolução)
- [ ] Forçar refresh de preços — botão "Atualizar Preços" na página do portfólio que invalida o cache e busca preços frescos do Yahoo Finance

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
