# Relatório de Implementação — Feedback de Erro e Verificação de Ticker

**Data:** 2026-05-23
**Engineer:** Claude Sonnet 4.6
**Working Item:** `.claude/working-items/ticker-validation-feedback.md`
**Plano:** `.claude/tasks/ticker-validation-feedback.md`

---

## Ficheiros Criados/Modificados

| Ficheiro | Acção |
|---|---|
| `src/app/api/portfolio/verify-ticker/route.ts` | CRIADO |
| `src/components/portfolio/position-form-dialog.tsx` | MODIFICADO (reescrito) |
| `src/components/portfolio/portfolio-client.tsx` | MODIFICADO |
| `src/components/portfolio/position-table.tsx` | MODIFICADO |

---

## Decisões de Implementação

### 1. Nova API Route `GET /api/portfolio/verify-ticker`
- Segue o padrão canónico do `CLAUDE.md`: `supabase.auth.getUser()` primeiro, rate limit, validação Zod.
- Rate limit: `verify-ticker:<user.id>`, 20 req/min (conforme working item CA-08).
- Zod schema: `z.string().min(1).max(20).trim()` — alinhado com o `maxLength={20}` do Input.
- Em caso de erro do Yahoo Finance, retorna 422 com mensagem genérica (não expõe detalhes internos).
- O ticker na resposta é sempre uppercase, independentemente do input.

### 2. Refactoring `portfolio-client.tsx` (Opção A do working item)
- Removidos `isAddLoading` e `setIsAddLoading` — o loading passa a ser gerido internamente pelo `PositionFormDialog`.
- `handleAdd` passou de `async (data: PositionFormData)` para `(newPosition: Position)` — apenas actualiza o estado local e fecha o diálogo.
- Prop `onSubmit` substituída por `onSuccess` no `<PositionFormDialog>` de adição.
- Import de `PositionFormData` mantido porque `handleEdit` ainda usa esse tipo.

### 3. `position-form-dialog.tsx` — novos estados e lógica
- **Opção A adoptada:** o formulário gere o fetch `POST /api/portfolio` internamente em modo criação.
- Em modo edição (`isEditing === true`), delega ao `onSubmit` externo (compatibilidade com `position-table.tsx`).
- Estados adicionados: `tickerError`, `tickerVerifying`, `tickerPreview`, `isSubmitting`.
- `effectiveLoading` combina `isSubmitting` (interno) e `isLoading` (prop opcional externa, para edição).
- `maxLength` do Input Ticker aumentado de `10` para `20` para alinhar com o Zod schema da nova route.
- `aria-describedby` no Input aponta para `id="ticker-error"` quando há erro (CA-10).
- `role="alert"` na `<p>` de erro para leitores de ecrã (CA-10).

### 4. `position-table.tsx` — adaptação ao novo contrato de props
- `PositionFormDialog` agora exige `onSuccess` como prop obrigatória.
- Em modo edição, `onSuccess` é um no-op (o PATCH é gerido externamente via `onSubmit`).
- `onSubmit={handleEditSubmit}` e `isLoading={isEditLoading}` mantidos para compatibilidade.

### 5. Critérios de Aceite cobertos
- CA-01: Submit 422 mantém diálogo aberto com erro inline abaixo do Ticker.
- CA-02: `onChange` do Input limpa `tickerError` e `tickerPreview` imediatamente.
- CA-03: Botão "Verificar" ao lado do Input, desactivado quando ticker vazio/só espaços ou durante loading.
- CA-04: Preview com nome + preço + moeda em `bg-muted / border-border/50 / text-[var(--primary)]`.
- CA-05: Erro de verificação em `text-[var(--destructive)] text-sm`.
- CA-06: Botão "Adicionar"/"Guardar" desactivado durante `isSubmitting` e `tickerVerifying`.
- CA-07: `useEffect` de reset limpa todos os estados ao abrir/fechar o diálogo.
- CA-08: API route autenticada, rate limit 20/min, Zod max 20 chars.
- CA-09: Erros de rede/500 exibem mensagem genérica; formulário não fecha.
- CA-10: `role="alert"` + `aria-describedby` implementados.

---

## Output do Typecheck

```
> fintrack@0.1.0 typecheck
> tsc --noEmit

(sem erros — exit code 0)
```

---

## Output do Lint

```
> fintrack@0.1.0 lint
> eslint src

(sem erros — exit code 0)
```
