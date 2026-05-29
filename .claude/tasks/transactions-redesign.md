# Plano de Tarefas — transactions-redesign

**Feature:** transactions-redesign
**Working item:** `.claude/working-items/transactions-redesign.md`
**Frontend report:** `.claude/reports/frontend-transactions-redesign.md`

---

## Estado actual (pós-Frontend)

O Frontend implementou todos os componentes visuais e a rota `/transactions` com dados mock. Typecheck e lint passam com zero erros/warnings. A sidebar foi actualizada e os padrões de animação `rise dN` estão aplicados correctamente em `TxPageHead` (d1) e `TxCard` (d2).

**Único gap crítico identificado:** a rota `/transactions` não está protegida no middleware — qualquer utilizador não autenticado pode aceder a `/transactions` directamente, contornando a autenticação.

---

## Tarefas para o Engineer

### T-01 — Adicionar `/transactions` à lista de rotas protegidas no middleware

**Descrição:**
O array `PROTECTED` em `src/lib/supabase/middleware.ts` contém actualmente:
```ts
const PROTECTED = ["/dashboard", "/portfolio", "/settings", "/holdings", "/performance"];
```
A rota `/transactions` está ausente. Um utilizador não autenticado que aceda directamente a `/transactions` não é redireccionado para `/passphrase` — a página carrega sem autenticação.

**Ficheiros:**
- `src/lib/supabase/middleware.ts`

**Alteração necessária:**
```ts
// Antes
const PROTECTED = ["/dashboard", "/portfolio", "/settings", "/holdings", "/performance"];

// Depois
const PROTECTED = ["/dashboard", "/portfolio", "/settings", "/holdings", "/performance", "/transactions"];
```

**Critérios de conclusão:**
- [ ] `/transactions` adicionado ao array `PROTECTED`
- [ ] Acesso a `/transactions` sem sessão activa redireccionado para `/passphrase`
- [ ] Acesso com sessão activa funciona normalmente
- [ ] `npm run typecheck` zero erros
- [ ] `npm run lint` zero warnings

---

### T-02 — Verificação final: typecheck + lint + smoke test da rota

**Descrição:**
Após T-01, executar o conjunto completo de verificações para confirmar que nenhuma regressão foi introduzida e que a rota `/transactions` está operacional.

**Ficheiros:**
- Nenhum ficheiro adicional a criar — apenas verificação

**Critérios de conclusão:**
- [ ] `npm run typecheck` — zero erros
- [ ] `npm run lint` — zero warnings
- [ ] Servidor de desenvolvimento arranca sem erro (`npm run dev`)
- [ ] Navegar para `/transactions` em modo autenticado carrega a página com dados mock (13 transacções, tab "Buy / Sell" activa por defeito, badges semânticos, footer "Total: 7 transactions")
- [ ] Navegar para `/transactions` sem autenticação redireccionou para `/passphrase`

---

## Contexto adicional para o Engineer

### O que o Frontend já fez (não repetir)

| Componente | Ficheiro | Estado |
|------------|----------|--------|
| Dados mock + tipos TS | `src/components/transactions/mock-data.ts` | Concluído |
| Badge de tipo | `src/components/transactions/TypeBadge.tsx` | Concluído |
| Checkbox custom | `src/components/transactions/CheckBox.tsx` | Concluído |
| Estado vazio | `src/components/transactions/EmptyState.tsx` | Concluído |
| Filtros (4 chips) | `src/components/transactions/FilterRow.tsx` | Concluído |
| Tabs de tipo | `src/components/transactions/TypeTabs.tsx` | Concluído |
| Tabela ordenável | `src/components/transactions/TxTable.tsx` | Concluído |
| Rodapé | `src/components/transactions/TxFooter.tsx` | Concluído |
| Painel de tweaks | `src/components/transactions/TxTweaksPanel.tsx` | Concluído |
| Cabeçalho da página | `src/components/transactions/TxPageHead.tsx` | Concluído |
| Card principal | `src/components/transactions/TxCard.tsx` | Concluído |
| Estado global + filtros | `src/components/transactions/TransactionsPage.tsx` | Concluído |
| Rota (Server Component) | `src/app/(dashboard)/transactions/page.tsx` | Concluído |
| Sidebar (link + badge) | `src/components/layout/sidebar.tsx` | Concluído |

### Notas de segurança

- Esta feature usa dados mock hardcoded — não há chamadas a API nesta fase. A fronteira servidor/cliente está correcta: todos os componentes são Client Components (`"use client"`) sem imports de `src/lib/anthropic/` ou `src/lib/yahoo-finance/`.
- A rota `src/app/(dashboard)/transactions/page.tsx` é um Server Component stub que monta `<TransactionsPage />` — não precisa de `supabase.auth.getUser()` directo porque a protecção é feita pelo middleware (após T-01).
- O `user_id` não é utilizado nesta fase (dados mock) — não há pattern de API route a implementar.

### Referência rápida ao middleware

**Ficheiro:** `src/lib/supabase/middleware.ts`
**Linha a alterar:** linha 4
**Verificação:** o array `PROTECTED` usa `pathname.startsWith(r)` — basta adicionar `"/transactions"` para proteger todas as sub-rotas futuras.
