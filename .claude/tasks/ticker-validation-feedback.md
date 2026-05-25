# Plano de Tarefas — Feedback de Erro e Verificação de Ticker

**Working Item:** `.claude/working-items/ticker-validation-feedback.md`
**Criado por:** Scrum Master
**Data:** 2026-05-23

---

## Visão Geral da Implementação

O Engineer deve implementar **3 tarefas de código** seguidas de **2 tarefas de verificação**. A ordem é estrita: a Tarefa 2 depende da Tarefa 1 (a API route deve existir antes de ser chamada pelo formulário). A Tarefa 3 (refactoring do `portfolio-client`) deve ser feita em conjunto com a Tarefa 2 para manter consistência. As tarefas de verificação (typecheck e lint) são sempre as últimas.

---

## TAREFA 1 — Criar `GET /api/portfolio/verify-ticker` (nova API route)

### Prioridade: PRIMEIRA (sem dependências)

### Ficheiro a criar
`src/app/api/portfolio/verify-ticker/route.ts`

### Descrição
Criar uma nova API route `GET` que aceita um query param `ticker`, valida autenticação, aplica rate limit, valida o input com Zod, chama `getQuote()` do cliente Yahoo Finance e retorna o resultado.

### Implementação detalhada

1. Criar o directório `src/app/api/portfolio/verify-ticker/` e o ficheiro `route.ts`
2. Seguir **exactamente** o padrão canónico de API route do `CLAUDE.md`:
   - `supabase.auth.getUser()` SEMPRE primeiro — retorna 401 se falhar
   - `rateLimit("verify-ticker:<user.id>", 20, 60_000)` — retorna 429 se excedido
   - Schema Zod inline: `z.object({ ticker: z.string().min(1).max(20).trim() })`
   - Ler o query param via `request.nextUrl.searchParams.get("ticker")`
   - Chamar `getQuote(parsed.data.ticker.toUpperCase())` de `@/lib/yahoo-finance/client`
   - Se `quote` for `null` → 422 com `{ error: "Ticker não encontrado no Yahoo Finance. Verifique o símbolo e tente novamente." }`
   - Se `quote` existir → 200 com `{ data: { ticker, name, price, currency } }`

3. Imports necessários:
   ```typescript
   import { NextRequest, NextResponse } from "next/server";
   import { z } from "zod";
   import { createClient } from "@/lib/supabase/server";
   import { rateLimit } from "@/lib/rate-limit";
   import { getQuote } from "@/lib/yahoo-finance/client";
   ```

4. O tipo de retorno da rota (200) deve ser:
   ```typescript
   { data: { ticker: string; name: string; price: number; currency: string } }
   ```

### Regras de segurança obrigatórias
- `yahoo-finance2` é importado através de `@/lib/yahoo-finance/client` (server-only) — nunca directamente
- `user_id` NÃO aparece na resposta desta route — só é usado para o rate limit key
- O ticker no `safeParse` vem do `searchParams`, nunca do body

### Critérios de conclusão
- [ ] Ficheiro `src/app/api/portfolio/verify-ticker/route.ts` existe
- [ ] `GET /api/portfolio/verify-ticker?ticker=AAPL` retorna 200 com `{ data: { ticker, name, price, currency } }`
- [ ] `GET /api/portfolio/verify-ticker?ticker=XXXXINVALID` retorna 422 com `{ error: "Ticker não encontrado..." }`
- [ ] `GET /api/portfolio/verify-ticker` sem autenticação retorna 401
- [ ] `GET /api/portfolio/verify-ticker?ticker=` (vazio) retorna 422 (Zod validation)
- [ ] `GET /api/portfolio/verify-ticker?ticker=ABCDE12345ABCDE12345X` (21 chars) retorna 422 (max 20)

---

## TAREFA 2 — Refactoring de `portfolio-client.tsx`: mover lógica de POST para `PositionFormDialog`

### Prioridade: SEGUNDA (depende de nenhum ficheiro novo, mas é pré-requisito para Tarefa 3)

### Ficheiros a modificar
- `src/components/portfolio/portfolio-client.tsx`
- `src/components/portfolio/position-form-dialog.tsx`

