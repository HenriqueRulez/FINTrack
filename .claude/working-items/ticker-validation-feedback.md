# Working Item — Feedback de Erro e Verificação de Ticker no Formulário de Portfólio

## Descrição

Actualmente, quando o utilizador submete um ticker inválido ou inexistente no Yahoo Finance através do formulário "Adicionar Posição", o formulário fecha silenciosamente sem criar a posição e sem dar qualquer feedback. O POST `/api/portfolio` já retorna 422 com `{ error: "Ticker não encontrado no Yahoo Finance..." }`, mas o formulário ignora esse erro.

Esta feature implementa dois melhoramentos de UX:

1. **Feedback de erro claro no submit** — quando o POST retorna 422 (ticker inválido), o formulário mantém-se aberto e exibe uma mensagem de erro visível por baixo do campo ticker.
2. **Botão "Verificar" ticker** — permite ao utilizador consultar o Yahoo Finance antes de submeter, com preview do nome e preço actual se o ticker for válido, ou mensagem de erro se inválido.

Exemplo de problema real: o utilizador escreve "WEBN" mas o ticker correcto para o ETF alemão é "WEBN.DE". Com esta feature, ao clicar "Verificar", recebe imediatamente o feedback de que "WEBN" não existe, sem precisar de submeter o formulário completo.

---

## Critérios de Aceite

### CA-01 — Mensagem de erro no submit (ticker inválido)
Quando o POST `/api/portfolio` retorna 422, o formulário NÃO fecha. Exibe uma mensagem de erro visível imediatamente abaixo do campo Ticker com o texto proveniente da resposta da API (`error`). A mensagem usa a cor `--destructive` (`text-[var(--destructive)]`). O utilizador pode corrigir o ticker e re-submeter sem reabrir o diálogo.

### CA-02 — Limpar erro ao editar o ticker
Quando o utilizador altera o valor do campo Ticker após um erro (de submit ou de verificação), a mensagem de erro desaparece imediatamente. O estado de erro é limpo no `onChange` do input.

### CA-03 — Botão "Verificar" presente e funcional
O formulário exibe um botão "Verificar" ao lado direito do campo Ticker (ou abaixo, se o layout não comportar). O botão só fica activo quando o campo Ticker tem pelo menos 1 caracter não-vazio após trim. Ao clicar, chama `GET /api/portfolio/verify-ticker?ticker=<TICKER>`.

### CA-04 — Preview do ticker válido
Quando a verificação retorna sucesso (200), exibe um bloco de preview abaixo do campo Ticker com:
- Nome do activo (ex: `iShares Core MSCI World UCITS ETF USD (Acc)`)
- Preço actual com a moeda retornada pelo Yahoo Finance (ex: `EUR 115.42`)
- Estilo: fundo `bg-muted`, borda `border-border/50`, texto `text-sm`, cor do nome `text-foreground`, cor do preço `text-[var(--primary)]` com classe `tabular-nums`

### CA-05 — Erro na verificação (ticker inválido)
Quando a verificação retorna 422 ou 404, exibe uma mensagem de erro abaixo do campo Ticker com o texto da API. Não exibe preview. A mensagem usa `text-[var(--destructive)] text-sm`.

### CA-06 — Estado de loading durante verificação
Enquanto a chamada de verificação está em curso, o botão "Verificar" exibe um spinner (ou texto "A verificar...") e fica desactivado. O botão "Adicionar" / "Guardar" fica igualmente desactivado durante a verificação para evitar submissão simultânea.

### CA-07 — Reset do estado de verificação ao abrir/fechar o diálogo
Ao fechar e reabrir o diálogo (ou ao mudar de posição em modo edição), todos os estados de verificação são limpos: sem preview, sem erros, sem loading. O `useEffect` existente que faz reset do formulário ao abrir deve incluir estes estados adicionais.

