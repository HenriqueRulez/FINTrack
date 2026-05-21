---
# Plano de Implementação — Gestão de Portfólio

**Working Item:** `.claude/working-items/portfolio.md`

## Contexto do Estado Actual

O que já existe e **não precisa de ser criado**:
- Tabela `portfolio_positions` com schema completo (ticker, name, asset_type, quantity, avg_price, current_price, currency, exchange, notes, user_id)
- RLS activado com as 4 políticas (SELECT, INSERT, UPDATE, DELETE) — padrão `(SELECT auth.uid()) = user_id`
- `src/lib/validations/portfolio.ts` com `PositionSchema` e `PositionUpdateSchema`
- `src/app/(dashboard)/portfolio/page.tsx` como stub (botão desactivado, sem lista)

O que **precisa de ser ajustado antes de avançar**:
- `PositionSchema` em `portfolio.ts` usa `asset_type: z.enum(["stock", "etf", "fii", "crypto", "other"])` — o working item exige apenas "Stock" e "ETF" como opções visíveis na UI (os outros valores existem no DB mas não são expostos nesta fase)
- `currency` em `PositionSchema` aceita apenas `"BRL" | "USD"` — o working item exige também `"EUR"`; o schema do DB tem `CHECK (currency IN ('BRL', 'USD'))` e precisa ser alargado

---

## Tarefas

### T1 — Alargar constraint de moeda no banco de dados
**O quê:** Criar uma nova migration SQL que substitui o CHECK constraint de `currency` na tabela `portfolio_positions` para aceitar `'BRL'`, `'USD'` e `'EUR'`. A migration deve usar `ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT` ou recriar o CHECK inline. Não alterar nenhuma outra tabela.
**Depende de:** Nenhuma
**Cobre:** CA2

### T2 — Corrigir o schema Zod de validação
**O quê:** Em `src/lib/validations/portfolio.ts`, actualizar o campo `currency` de `z.enum(["BRL", "USD"])` para `z.enum(["EUR", "BRL", "USD"])` e manter o `default("BRL")`. Manter os restantes campos do schema sem alteração — os tipos `fii`, `crypto`, `other` ficam no enum do DB mas a UI só exporá `stock` e `etf`; o schema de validação pode mantê-los para não quebrar dados futuros.
**Depende de:** T1 (a migration deve estar aplicada antes de aceitar o novo valor)
**Cobre:** CA2, CA7

### T3 — Criar API Route GET /api/portfolio
**O quê:** Criar `src/app/api/portfolio/route.ts` com o handler `GET`. Seguir o padrão canónico: autenticação (`getUser()`), rate limit, query à tabela `portfolio_positions` filtrando pelo `user_id` da sessão, ordenar por `created_at ASC`. Retornar array de posições com status 200.
**Depende de:** T1
**Cobre:** CA6

### T4 — Criar API Route POST /api/portfolio
**O quê:** No mesmo ficheiro `src/app/api/portfolio/route.ts`, adicionar o handler `POST`. Seguir o padrão canónico: autenticação, rate limit, validação com `PositionSchema.safeParse()`, inserção com `user_id` da sessão. Retornar a posição criada com status 201.
**Depende de:** T2, T3
**Cobre:** CA1, CA2, CA3, CA7

### T5 — Criar API Route PATCH /api/portfolio/[id]
**O quê:** Criar `src/app/api/portfolio/[id]/route.ts` com o handler `PATCH`. Seguir o padrão canónico: autenticação, rate limit, validar `id` como UUID, validação do body com `PositionSchema.partial()` (todos os campos opcionais, mas pelo menos um presente), update filtrando por `id` AND `user_id` da sessão (RLS garante, mas o filtro explícito é boa prática). Retornar a posição actualizada com status 200.
**Depende de:** T2, T3
**Cobre:** CA4, CA7

### T6 — Criar API Route DELETE /api/portfolio/[id]
**O quê:** No mesmo ficheiro `src/app/api/portfolio/[id]/route.ts`, adicionar o handler `DELETE`. Seguir o padrão canónico: autenticação, rate limit, validar `id` como UUID, delete filtrando por `id` AND `user_id` da sessão. Retornar status 204 sem body.
**Depende de:** T3
**Cobre:** CA5