### Descrição
Adoptar a **Opção A** do working item: mover o fetch `POST /api/portfolio` para dentro do `PositionFormDialog`. O `onSubmit` externo passa a ser `onSuccess` — chamado apenas quando o POST retorna 201 com sucesso. Isto elimina o prop drilling de estados de erro e centraliza toda a lógica de rede no componente do formulário.

### Alterações em `portfolio-client.tsx`

1. Remover `isAddLoading` e `setIsAddLoading` — o loading passa a ser gerido internamente pelo `PositionFormDialog`
2. Alterar a função `handleAdd` para não fazer o fetch — apenas receber a `Position` já criada e actualizar o estado:
   ```typescript
   function handleAdd(newPosition: Position) {
     setPositions((prev) => [newPosition, ...prev]);
     setIsAddOpen(false);
   }
   ```
3. No `<PositionFormDialog>`, substituir `onSubmit={handleAdd}` por `onSuccess={handleAdd}` e remover o prop `isLoading`
4. Manter `handleEdit` e `handleDelete` sem alterações (não são afectados)

### Alterações em `position-form-dialog.tsx` — interface e props

1. Alterar `PositionFormDialogProps`:
   - Remover `onSubmit: (data: PositionFormData) => void`
   - Adicionar `onSuccess: (position: Position) => void` onde `Position` é importado de `@/components/portfolio/position-table`
   - Manter `isLoading?: boolean` como prop opcional (pode ser usado como override externo — manter por compatibilidade mas não é obrigatório passar)
   - Remover dependência de `isLoading` externo para controlar o botão — usar o `isSubmitting` interno

2. Importar `type Position` de `@/components/portfolio/position-table`

### Critérios de conclusão
- [ ] `portfolio-client.tsx` não tem `isAddLoading` nem lógica de fetch no `handleAdd`
- [ ] `PositionFormDialog` recebe `onSuccess` em vez de `onSubmit`
- [ ] TypeScript não reporta erros na interface modificada

---

## TAREFA 3 — Actualizar `position-form-dialog.tsx` com verificação, preview e feedback de erro

### Prioridade: TERCEIRA (depende das Tarefas 1 e 2)

### Ficheiro a modificar
`src/components/portfolio/position-form-dialog.tsx`

### Descrição
Adicionar ao componente: estados de verificação, lógica de `handleVerify`, lógica de `handleSubmit` com fetch interno, botão "Verificar", bloco de preview, mensagem de erro acessível, e reset de todos os estados ao abrir/fechar o diálogo.

### Novos estados a adicionar (usar `React.useState`)

```typescript
const [tickerError, setTickerError] = React.useState<string | null>(null);
const [tickerVerifying, setTickerVerifying] = React.useState(false);
const [tickerPreview, setTickerPreview] = React.useState<{
  name: string;
  price: number;
  currency: string;
} | null>(null);
const [isSubmitting, setIsSubmitting] = React.useState(false);
```

### Actualizar `useEffect` de reset

No `useEffect` existente que reseta o formulário quando `open` muda, adicionar reset dos novos estados:

```typescript
React.useEffect(() => {
  if (open) {
    setTicker(position?.ticker ?? "");
    setAssetType(resolveAssetType(position?.asset_type));
    setQuantity(position?.quantity?.toString() ?? "");
    setAvgPrice(position?.avg_price?.toString() ?? "");
    setCurrency(position?.currency ?? "BRL");
    // Novos estados
    setTickerError(null);
    setTickerVerifying(false);
    setTickerPreview(null);
    setIsSubmitting(false);
  }
}, [open, position]);
```

### Alterar `onChange` do campo Ticker

Limpar o erro e o preview quando o utilizador editar o campo:

```typescript
onChange={(e) => {
  setTicker(e.target.value);
  setTickerError(null);
  setTickerPreview(null);
}}
```

### Função `handleVerify`