### CA-08 — Nova API route autenticada com rate limit e validação Zod
`GET /api/portfolio/verify-ticker?ticker=AAPL` deve:
- Verificar autenticação com `supabase.auth.getUser()` — retorna 401 se não autenticado
- Aplicar rate limit: `rateLimit("verify-ticker:<user.id>", 20, 60_000)` — retorna 429 se excedido
- Validar o query param `ticker` com Zod (string, min 1, max 20, trim) — retorna 422 se inválido
- Chamar `getQuote(ticker)` do `src/lib/yahoo-finance/client.ts`
- Retornar 200 com `{ data: { ticker, name, price, currency } }` se encontrado
- Retornar 422 com `{ error: "Ticker não encontrado no Yahoo Finance. Verifique o símbolo e tente novamente." }` se não encontrado
- Path: `src/app/api/portfolio/verify-ticker/route.ts`

### CA-09 — Erro genérico de rede/servidor
Quando o fetch de verificação ou o POST falham com erro de rede (sem resposta) ou com status 500, exibe a mensagem: "Erro ao comunicar com o servidor. Tente novamente." abaixo do campo Ticker. O formulário não fecha.

### CA-10 — Acessibilidade dos estados de erro
As mensagens de erro são renderizadas numa `<p>` com `role="alert"` para serem anunciadas por leitores de ecrã. O campo Ticker recebe `aria-describedby` apontando para o `id` da mensagem de erro quando esta está visível.

---

## Notas Técnicas para o Engineer

### Nova API Route — `GET /api/portfolio/verify-ticker/route.ts`

Criar em `src/app/api/portfolio/verify-ticker/route.ts`. Seguir o padrão canónico do `CLAUDE.md`:

```typescript
// Exemplo de estrutura — não copiar literalmente, adaptar
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Rate limit — mais permissivo que write mas não ilimitado
  const rl = rateLimit(`verify-ticker:${user.id}`, 20, 60_000);
  if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // 3. Validação Zod do query param
  const ticker = request.nextUrl.searchParams.get("ticker");
  const VerifySchema = z.object({ ticker: z.string().min(1).max(20).trim() });
  const parsed = VerifySchema.safeParse({ ticker });
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  // 4. Consulta Yahoo Finance (usa cache de 15min do client)
  const quote = await getQuote(parsed.data.ticker.toUpperCase());
  if (!quote) return NextResponse.json(
    { error: "Ticker não encontrado no Yahoo Finance. Verifique o símbolo e tente novamente." },
    { status: 422 }
  );

  return NextResponse.json({
    data: { ticker: parsed.data.ticker.toUpperCase(), name: quote.name, price: quote.price, currency: quote.currency }
  }, { status: 200 });
}
```

### Estados adicionais no formulário — `position-form-dialog.tsx`

Adicionar ao estado local do componente (usar `React.useState`):

| Estado | Tipo | Descrição |
|---|---|---|
| `tickerError` | `string \| null` | Mensagem de erro (verificação ou submit) |
| `tickerVerifying` | `boolean` | Loading da chamada de verificação |
| `tickerPreview` | `{ name: string; price: number; currency: string } \| null` | Dados do preview após verificação bem-sucedida |

Limpar `tickerError`, `tickerVerifying` e `tickerPreview` no `useEffect` de reset (quando `open` muda).

Limpar `tickerError` e `tickerPreview` no `onChange` do input Ticker.

### Propagação de erro do submit para o formulário

O componente `PositionFormDialog` actualmente recebe `onSubmit: (data: PositionFormData) => void`. O caller (página de portfólio) é quem faz o fetch e chama `onSubmit`. Para que o erro 422 chegue ao formulário, existem duas abordagens; escolher a mais limpa dado o código actual:

**Opção A (recomendada):** Mover o fetch do POST para dentro do próprio formulário. O `onSubmit` passa a ser `onSuccess: (data: PositionFormData) => void` — chamado apenas quando o POST retorna 201. O formulário gere o seu próprio loading e erro.

**Opção B:** Alterar a assinatura de `onSubmit` para retornar `Promise<{ error?: string }>` e o formulário aguarda a Promise para exibir o erro.

A Opção A é preferida porque centraliza a lógica de rede no componente e evita prop drilling de estados de erro.

Se a Opção A for adoptada, o componente precisará de receber a URL base ou de usar fetch directo para `/api/portfolio` (POST). O `isLoading` prop externo pode ser removido ou mantido como override opcional.

### Layout do campo Ticker com botão "Verificar"

Usar `flex gap-2` para colocar o Input e o botão na mesma linha:

