---

# Plano de Implementação — Import CSV (Trading212) em /transactions

**Working Item:** `.claude/working-items/csv-import.md`
**Plano técnico (fonte fechada pelo dono):** `TODO.md` — secções "Tarefas — pipeline csv-import" (1–3, 5), "Factos do código que condicionam o design", "Verificação"

**Nota de escopo:** este plano cobre apenas a trilha backend/lógica. A trilha UI (`ImportModal.tsx`, wiring do botão em `TxPageHead.tsx`) corre em paralelo noutro agente e não está aqui.

## Tarefas (para o Engineer)

### T1 — Migration de suporte a import

**O quê:** Adicionar à tabela `transactions` as colunas necessárias para rastrear a origem de uma entrada e evitar duplicados em reimportações: `external_id` (identificador do broker, nullable), `source` (origem da entrada, default `'manual'`, restrito a `manual`/`trading212`), `isin` (identificador do instrumento, nullable, 12 caracteres quando presente), `withholding_tax` (retenção na fonte, default 0, não-negativa). Criar um índice único parcial em `(user_id, external_id)` que só se aplica quando `external_id` não é nulo — é isto que garante que reimportar o mesmo ficheiro não duplica entradas (CA7). Aplicar a migration ao Supabase local. Actualizar à mão os tipos `Row`/`Insert`/`Update` da tabela `transactions` em `src/types/database.ts` para reflectir as quatro colunas novas.

**Depende de:** Nenhuma
**Cobre:** CA7 (pré-condição de esquema), CA9, CA10 (suporte de dados para fx e retenção)

### T2 — Parser CSV RFC4180

**O quê:** Um parser de CSV genérico e sem dependências externas, capaz de ler correctamente campos entre aspas contendo vírgulas, quebras de linha e aspas escapadas, e de lidar com terminadores de linha CRLF — necessário porque o campo "Notes" do export do Trading212 pode conter estas particularidades e um parser ingénuo (split por vírgula/linha) parte os dados. Cobrir com testes unitários os casos: campos simples, campos entre aspas, vírgula dentro de aspas, quebra de linha dentro de aspas, aspas escapadas, CRLF vs LF, linha final sem newline.

**Depende de:** Nenhuma
**Cobre:** Requisito não-funcional "Robustez de parsing" (pré-condição para todos os CAs de import)

### T3 — Mapper Trading212

**O quê:** Um módulo que recebe as linhas já parseadas do CSV do Trading212 e as converte em candidatos a entrada de ledger, ou marca cada linha como erro com o motivo. Regras a implementar:

- Detecção do cabeçalho esperado do export Trading212.
- Correspondência de tipo de acção do ficheiro para o tipo do ledger: "Market buy"/"Limit buy" → compra; "Market sell"/"Limit sell" → venda; "Deposit" → movimento de caixa; "Dividend (Dividend)" → dividendo. Qualquer outra acção é marcada como ignorada, não como erro.
- Normalização do câmbio da linha para o formato multiplicativo "EUR por 1 unidade da moeda" usado pelo motor de ledger — o Trading212 alterna a direcção da taxa consoante o tipo de linha, por isso a normalização deve testar as duas direcções possíveis e escolher a que reproduz o valor total em EUR indicado na própria linha do ficheiro; se nenhuma direcção bater certo, a linha é erro.
- Moeda fora de EUR/USD/GBP → linha marcada como erro, com o motivo apresentável ao utilizador.
- Campos essenciais em falta ou ilegíveis para o tipo da linha → erro, com motivo.
- Linhas de depósito (cash): sem ticker, com um rótulo descritivo em vez de ticker.
- Linhas de dividendo: total sempre positivo e líquido da retenção na fonte; como o Trading212 não fornece identificador próprio para dividendos, gerar um identificador externo sintético e determinístico (mesmo dividendo reimportado gera sempre o mesmo identificador, dividendos diferentes geram identificadores diferentes).
- Arredondamentos: quantidade a 8 casas decimais, preço/fee/total a 4 casas decimais.

Cobrir com testes unitários que usem o ficheiro real `positions_export/trading212.csv` como fixture: das 56 linhas de dados, o resultado esperado é 38 compras, 5 vendas, 5 depósitos, 8 dividendos, 0 ignoradas, 0 erros.

**Depende de:** T2
**Cobre:** CA4, CA5, CA8, CA9, CA10

### T4 — Schema Zod do pedido de import

**O quê:** Validação de entrada do endpoint de import: o conteúdo do CSV como texto, com um limite de tamanho de aproximadamente 2MB (ficheiros maiores devem ser rejeitados de forma clara, sem degradar a aplicação), e uma flag booleana que distingue pré-visualização de gravação efectiva, com valor por omissão de pré-visualização (nunca grava por acidente sem confirmação explícita).