```typescript
async function handleVerify() {
  const trimmed = ticker.trim().toUpperCase();
  if (!trimmed) return;

  setTickerVerifying(true);
  setTickerError(null);
  setTickerPreview(null);

  try {
    const res = await fetch(`/api/portfolio/verify-ticker?ticker=${encodeURIComponent(trimmed)}`);
    const body = await res.json() as { data?: { name: string; price: number; currency: string }; error?: string };

    if (res.ok && body.data) {
      setTickerPreview(body.data);
    } else {
      setTickerError(body.error ?? "Erro ao verificar o ticker.");
    }
  } catch {
    setTickerError("Erro ao comunicar com o servidor. Tente novamente.");
  } finally {
    setTickerVerifying(false);
  }
}
```

### Função `handleSubmit` (substituir a actual)

O formulário passa a gerir o fetch POST internamente (Opção A):

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!isFormValid || isSubmitting || tickerVerifying) return;

  setIsSubmitting(true);
  setTickerError(null);

  try {
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker: ticker.trim().toUpperCase(),
        asset_type: assetType,
        quantity: Number(quantity),
        avg_price: Number(avgPrice),
        currency,
      }),
    });

    const body = await res.json() as { data?: Position; error?: string };

    if (!res.ok) {
      // CA-01: manter diálogo aberto e exibir erro
      if (res.status === 422 || res.status === 429) {
        setTickerError(body.error ?? "Erro ao adicionar posição.");
      } else {
        setTickerError("Erro ao comunicar com o servidor. Tente novamente.");
      }
      return;
    }

    if (body.data) {
      onSuccess(body.data);
    }
  } catch {
    // CA-09: erro de rede
    setTickerError("Erro ao comunicar com o servidor. Tente novamente.");
  } finally {
    setIsSubmitting(false);
  }
}
```

### Layout do campo Ticker com botão "Verificar" (CA-03)

Substituir o `<div className="grid gap-1.5">` do campo Ticker pelo seguinte bloco:

```tsx
{/* Ticker */}
<div className="grid gap-1.5">
  <Label htmlFor="ticker">Ticker *</Label>
  <div className="flex gap-2">
    <Input
      id="ticker"
      placeholder="ex: AAPL"
      value={ticker}
      onChange={(e) => {
        setTicker(e.target.value);
        setTickerError(null);
        setTickerPreview(null);
      }}
      maxLength={20}
      required
      className="flex-1"
      aria-describedby={tickerError ? "ticker-error" : undefined}
    />
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleVerify}
      disabled={!ticker.trim() || tickerVerifying || isSubmitting}
    >
      {tickerVerifying ? "A verificar..." : "Verificar"}
    </Button>
  </div>

  {/* Preview de ticker válido (CA-04) */}
  {tickerPreview && (
    <div className="rounded-md border border-border/50 bg-muted px-3 py-2 text-sm">
      <p className="text-foreground font-medium">{tickerPreview.name}</p>
      <p className="text-[var(--primary)] tabular-nums">
        {tickerPreview.currency} {tickerPreview.price.toFixed(2)}
      </p>
    </div>
  )}

  {/* Mensagem de erro (CA-01, CA-05, CA-09, CA-10) */}
  {tickerError && (
    <p id="ticker-error" role="alert" className="text-[var(--destructive)] text-sm">
      {tickerError}
    </p>
  )}
</div>
```

**Nota:** O `maxLength` do Input Ticker deve ser alterado de `10` para `20` para alinhar com o schema Zod da nova route (max 20).

### Botões do `DialogFooter`

Actualizar para usar `isSubmitting` interno em vez de `isLoading` externo:

```tsx
<DialogFooter>
  <Button
    type="button"
    variant="outline"
    onClick={() => onOpenChange(false)}
    disabled={isSubmitting || tickerVerifying}
  >
    Cancelar
  </Button>
  <Button type="submit" disabled={!isFormValid || isSubmitting || tickerVerifying}>
    {isSubmitting ? "A guardar..." : isEditing ? "Guardar" : "Adicionar"}
  </Button>