```tsx
<div className="flex gap-2">
  <Input ... className="flex-1" />
  <Button type="button" variant="outline" size="sm" onClick={handleVerify} disabled={!ticker.trim() || tickerVerifying || isLoading}>
    {tickerVerifying ? "A verificar..." : "Verificar"}
  </Button>
</div>
```

### Preview visual (CA-04)

```tsx
{tickerPreview && (
  <div className="rounded-md border border-border/50 bg-muted px-3 py-2 text-sm">
    <p className="text-foreground font-medium">{tickerPreview.name}</p>
    <p className="text-[var(--primary)] tabular-nums">
      {tickerPreview.currency} {tickerPreview.price.toFixed(2)}
    </p>
  </div>
)}
```

### Mensagem de erro (CA-01, CA-05, CA-09)

```tsx
{tickerError && (
  <p id="ticker-error" role="alert" className="text-[var(--destructive)] text-sm">
    {tickerError}
  </p>
)}
```

E no Input Ticker adicionar:
```tsx
aria-describedby={tickerError ? "ticker-error" : undefined}
```

---

## Notas para o QA

### Casos de teste — Botão "Verificar"

| # | Cenário | Input | Resultado esperado |
|---|---|---|---|
| V-01 | Ticker válido (stock americano) | `AAPL` | Preview: "Apple Inc." + preço em USD |
| V-02 | Ticker válido (ETF alemão com sufixo) | `WEBN.DE` | Preview: nome do ETF + preço em EUR |
| V-03 | Ticker inválido / inexistente | `XXXXINVALID` | Mensagem de erro vermelha, sem preview |
| V-04 | Ticker vazio | (campo vazio) | Botão "Verificar" desactivado — não clicável |
| V-05 | Ticker só com espaços | `   ` | Botão "Verificar" desactivado — trim aplicado |
| V-06 | Verificar ticker válido, depois editar o campo | `AAPL` → alterar para `AA` | Preview desaparece imediatamente ao editar |
| V-07 | Duplo clique em "Verificar" | clicar rapidamente 2x | Apenas 1 request enviado — botão desactivado durante loading |
| V-08 | Ticker com 21+ caracteres | string longa | API retorna 422 Validation failed — erro exibido no formulário |

### Casos de teste — Feedback de erro no submit

| # | Cenário | Resultado esperado |
|---|---|---|
| S-01 | Submit com ticker inválido | Formulário NÃO fecha; mensagem de erro vermelha visível abaixo do campo Ticker |
| S-02 | Submit com ticker válido | Formulário fecha; posição criada; sem mensagem de erro |
| S-03 | Corrigir ticker após erro e re-submeter com ticker válido | Erro limpo ao editar; submit bem-sucedido; formulário fecha |
| S-04 | Erro 500 do servidor | Mensagem genérica "Erro ao comunicar com o servidor. Tente novamente." — formulário não fecha |
| S-05 | Erro de rede (offline) | Mensagem genérica de servidor — formulário não fecha |
| S-06 | Rate limit excedido (429) | Mensagem de erro "Too many requests" ou mensagem amigável — formulário não fecha |

### Casos de teste — Reset de estado

| # | Cenário | Resultado esperado |
|---|---|---|
| R-01 | Fechar diálogo após erro de verificação | Ao reabrir, sem erro, sem preview |
| R-02 | Fechar diálogo durante loading de verificação | Ao reabrir, sem loading, sem erro |
| R-03 | Abrir diálogo em modo edição após erro em outra posição | Sem erro, sem preview |

### Verificações de segurança (QA deve confirmar)

- A API route `GET /api/portfolio/verify-ticker` retorna 401 quando chamada sem sessão autenticada (testar via curl ou Postman sem cookie de sessão)
- O query param `ticker` é validado — strings com caracteres especiais (ex: `<script>`) retornam 422 sem processar

### Verificações visuais (dark mode)

- Mensagem de erro usa `text-[var(--destructive)]` — vermelho visível sobre fundo dark (`--card` #101421)
- Preview usa `bg-muted` e `border-border/50` — contraste correcto em dark mode
- Botão "Verificar" usa `variant="outline"` — visível mas não compete com o botão primário "Adicionar"
- Spinner / texto "A verificar..." visível durante loading