**Depende de:** Nenhuma
**Cobre:** Requisito não-funcional de segurança (ficheiros grandes rejeitados), pré-condição de CA1/CA2

### T5 — API `POST /api/transactions/import`

**O quê:** Endpoint que recebe o CSV e devolve, em modo pré-visualização, uma classificação linha-a-linha sem gravar nada; em modo confirmação, grava apenas as linhas novas. Seguir o pattern de segurança obrigatório do projecto: autenticação primeiro (401 se ausente), rate limit próprio e distinto do endpoint manual de transacções (dado o volume de linhas processadas por pedido), validação Zod do corpo do pedido (schema de T4) antes de qualquer acesso à base de dados.

Fluxo, igual em pré-visualização e confirmação até ao ponto da gravação:

1. Parse do CSV (T2) e mapeamento para candidatos (T3).
2. Uma única query aos identificadores externos já existentes do utilizador autenticado, para classificar cada candidato como novo ou duplicado — nunca uma query por linha.
3. Validação de coerência do ledger (guard existente de venda-a-descoberto) UMA única vez sobre o conjunto formado pelas transacções existentes do utilizador mais o lote de candidatas novas — nunca por linha.
4. Em modo pré-visualização: devolve um resumo com a contagem por estado (novas, duplicadas, ignoradas, erro) e a lista completa de linhas, cada uma com o seu estado e, quando aplicável, o motivo. Nada é gravado nesta chamada.
5. Em modo confirmação: grava em lote apenas as linhas em estado novo, na ordem cronológica do ficheiro, com `user_id` sempre da sessão autenticada (nunca do corpo do pedido); um conflito no índice único no momento da escrita (corrida entre pré-visualização e confirmação, ou reimport concorrente) deve ser tratado como duplicado e não como erro de servidor. Devolve o número de linhas inseridas, o número de duplicadas e o mesmo resumo por estado.

O fluxo manual existente de criação de transacção (`POST /api/transactions`) e o respectivo schema Zod não são tocados por esta tarefa.

**Contrato de resposta a respeitar (fixo — a UI já foi especificada contra isto):**

- Pré-visualização: `{ summary: { total, new, duplicate, ignored, error }, rows: Row[] }`
- `Row`: `{ status: 'new'|'duplicate'|'ignored'|'error', reason?: string, date: string, type: 'buy'|'sell'|'cash'|'div'|null, ticker: string|null, label: string|null, qty: number|null, price: number|null, currency: string|null, total: number|null }`
- Confirmação: `{ inserted: number, duplicate: number, summary }`

**Depende de:** T1, T3, T4
**Cobre:** CA1, CA2, CA3, CA6, CA7, CA8, CA9, CA10, CA11 (garante que o endpoint novo não interfere com o manual), Requisito não-funcional de performance/billing (zero chamadas Yahoo, guard uma única vez)

## Ordem de Execução

T1 e T2 e T4 em paralelo (sem dependências entre si) → T3 (depende de T2) → T5 (depende de T1, T3, T4)

## Cobertura de Critérios de Aceite

- CA1 (modal + escolha de ficheiro .csv): trilha UI (fora deste plano) — endpoint T5 só recebe o resultado
- CA2 (preview em tabela com 4 estados, nada gravado): T5 (modo pré-visualização)
- CA3 (contador por estado no preview): T5 (campo `summary`)
- CA4 (correspondências de tipo Trading212 → buy/sell/cash/div; resto ignorado): T3
- CA5 (linha erro por moeda fora de EUR/USD/GBP ou campos em falta, com motivo): T3
- CA6 (confirmar grava só as novas; UI actualiza sem reload): T5 (gravação) + trilha UI (fora deste plano) para o refresh
- CA7 (reimport = 0 novas, tudo duplicado, incluindo dividendos sem ID próprio): T1 (índice único) + T3 (external_id sintético para dividendos) + T5 (classificação de duplicados)
- CA8 (fixture real: 38 buy, 5 sell, 5 cash, 8 div, 0 ignoradas, 0 erros, 56 novas): T3 (testes unitários com a fixture) + T5 (validado ponta-a-ponta pelo QA)
- CA9 (total em EUR fiel à coluna "Total (EUR)" do ficheiro, fx do próprio ficheiro): T1 (coluna fx existente já suporta) + T3 (normalização de fx)
- CA10 (cash com sinal positivo e rótulo; dividendo positivo e líquido de retenção; renderização sem acção extra): T1 (withholding_tax) + T3 (sinal e rótulo) — renderização já confirmada existente, fora deste plano
- CA11 (fluxo manual inalterado): T5 (endpoint novo e isolado, sem tocar em `POST /api/transactions` nem em `TransactionCreateSchema`)