### T7 — Criar componente PositionFormDialog
**O quê:** Criar `src/components/portfolio/position-form-dialog.tsx` como Client Component (`'use client'`). Usar `Dialog` do shadcn/ui. Conter um formulário com os campos obrigatórios: ticker (text), nome (text), tipo (Select com opções fixas "Stock" e "ETF"), quantidade (number), preço médio (number), moeda (Select com opções fixas "EUR", "BRL", "USD"). O componente deve receber uma prop opcional `position` para modo edição — quando presente, pré-preenche os campos. Ao submeter, chamar a prop `onSubmit(data)` passada pelo pai; não fazer fetch directamente. Bloquear o botão de guardar se algum campo obrigatório estiver vazio (CA7). Não incluir os campos `exchange`, `notes` e `current_price` (fora do escopo desta fase).
**Depende de:** Nenhuma (pode ser desenvolvida em paralelo com as API routes)
**Cobre:** CA1, CA2, CA3, CA4, CA7

### T8 — Criar componente PositionDeleteDialog
**O quê:** Criar `src/components/portfolio/position-delete-dialog.tsx` como Client Component. Usar `AlertDialog` do shadcn/ui. Exibir mensagem de confirmação com o ticker da posição a eliminar. Ao confirmar, chamar a prop `onConfirm()` passada pelo pai. Ao cancelar, fechar sem acção.
**Depende de:** Nenhuma (pode ser desenvolvida em paralelo)
**Cobre:** CA5

### T9 — Criar componente PositionTable
**O quê:** Criar `src/components/portfolio/position-table.tsx` como Client Component. Receber a lista de posições via prop. Renderizar uma tabela com as colunas: Ticker, Nome, Tipo, Quantidade, Preço Médio, Moeda. Incluir em cada linha dois botões de acção: editar (abre `PositionFormDialog` em modo edição) e eliminar (abre `PositionDeleteDialog`). Quando a lista estiver vazia, renderizar a mensagem de estado vazio actual. Formatar o tipo para exibição: "stock" → "Stock", "etf" → "ETF".
**Depende de:** T7, T8
**Cobre:** CA3, CA4, CA5, CA6

### T10 — Implementar a página de portfólio
**O quê:** Reescrever `src/app/(dashboard)/portfolio/page.tsx` como Server Component. Buscar as posições do utilizador via `fetch` interno à API (ou directamente via Supabase server client). Passar a lista de posições para `PositionTable`. Incluir o botão "Adicionar Posição" funcional que abre `PositionFormDialog` em modo criação — como o Server Component não pode gerir estado de dialog, extrair a lógica de orquestração (fetch, open/close dialogs, callbacks de CRUD) para um novo Client Component `src/components/portfolio/portfolio-client.tsx`; a `page.tsx` serve apenas como shell que passa os dados iniciais.
**Depende de:** T3, T4, T5, T6, T9
**Cobre:** CA1, CA2, CA3, CA4, CA5, CA6, CA7

---

## Ordem de Execução

T1 → T2 → T3 → T4, T5, T6 (paralelas) → T7, T8 (paralelas, podem arrancar após T2) → T9 → T10

Representação linearizada por fases:

**Fase 1 — Base de Dados:** T1

**Fase 2 — Validação:** T2

**Fase 3 — API:** T3 → T4, T5, T6

**Fase 4 — UI (componentes folha):** T7, T8

**Fase 5 — UI (composição):** T9

**Fase 6 — UI (página):** T10

---

## Cobertura de Critérios de Aceite

| Critério de Aceite | Tarefas |
|---|---|
| CA1 — Adicionar activo com todos os campos | T4, T7, T10 |
| CA2 — Moeda: lista fixa EUR, BRL, USD | T1, T2, T4, T7 |
| CA3 — Tipo: lista fixa Stock e ETF | T4, T7, T9 |
| CA4 — Editar qualquer campo de activo existente | T5, T7, T9, T10 |
| CA5 — Remover activo com confirmação | T6, T8, T9, T10 |
| CA6 — Listagem com colunas: ticker, nome, tipo, quantidade, preço médio, moeda | T3, T9, T10 |
| CA7 — Todos os campos obrigatórios; não guardar incompleto | T2, T4, T5, T7 |
---
