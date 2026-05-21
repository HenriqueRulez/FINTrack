---
# Plano de Implementação — Nome Automático e Preço com Cache ao Gerir Posições

**Working Item:** `.claude/working-items/nome-automatico-preco-cache.md`

## Tarefas

### T1 — Migration: adicionar coluna price_updated_at
**O quê:** Criar ficheiro de migration SQL que adiciona a coluna `price_updated_at TIMESTAMPTZ` nullable à tabela `portfolio_positions`, sem valor default (posições existentes ficarão com NULL, sinalizando que precisam de actualização). Executar `npx supabase db push` e regenerar `src/types/database.ts` com `npx supabase gen types typescript --local`.
**Depende de:** Nenhuma
**Cobre:** CA4 (pré-condição: coluna necessária para o cache de 15 min)

### T2 — Validação: remover campo name do PositionSchema
**O quê:** Em `src/lib/validations/portfolio.ts`, remover o campo `name` do `PositionSchema` (passa a ser preenchido automaticamente pelo servidor a partir do Yahoo Finance). Ajustar o tipo exportado `PositionInput` em conformidade. O campo `name` não deve estar disponível no schema de criação; pode permanecer no schema de actualização parcial (PATCH) apenas se necessário para retro-compatibilidade, mas deve ser ignorado pelo servidor.
**Depende de:** Nenhuma
**Cobre:** CA2 (formulário não exige nome), CA6 (campo nome não editável)

### T3 — API POST /api/portfolio: obter nome e preço via Yahoo Finance
**O quê:** Em `src/app/api/portfolio/route.ts`, no handler POST, após a validação Zod, chamar `getQuote(ticker)` de `src/lib/yahoo-finance/client.ts` uma única vez para obter simultaneamente `name`, `price` e `currency`. Se `getQuote` retornar `null`, responder com 422 e mensagem indicando que o ticker não foi encontrado, sem inserir no banco. Se bem-sucedido, usar o `name` e `price` retornados pelo Yahoo Finance para preencher os campos `name`, `current_price` e `price_updated_at` no payload de inserção — o utilizador nunca envia esses campos.
**Depende de:** T1, T2
**Cobre:** CA1 (nome automático ao adicionar), CA3 (preço atual preenchido ao cadastrar), CA7 (422 se ticker inválido)

### T4 — API GET /api/portfolio: cache de 15 minutos e actualização em lote
**O quê:** Em `src/app/api/portfolio/route.ts`, no handler GET, após buscar as posições do banco, identificar quais têm `price_updated_at` nulo ou com mais de 15 minutos de antiguidade. Agrupar os tickers únicos dessas posições e chamar `getQuotes(tickers)` uma única vez para obter os preços em lote. Actualizar no banco (via PATCH em lote ou updates individuais) apenas as posições que precisam de actualização, gravando o novo `current_price` e o `price_updated_at` com a hora actual. Retornar as posições já com os preços actualizados. Posições com `price_updated_at` recente (menos de 15 min) não devem gerar nenhuma chamada ao Yahoo Finance.
**Depende de:** T1, T3
**Cobre:** CA4 (cache 15 minutos, actualização em lote, sem chamadas desnecessárias)

### T5 — API PATCH /api/portfolio/[id]: remover name e current_price do payload editável
**O quê:** Em `src/app/api/portfolio/[id]/route.ts`, garantir que os campos `name` e `current_price` são ignorados no payload de actualização recebido do cliente — mesmo que o cliente os envie, não devem ser persistidos. O updatePayload construído a partir do schema parcial nunca deve incluir `name` nem `current_price`.
**Depende de:** T2
**Cobre:** CA6 (nome e preço atual não editáveis pelo utilizador)

### T6 — UI: remover campo Nome do formulário de adição e edição
**O quê:** Em `src/components/portfolio/position-form-dialog.tsx`, remover completamente o campo de input "Nome" e o estado `name` associado. Actualizar a interface `PositionFormData` para excluir o campo `name`. Actualizar a validação de `isFormValid` para não depender de `name`. No modo de edição (quando `position` é passado), o diálogo deve continuar a funcionar mas sem exibir nem enviar o campo nome. Garantir que o reset do formulário no `useEffect` não referencia `name`.
**Depende de:** T2
**Cobre:** CA2 (sem campo nome no formulário), CA6 (nome não editável)

### T7 — UI: actualizar Position type e adicionar colunas Preço Atual e Total Gasto na tabela
**O quê:** Em `src/components/portfolio/position-table.tsx`, actualizar a interface `Position` para incluir `current_price: number | null` e `price_updated_at: string | null`. Adicionar duas novas colunas na tabela: "Preço Atual" (exibe `current_price` formatado com 2 casas decimais, ou "—" se null) e "Total Gasto" (calculado como `quantity × avg_price`, formatado com 2 casas decimais). Ambas as colunas são apenas de leitura — sem botão de edição ou campo editável para esses valores.
**Depende de:** T4, T6
**Cobre:** CA3 (coluna Preço Atual visível), CA5 (coluna Total Gasto com quantidade × preço médio), CA6 (não editáveis)

### T8 — UI: actualizar PortfolioClient e page para propagar novos campos
**O quê:** Em `src/components/portfolio/portfolio-client.tsx`, actualizar o tipo usado para `positions` de modo a incluir `current_price` e `price_updated_at`. Garantir que a resposta do POST e do PATCH são mapeadas correctamente para o estado local, incluindo os novos campos. Em `src/app/(dashboard)/portfolio/page.tsx`, verificar que o fetch inicial das posições inclui os novos campos retornados pelo GET actualizado.
**Depende de:** T4, T6, T7
**Cobre:** CA3 (preço exibido após adicionar), CA4 (preços actualizados visíveis ao abrir a página)

## Ordem de Execução
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8

## Cobertura de Critérios de Aceite
- CA1: coberto por T3
- CA2: coberto por T2, T6
- CA3: coberto por T3, T7, T8
- CA4: coberto por T1, T4, T8
- CA5: coberto por T7
- CA6: coberto por T2, T5, T6, T7
- CA7: coberto por T3
---
