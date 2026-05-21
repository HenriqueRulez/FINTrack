---
# Relatório de Implementação — Gestão de Portfólio

**Plano:** `.claude/tasks/portfolio.md`
**Typecheck:** Zero erros (`npm run typecheck` concluiu sem erros)

---

## Ficheiros Criados

- `supabase/migrations/0005_portfolio_currency_eur.sql` — Migration que remove o CHECK constraint `currency IN ('BRL', 'USD')` e cria um novo com `currency IN ('BRL', 'USD', 'EUR')`
- `src/app/api/portfolio/route.ts` — API Route com handlers GET e POST para `/api/portfolio`
- `src/app/api/portfolio/[id]/route.ts` — API Route com handlers PATCH e DELETE para `/api/portfolio/[id]`
- `src/components/portfolio/position-form-dialog.tsx` — Dialog de criação/edição de posição (Client Component)
- `src/components/portfolio/position-delete-dialog.tsx` — AlertDialog de confirmação de remoção (Client Component)
- `src/components/portfolio/position-table.tsx` — Tabela de posições com acções de editar/remover (Client Component)
- `src/components/portfolio/portfolio-client.tsx` — Orquestrador client-side: estado da lista, abertura de dialogs, chamadas CRUD à API

## Ficheiros Modificados

- `src/lib/validations/portfolio.ts` — Campo `currency` alargado de `z.enum(["BRL", "USD"])` para `z.enum(["EUR", "BRL", "USD"])`
- `src/app/(dashboard)/portfolio/page.tsx` — Reescrito como Server Component: busca posições iniciais via Supabase server client e passa-as ao `PortfolioClient`
- `src/lib/utils.ts` — Restauradas as funções `formatCurrency`, `formatDate`, `formatPercent` que o `shadcn init` sobrescreveu; `formatCurrency` actualizada para suportar `"EUR"` (locale `de-DE`)
- `src/components/ui/` — Adicionados componentes shadcn/ui: `button`, `dialog`, `alert-dialog`, `select`, `input`, `label` (via `npx shadcn@latest`)

## Tarefas Implementadas

- [x] T1 — Migration `0005_portfolio_currency_eur.sql` alarga constraint de moeda para EUR
- [x] T2 — Schema Zod `PositionSchema` aceita agora `"EUR" | "BRL" | "USD"`
- [x] T3 — GET `/api/portfolio` com auth, rate limit, query ordenada por `created_at ASC`
- [x] T4 — POST `/api/portfolio` com auth, rate limit, validação Zod, inserção com `user_id` da sessão
- [x] T5 — PATCH `/api/portfolio/[id]` com auth, rate limit, validação UUID + Zod partial, update com filtro explícito `id AND user_id`
- [x] T6 — DELETE `/api/portfolio/[id]` com auth, rate limit, validação UUID, delete com filtro `id AND user_id`
- [x] T7 — `PositionFormDialog`: Dialog com campos ticker, nome, tipo (Stock/ETF), quantidade, preço médio, moeda (EUR/BRL/USD); modo criação e edição via prop `position`; botão bloqueado se form inválido
- [x] T8 — `PositionDeleteDialog`: AlertDialog com confirmação de remoção do ticker; prop `onConfirm()` chamada pelo pai
- [x] T9 — `PositionTable`: tabela com colunas ticker, nome, tipo, quantidade, preço médio, moeda; botões editar/remover por linha; estado vazio
- [x] T10 — `portfolio/page.tsx` como Server Component + `PortfolioClient` para orquestração de estado e CRUD

---

## Notas para o QA

### Comportamentos não óbvios

1. **shadcn/ui instalado na inicialização**: O `npx shadcn@latest init` sobrescreveu `src/lib/utils.ts` removendo `formatCurrency`, `formatDate` e `formatPercent`. Foram restauradas manualmente e `formatCurrency` foi actualizada para suportar EUR (locale `de-DE`).

2. **Type cast `as any` no insert e update**: `@supabase/postgrest-js@2.106.0` introduziu `RejectExcessProperties` nos métodos `.insert()` e `.update()`. O tipo `Database` gerado pelo CLI actual não inclui a key `__InternalSupabase` que a v2 usa para inferência completa, resultando em tipo `never` nos argumentos. O workaround é o `supabase as any` com o payload explicitamente tipado com `TablesInsert<>` / `TablesUpdate<>` — garante type safety na construção do payload e bypass apenas no call do Supabase. O GET, DELETE e `.select()` não têm este problema.

3. **Migration não aplicada automaticamente**: A migration `0005_portfolio_currency_eur.sql` precisa de ser aplicada com `npx supabase db push` antes de testar inserção/edição com `currency: "EUR"`. Sem aplicar, o DB rejeita o valor com erro de constraint.

4. **Dados iniciais carregados no servidor**: O `page.tsx` usa `createClient()` de `server.ts` para buscar as posições iniciais sem passar pela API route. O `PortfolioClient` recebe `initialPositions` e gere o estado localmente; mutações (add/edit/delete) usam fetch à API.

5. **Modo edição na tabela**: O `PositionTable` mapeia `asset_type` do DB (que pode ser `fii`, `crypto`, `other`) para o formulário como `"stock"` quando o valor não é `"etf"`. Posições com tipos fora de Stock/ETF podem ser editadas mas o formulário mostrará "Stock" como tipo seleccionado.

6. **shadcn usa `@base-ui/react`**: Os componentes instalados (Dialog, AlertDialog, Select, Input, Label, Button) usam `@base-ui/react` em vez do tradicional `@radix-ui`. A API é ligeiramente diferente mas compatível.

7. **`PositionFormDialog` reseta ao abrir**: O `useEffect` detecta mudanças em `open` + `position` e reinicia todos os campos, garantindo que abrir o dialog em modo criação limpa dados de uma edição anterior.

---
