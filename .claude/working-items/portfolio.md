### Gestão de Portfólio

**User Story**
Como utilizador do FINTrack, quero registar e gerir os activos do meu portfólio de investimentos para que possa acompanhar o que possuo e a que preço médio adquiri.

**Contexto**
O utilizador tem investimentos em stocks e ETFs em diferentes moedas e precisa de um local centralizado para os registar. A listagem permite ter uma visão imediata do portfólio sem depender de fontes externas. O foco desta fase é o registo manual dos activos, não a valorização em tempo real.

**Critérios de Aceite**
- [ ] CA1: O utilizador consegue adicionar um activo indicando o ticker, nome, tipo (Stock ou ETF), quantidade, preço médio de compra e moeda (EUR, BRL ou USD).
- [ ] CA2: A moeda é seleccionada a partir de uma lista fixa com as opções EUR, BRL e USD.
- [ ] CA3: O tipo de activo é seleccionado a partir de uma lista fixa com as opções Stock e ETF.
- [ ] CA4: O utilizador consegue editar qualquer campo de um activo já registado.
- [ ] CA5: O utilizador consegue remover um activo do portfólio, com pedido de confirmação antes da eliminação.
- [ ] CA6: A listagem apresenta todos os activos do portfólio com as colunas: ticker, nome, tipo, quantidade, preço médio e moeda.
- [ ] CA7: Todos os campos do formulário de adição e edição são obrigatórios — não é possível guardar um activo incompleto.

**Requisitos Não-Funcionais**
- Nenhum.

**Dependências**
- Autenticação de utilizador activa.

**Fora do Escopo**
- Preços actuais de mercado ou valorização em tempo real.
- Cálculo de ganhos ou perdas.
- Histórico de transacções por activo (compras e vendas parciais).
- Suporte a outros tipos de activo (criptomoedas, fundos, obrigações, etc.).
- Conversão de moedas ou equivalência em moeda base.
