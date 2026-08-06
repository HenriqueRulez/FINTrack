### Import CSV do broker (Trading212) em /transactions

**User Story**
Como utilizador do FINTrack, quero importar o export CSV do meu broker Trading212 na página /transactions para que o meu ledger seja populado de uma só vez, de forma fiel e sem risco de duplicar entradas quando reimporto o mesmo ficheiro.

**Contexto**
Hoje o ledger `transactions` (única source of truth do portfólio) só aceita entradas manuais uma a uma, o que torna inviável registar um histórico real de dezenas de operações. O botão "Import" já existe na página mas é um stub sem comportamento. Esta feature liga esse botão a um fluxo de importação com pré-visualização e confirmação, transformando um export do broker em entradas de ledger (compras, vendas, depósitos e dividendos) sem chamadas externas de preços.

**Critérios de Aceite**

- [ ] CA1: Ao clicar em "Import" na página /transactions, o utilizador vê um modal que permite escolher um ficheiro `.csv` do computador. Ficheiros que não sejam `.csv` não podem ser submetidos.

- [ ] CA2: Após escolher o ficheiro, antes de gravar seja o que for, o utilizador vê uma pré-visualização (preview) em tabela onde cada linha do ficheiro aparece classificada num de quatro estados: **Nova** (será importada), **Duplicada** (já existe no ledger), **Ignorada** (tipo de operação não suportado) ou **Erro** (linha inválida). Nada é gravado nesta fase.

- [ ] CA3: A pré-visualização mostra, de forma visível, um contador por estado (total de Novas, Duplicadas, Ignoradas e Erros), permitindo ao utilizador confirmar o resultado esperado antes de gravar.

- [ ] CA4: São importadas exactamente estas correspondências de tipo do Trading212: "Market buy" e "Limit buy" tornam-se uma **compra (BUY)**; "Market sell" e "Limit sell" tornam-se uma **venda (SELL)**; "Deposit" torna-se um **movimento de caixa (CASH)**; "Dividend (Dividend)" torna-se um **dividendo (DIV)**. Qualquer outra acção (ex.: Withdrawal, Interest, conversões de moeda) aparece no preview como **Ignorada** e não é gravada.

- [ ] CA5: Uma linha aparece como **Erro** (e não é gravada) quando a sua moeda está fora do conjunto suportado EUR/USD/GBP, ou quando os campos essenciais para o seu tipo estão em falta/ilegíveis. O motivo do erro é apresentado ao utilizador nessa linha do preview.

- [ ] CA6: Ao confirmar a importação, apenas as linhas em estado **Nova** são gravadas no ledger. Após gravar, o modal fecha e a tabela de /transactions actualiza-se automaticamente (sem recarregar a página) mostrando as novas entradas, incluindo nas tabs Cash e Dividend.

- [ ] CA7: **Deduplicação (reimport):** importar o mesmo ficheiro uma segunda vez resulta em **0 linhas Novas** — todas as linhas previamente gravadas aparecem como **Duplicadas** e nenhuma entrada nova é criada no ledger. Isto vale mesmo para dividendos do Trading212, que não trazem identificador próprio no ficheiro.

- [ ] CA8: **Fixture de verificação** — ao importar o ficheiro real `positions_export/trading212.csv` (56 linhas de dados) num ledger vazio, o preview mostra exactamente: **38 compras (BUY)**, **5 vendas (SELL)**, **5 depósitos (CASH)**, **8 dividendos (DIV)**, **0 ignoradas** e **0 erros** — totalizando 56 linhas Novas. Confirmar grava as 56 entradas.

- [ ] CA9: Para as linhas do ficheiro real cuja moeda de origem é USD, o valor total em EUR de cada entrada gravada corresponde ao valor da coluna "Total (EUR)" do ficheiro (usa-se a taxa de câmbio do próprio ficheiro, não uma cotação externa). Ex.: a compra de NVDA em 2026-05-28 (linha com Total 37.50 EUR) grava total 37.50 EUR; o dividendo de NVDA em 2026-06-26 (Total 0.04 EUR, líquido de retenção) grava total positivo 0.04 EUR.

- [ ] CA10: Movimentos de caixa (Deposit) são gravados com sinal positivo e com um rótulo descritivo em vez de ticker (ex.: "Deposit"); dividendos são gravados sempre com valor positivo e líquido da retenção na fonte. A tabela de /transactions renderiza estes tipos nas respectivas tabs sem que o utilizador precise de acção extra.

- [ ] CA11: O fluxo manual de criação de transacção (botão "Add Manually") mantém-se inalterado e continua a aceitar apenas compras e vendas.

**Requisitos Não-Funcionais**

- Performance/billing: a importação não faz nenhuma chamada externa de preços (Yahoo) — usa exclusivamente os dados do ficheiro. A validação de coerência do ledger (ex.: não permitir vender mais do que se possui) corre uma única vez sobre o conjunto existente + lote, não por linha.
- Segurança: o ficheiro é processado no contexto do utilizador autenticado; as entradas ficam associadas apenas a esse utilizador. Ficheiros excessivamente grandes (acima de ~2MB) são rejeitados com mensagem clara em vez de degradar a aplicação.
- Robustez de parsing: o leitor de CSV respeita campos entre aspas com vírgulas, quebras de linha e aspas escapadas (RFC4180), para não partir os campos "Notes" do Trading212.

**Dependências**

- Página /transactions existente com botão "Import" (stub) e tabs Cash/Dividend já renderizáveis (ambos confirmados no código).
- Suporte de esquema para associar uma entrada à sua origem no broker e evitar duplicados em reimportações (identificador externo + índice único). Sem isto, o CA7 (deduplicação) não é verificável.

**Fora do Escopo**

- Importação de ficheiros DEGIRO (fica para uma iteração futura, dependente de um export de transações próprio; o `positions_export/degiro.csv` actual é um snapshot de posições sem datas de trade e não serve de ledger).
- Suporte a Withdrawal, Interest e conversões de moeda do Trading212 (aparecem como Ignoradas, não são importadas nesta iteração).
- Edição do fluxo manual de criação de transacção.
- Reconciliação ou correcção de entradas já existentes criadas manualmente (o import só acrescenta o que é Novo).