</DialogFooter>
```

### Critérios de conclusão
- [ ] Botão "Verificar" presente ao lado do campo Ticker, desactivado quando ticker está vazio ou com só espaços
- [ ] Clicar "Verificar" com `AAPL` exibe preview (nome + preço + moeda) com estilo correcto
- [ ] Clicar "Verificar" com `XXXXINVALID` exibe mensagem de erro vermelha abaixo do campo
- [ ] Editar o ticker após preview/erro limpa imediatamente o estado visual
- [ ] Submit com ticker inválido (POST 422) mantém o diálogo aberto e exibe erro abaixo do ticker
- [ ] Submit com ticker válido fecha o diálogo e adiciona a posição à tabela
- [ ] Botão "Adicionar"/"Guardar" desactivado durante `isSubmitting` e `tickerVerifying`
- [ ] Fechar e reabrir o diálogo limpa todos os estados (preview, erro, loading)
- [ ] `role="alert"` presente na `<p>` de erro; `aria-describedby` no Input quando há erro
- [ ] `maxLength` do Input Ticker é `20` (alinhado com Zod schema da nova route)

---

## TAREFA 4 — Typecheck: zero erros TypeScript

### Prioridade: QUARTA (após todas as tarefas de código)

### Comando
```powershell
npm run typecheck
```

### Descrição
Executar o type check completo do projecto. Resolver **todos** os erros antes de continuar.

### Erros comuns a antecipar
- `onSuccess` vs `onSubmit` — verificar que `portfolio-client.tsx` usa `onSuccess` e `position-form-dialog.tsx` exporta a interface actualizada
- Import de `type Position` no `position-form-dialog.tsx` — confirmar que o path `@/components/portfolio/position-table` exporta `Position`
- Tipo do `body` nos `fetch` responses — usar type assertions explícitas com `as { data?: ...; error?: string }`
- `isLoading` prop removido ou mantido como opcional — se removido, confirmar que `portfolio-client.tsx` não o passa

### Critérios de conclusão
- [ ] `npm run typecheck` termina com exit code 0
- [ ] Zero erros TypeScript reportados

---

## TAREFA 5 — Lint: zero erros ESLint

### Prioridade: QUINTA (após typecheck passar)

### Comando
```powershell
npm run lint
```

### Descrição
Executar o linter. Resolver **todos** os erros antes de concluir.

### Erros comuns a antecipar
- `@typescript-eslint/no-explicit-any` — não usar `any` nos novos ficheiros; usar type assertions explícitas
- `catch` blocks vazios — a nova route e o `handleVerify` têm blocos `catch`; usar `catch { ... }` sem variável se o erro não é usado, ou `catch (err) { ... }` se é logado
- Variáveis não usadas — confirmar que `isLoading` externo (se mantido como prop opcional) não causa warnings
- `react-hooks/exhaustive-deps` — confirmar que o `useEffect` de reset tem as dependências correctas (`[open, position]`)

### Critérios de conclusão
- [ ] `npm run lint` termina com exit code 0
- [ ] Zero erros ESLint reportados
- [ ] Warnings aceitáveis apenas se já existiam antes desta feature (não introduzir novos)

---

## Resumo da Ordem de Execução

```
TAREFA 1: Criar src/app/api/portfolio/verify-ticker/route.ts
    ↓
TAREFA 2: Refactoring portfolio-client.tsx + interface PositionFormDialogProps
    ↓
TAREFA 3: Implementar verify/preview/erro em position-form-dialog.tsx
    ↓
TAREFA 4: npm run typecheck (zero erros)
    ↓
TAREFA 5: npm run lint (zero erros)
```

## Ficheiros Modificados/Criados

| Ficheiro | Acção |
|---|---|
| `src/app/api/portfolio/verify-ticker/route.ts` | CRIAR |
| `src/components/portfolio/portfolio-client.tsx` | MODIFICAR |
| `src/components/portfolio/position-form-dialog.tsx` | MODIFICAR |

## Ficheiros NÃO modificar

| Ficheiro | Razão |
|---|---|
| `src/lib/yahoo-finance/client.ts` | Já expõe `getQuote()` com a interface correcta |
| `src/lib/rate-limit.ts` | Já tem a assinatura correcta para uso directo |
| `src/lib/validations/portfolio.ts` | Schema de criação de posição não muda |
| `src/app/api/portfolio/route.ts` | POST já retorna 422 correctamente — sem alterações |
| `src/types/database.ts` | Gerado pelo Supabase CLI — nunca editar manualmente |
