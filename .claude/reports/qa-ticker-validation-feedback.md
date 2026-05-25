# Relatório QA — Feedback de Erro e Verificação de Ticker

**Data:** 2026-05-23
**QA:** Claude Sonnet 4.6
**Working Item:** `.claude/working-items/ticker-validation-feedback.md`
**Relatório Engineer:** `.claude/reports/ticker-validation-feedback.md`

---

## Ficheiros Auditados

| Ficheiro | Estado |
|---|---|
| `src/app/api/portfolio/verify-ticker/route.ts` | CRIADO — auditado |
| `src/components/portfolio/position-form-dialog.tsx` | MODIFICADO — auditado |
| `src/components/portfolio/portfolio-client.tsx` | MODIFICADO — auditado |
| `src/components/portfolio/position-table.tsx` | MODIFICADO — auditado |

---

## Verificações Automáticas

### TypeScript (`npm run typecheck`)
```
> fintrack@0.1.0 typecheck
> tsc --noEmit

(sem erros — exit code 0)
```
**PASSOU**

### ESLint (`npm run lint`)
```
> fintrack@0.1.0 lint
> eslint src

(sem erros — exit code 0)
```
**PASSOU**

---

## Critérios Funcionais

### CF-01 — API route existe com auth primeiro, rate limit e Zod
**PASSOU**

`src/app/api/portfolio/verify-ticker/route.ts` segue rigorosamente o padrão canónico:
1. `supabase.auth.getUser()` — primeira operação (linha 19-21)
2. Rate limit `verify-ticker:<user.id>`, 20 req/60s (linha 27-30)
3. Validação Zod `VerifySchema.safeParse()` do query param `ticker` (linhas 33-39)

### CF-02 — API retorna 422 genérico quando ticker inválido (Yahoo Finance)
**PASSOU**

Quando `getQuote()` retorna `null`, a route retorna:
```json
{ "error": "Ticker não encontrado no Yahoo Finance. Verifique o símbolo e tente novamente." }
```
sem expor detalhes internos do Yahoo Finance. A mensagem é genérica e user-friendly.

**Observação menor:** Na falha de validação Zod (ticker com 21+ chars ou vazio), a route inclui `details: parsed.error.flatten()` na resposta 422. Isto está alinhado com o padrão canónico do `CLAUDE.md` (que também inclui `details`) e não expõe detalhes do Yahoo Finance. Não é uma falha de segurança crítica — é comportamento consistente com o resto da API.

### CF-03 — Formulário tem botão "Verificar" que chama API e mostra preview
**PASSOU**

Botão presente (`position-form-dialog.tsx`, linha 244-252):
- `type="button"`, `variant="outline"`, `size="sm"`
- Desactivado quando `!ticker.trim() || tickerVerifying || effectiveLoading`
- Chama `handleVerify()` que faz `GET /api/portfolio/verify-ticker?ticker=<ENCODED>`
- `encodeURIComponent` aplicado correctamente no URL (linha 132)

### CF-04 — Preview usa tokens do design system
**PASSOU**

Preview (linhas 256-263):
- `bg-muted`, `border-border/50`, `text-sm` — tokens TailwindCSS/design system
- `text-foreground font-medium` para o nome
- `text-[var(--primary)] tabular-nums` para o preço

Sem classes hardcoded (`bg-white`, `text-gray-*`, `bg-black`, etc.) — verificado por grep sem resultados.

### CF-05 — Ticker inválido na verificação: erro em `text-[var(--destructive)]`
**PASSOU**

Linha 267: `<p id="ticker-error" role="alert" className="text-[var(--destructive)] text-sm">`

Tanto erros de verificação como de submit partilham este elemento de erro — comportamento correcto.

### CF-06 — Submit com 422: formulário NÃO fecha, erro exibido inline
**PASSOU**

`handleSubmit` (linhas 190-199): quando `!res.ok` e `res.status === 422`, chama `setTickerError(body.error ?? "Erro ao adicionar posição.")` e `return` sem chamar `onSuccess` nem `onOpenChange`. O formulário permanece aberto com o erro visível.

### CF-07 — Estado de verificação reseta quando ticker muda
**PASSOU**

`onChange` do Input Ticker (linhas 234-238):
```tsx
setTicker(e.target.value);
setTickerError(null);     // limpa erro
setTickerPreview(null);   // limpa preview
```
Implementa CA-02 correctamente.

### CF-08 — Modo edição continua funcional
**PASSOU**

Em modo edição (`isEditing === true`), o `handleSubmit` delega ao `onSubmit` externo (linhas 160-168) sem entrar na lógica de fetch interno. A prop `isLoading` externa continua a funcionar via `effectiveLoading`. O `PositionFormDialog` é instanciado em `position-table.tsx` com `onSubmit={handleEditSubmit}` e `isLoading={isEditLoading}` — compatibilidade total mantida.

