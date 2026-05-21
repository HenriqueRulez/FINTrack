---
### Nome Automático e Preço com Cache ao Gerir Posições

**User Story**
Como utilizador do FINTrack, quero que o nome do ativo e o preço atual sejam obtidos automaticamente a partir do ticker ao adicionar uma posição, e que os preços sejam mantidos em cache por 15 minutos na base de dados, para que a tabela de portfólio esteja sempre actualizada sem consumir chamadas desnecessárias à API externa.

**Contexto**
Actualmente o utilizador preenche manualmente o nome do ativo e não existe preço atual na tabela. A integração com yahoo-finance2 já existe no servidor, mas não está a ser usada no fluxo de adição de posições nem na listagem. É necessário automatizar a obtenção do nome e preço no momento do add (1 chamada única para ambos), e implementar um cache de 15 minutos baseado na coluna `price_updated_at` do banco de dados para evitar chamadas excessivas ao Yahoo Finance durante a listagem.

**Critérios de Aceite**
- [ ] CA1: Ao adicionar uma posição com um ticker válido (ex: AAPL), o campo "Nome" na tabela exibe automaticamente o nome completo do ativo obtido do Yahoo Finance (ex: "Apple Inc."), sem que o utilizador precise preencher esse campo manualmente.
- [ ] CA2: Ao adicionar uma posição, o formulário não exibe campo de nome — apenas ticker, tipo, quantidade, preço médio e moeda são preenchidos pelo utilizador.
- [ ] CA3: Após adicionar uma posição, a coluna "Preço Atual" na tabela exibe o preço de mercado obtido do Yahoo Finance no momento do cadastro.
- [ ] CA4: Ao abrir a página de portfólio, se alguma posição tiver o preço desactualizado há mais de 15 minutos (ou nunca actualizado), o sistema busca os preços em lote e a tabela exibe os valores actualizados. Posições com preço actualizado há menos de 15 minutos não geram nenhuma chamada ao Yahoo Finance.
- [ ] CA5: A tabela de portfólio exibe a coluna "Total Gasto" com o valor calculado de quantidade × preço médio, formatado como número com 2 casas decimais. A coluna não é editável.
- [ ] CA6: As colunas "Nome" e "Preço Atual" na tabela não são editáveis pelo utilizador — não há campo de edição para esses dois valores no diálogo de edição de posição.
- [ ] CA7: Se o Yahoo Finance não retornar dados para o ticker informado ao adicionar, o endpoint retorna erro 422 com mensagem indicando que o ticker não foi encontrado, sem criar a posição no banco de dados.

**Requisitos Não-Funcionais**
- Máximo de 1 chamada ao Yahoo Finance por ticker único por request no GET /api/portfolio (tickers duplicados na carteira devem ser agrupados)
- A chamada de add position (POST /api/portfolio) faz exatamente 1 chamada ao Yahoo Finance que retorna nome e preço simultaneamente — nunca 2 chamadas separadas
- O cache de 15 minutos é persistido na coluna `price_updated_at TIMESTAMPTZ` em `portfolio_items`, não apenas em memória

**Dependências**
- Migration SQL: adicionar coluna `price_updated_at TIMESTAMPTZ` em `portfolio_items`
- `src/lib/yahoo-finance/client.ts` já implementa `getQuote()` que retorna `{ price, currency, name }` numa única chamada — reutilizar sem modificação de interface
- Remover campo `name` do `PositionSchema` em `src/lib/validations/portfolio.ts` (passa a ser preenchido automaticamente pelo servidor)
- Remover campo `name` do formulário em `src/components/portfolio/position-form-dialog.tsx`

**Fora do Escopo**
- Actualização automática de preços em tempo real (WebSocket ou polling no browser)
- Edição manual do nome ou preço atual pelo utilizador
- Cache de preços para o dashboard ou outras páginas além de `/portfolio`
- Conversão de moeda entre posições
- Histórico de preços ou gráficos de evolução
---