**Nota:** Em modo edição, erros 422 do PATCH não são propagados como mensagem inline no formulário — o diálogo fecha após o submit independentemente do resultado do fetch. Esta é uma limitação pré-existente e fora do escopo das CAs (que endereçam apenas criação de posições). Não é uma regressão introduzida por esta feature.

### CF-09 — `portfolio-client.tsx` usa `onSuccess` no `PositionFormDialog` de adição
**PASSOU**

Linha 92: `onSuccess={handleAdd}` — correcto. `handleAdd` recebe o `Position` retornado pelo POST e actualiza o estado local sem chamar `onOpenChange` (isso é responsabilidade do formulário após `onSuccess`).

**Observação:** Em `handleAdd` (linha 34), o `setIsAddOpen(false)` fecha o diálogo — comportamento correcto mas que sobrepõe o controlo do diálogo. O formulário não chama `onOpenChange(false)` explicitamente após `onSuccess`, portanto este `setIsAddOpen(false)` é necessário.

### CF-10 — Sem imports server-only em Client Components
**PASSOU**

Grep por `yahoo-finance2` e `supabase/server` em `src/components/` — zero resultados. Os três ficheiros Client Components importam apenas:
- `@/components/ui/*` — shadcn/ui
- `@/components/portfolio/*` — outros Client Components
- `react`, `next` (client APIs)

---

## Critérios de Segurança

### CS-11 — `user_id` nunca vem do body
**PASSOU**

A route `verify-ticker` não usa `user_id` em queries — é uma consulta read-only ao Yahoo Finance. O `user.id` é usado apenas para o rate limit key (`verify-ticker:${user.id}`), sempre extraído da sessão autenticada. Zero leituras do body/query para fins de autorização.

### CS-12 — Rate limit aplicado na verify-ticker route
**PASSOU**

Linha 27-30: `rateLimit(\`verify-ticker:${user.id}\`, 20, 60_000)` — 20 requests por minuto por utilizador. Retorna 429 se excedido.

### CS-13 — Sem secrets ou API keys hardcoded nos ficheiros client
**PASSOU**

Grep por `user_id`, `ANTHROPIC_API_KEY`, `SERVICE_ROLE` em `src/components/portfolio/` — zero resultados. Nenhum secret presente.

---

## Análise Detalhada por Critério de Aceite (Working Item)

| CA | Critério | Estado | Notas |
|---|---|---|---|
| CA-01 | Erro 422 no submit — formulário não fecha, erro inline | PASSOU | `setTickerError` + `return` sem fechar |
| CA-02 | Limpar erro ao editar ticker | PASSOU | `onChange` limpa `tickerError` e `tickerPreview` |
| CA-03 | Botão "Verificar" presente e funcional | PASSOU | `disabled` quando vazio/só espaços |
| CA-04 | Preview com nome + preço + moeda, design system tokens | PASSOU | `bg-muted`, `border-border/50`, `text-[var(--primary)]` |
| CA-05 | Erro verificação em `text-[var(--destructive)] text-sm` | PASSOU | Exactamente como especificado |
| CA-06 | Loading: botão e submit desactivados durante verificação | PASSOU | `effectiveLoading \|\| tickerVerifying` em ambos |
| CA-07 | Reset ao abrir/fechar diálogo | PASSOU | `useEffect` limpa todos os estados (linhas 99-112) |
| CA-08 | Auth, rate limit 20/min, Zod max 20, 422 genérico | PASSOU | Todos implementados conforme spec |
| CA-09 | Erro de rede/500: mensagem genérica, formulário não fecha | PASSOU | `catch {}` em `handleVerify` e `handleSubmit` |
| CA-10 | `role="alert"` + `aria-describedby` | PASSOU | Linha 242 e 267 |

---

## Observações Adicionais

1. **`details` no Zod 422 da verify-ticker route:** A resposta de validação Zod inclui `details: parsed.error.flatten()`. Isto expõe os nomes dos campos e regras de validação (min/max) mas não informação sensível. É consistente com o padrão canónico do `CLAUDE.md`. Impacto: mínimo.

2. **Edit mode error feedback:** Em modo edição, erros PATCH não são exibidos inline no formulário — o diálogo fecha após submit mesmo em erro. Esta é uma limitação pré-existente fora do escopo desta feature. Não é uma regressão.

3. **`handleAdd` em `portfolio-client.tsx` fecha o diálogo:** O `setIsAddOpen(false)` em `handleAdd` (linha 34) fecha o diálogo após sucesso. O formulário em si não chama `onOpenChange(false)` — correcto dado que `onSuccess` recebe o `Position` e o caller decide o que fazer.

4. **`maxLength={20}` no Input alinhado com Zod schema:** O Input Ticker tem `maxLength={20}` (linha 239) alinhado com `z.string().max(20)` na API — consistência correcta.

---

## Conclusão

Todos os 13 critérios de verificação passaram. As duas verificações automáticas (`typecheck` e `lint`) passaram com zero erros. Os critérios funcionais, de design system e de segurança estão todos satisfeitos. As observações identificadas são menores e consistentes com os padrões existentes do projecto.

---

**APROVADO**
