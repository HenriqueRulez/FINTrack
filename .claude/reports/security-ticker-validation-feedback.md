# Auditoria de Segurança — Ticker Validation Feature

**Data:** 2026-05-23
**Auditor:** Security Reviewer (subagente)
**Feature:** Verificação de ticker com Yahoo Finance (CA-03 a CA-10)
**Veredito:** `SEGURO COM RESSALVAS`

---

## Ficheiros Auditados

- `src/app/api/portfolio/verify-ticker/route.ts` (novo)
- `src/components/portfolio/position-form-dialog.tsx` (modificado)
- `src/components/portfolio/portfolio-client.tsx` (modificado)
- `src/components/portfolio/position-table.tsx` (modificado)

---

## 1. CRÍTICO

**Nenhum encontrado.**

---

## 2. ALTO

**Nenhum encontrado.**

---

## 3. MÉDIO

### M-01 — `console.error` pode expor mensagens de erro da API ao utilizador final em produção

**Ficheiro:** `src/components/portfolio/portfolio-client.tsx:45`

**Problema:**
```ts
console.error("Erro ao editar posição:", body.error);
```
O `body.error` é uma string proveniente da resposta da API. Embora as API routes do projeto retornem mensagens genéricas (ex: `"Database error"`), se num futuro a API começar a retornar detalhes mais específicos (mensagens do Supabase, do PostgreSQL, etc.), esse conteúdo ficaria exposto na consola do browser — visível a qualquer utilizador com DevTools abertos.

**Impacto:** Informação interna moderada. Não é explorável directamente, mas pode facilitar reconhecimento por utilizadores maliciosos ou curiosos.

**Correção sugerida:**
```ts
// Opção A: remover o body.error do log, substituir por mensagem genérica
console.error("Erro ao editar posição");

// Opção B: guardar o erro sem o body.error (preferível em produção)
// Silenciar em produção com uma verificação de NODE_ENV
```

---

### M-02 — `id` de posição inserido directamente na URL sem `encodeURIComponent`

**Ficheiro:** `src/components/portfolio/portfolio-client.tsx:37,56`

**Problema:**
```ts
const res = await fetch(`/api/portfolio/${id}`, { method: "PATCH", ... });
const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
```

O `id` é um UUID (string proveniente do estado React, originalmente de `Position.id` que vem da API). Embora UUIDs não contenham caracteres especiais de URL, a ausência de `encodeURIComponent` é uma prática defensiva em falta. Se o tipo `id` alguma vez for alargado ou a origem mudar, existe risco de injecção de path.

**Mitigante existente:** A API route `/api/portfolio/[id]` valida o parâmetro com `UuidSchema = z.string().uuid()`, pelo que qualquer valor não-UUID resulta em 400.

**Impacto:** Baixo risco actual, mas ausência de defesa em profundidade no cliente.

**Correção sugerida:**
```ts
const res = await fetch(`/api/portfolio/${encodeURIComponent(id)}`, { ... });
```

---

## 4. BAIXO / INFORMACIONAL

### B-01 — Rate limiter em memória sem limpeza periódica (memory leak potencial)

**Ficheiro:** `src/lib/rate-limit.ts:14`

**Problema:**
O `Map` do rate limiter nunca é purgado de entradas expiradas. Cada utilizador único gera uma entrada que persiste até ao reinício do servidor. Com muitos utilizadores distintos (improvável neste app pessoal), o uso de memória pode crescer indefinidamente.

**Impacto:** Negligível para app de uso pessoal. Relevante se escalar.

**Correção sugerida:** Adicionar purge periódico das entradas onde `now > entry.reset`, ou migrar para Upstash Redis (já anotado como TODO no código).

---

### B-02 — Cache do Yahoo Finance sem limite de tamanho

**Ficheiro:** `src/lib/yahoo-finance/client.ts:27`

**Problema:**
```ts
const cache = new Map<string, QuoteResult>();
```
O cache de cotações cresce sem limite de entradas. Cada ticker único consultado adiciona uma entrada permanente (até ao TTL). Para um portfolio pessoal com dezenas de tickers, o impacto é negligível, mas não existe salvaguarda contra abusos por enumeration de tickers.

**Mitigante existente:** O endpoint `verify-ticker` tem rate limit de 20 req/min por utilizador, o que limita o crescimento do cache.

**Impacto:** Muito baixo no contexto actual.

**Correção sugerida:** Limitar o cache a N entradas com LRU eviction (ex: biblioteca `lru-cache`).

---

### B-03 — `console.error` em `portfolio-client.tsx:27` expõe o objecto de erro completo

**Ficheiro:** `src/components/portfolio/portfolio-client.tsx:27`

**Problema:**
```ts
console.error("Erro ao refrescar preços do portfólio:", err);
```
O `err` do bloco `catch` é o objecto de erro completo, que pode incluir stack trace, detalhes de rede ou mensagens internas.

**Impacto:** Baixo — visível apenas na consola do browser do utilizador autenticado.

**Correção sugerida:**
```ts
console.error("Erro ao refrescar preços do portfólio");
```

---

## Checklist de Segurança — API Route (`verify-ticker/route.ts`)

| Item | Estado |
|------|--------|
| Primeira operação é `supabase.auth.getUser()` | PASS |
| Retorna 401 imediatamente se `!user` | PASS |
| Rate limit aplicado via `rateLimit()` | PASS (20 req/min) |
| Query param validado com Zod antes de qualquer operação | PASS |
| Erros do Yahoo Finance não expõem detalhes internos | PASS (catch silencioso em `getQuote`) |
| Sem `console.log` que possa vazar dados do utilizador | PASS |
| `user_id` não aceite do exterior | PASS (endpoint só usa `user.id` da sessão) |

---

## Checklist de Segurança — Client Components

| Item | Estado |
|------|--------|
| Nenhum import de `@/lib/anthropic/`, `@/lib/yahoo-finance/` ou `@/lib/supabase/server` | PASS |
| Nenhum secret ou chave API hardcoded | PASS |
| URLs de fetch usam paths relativos (não absolutos com domínio hardcoded) | PASS |
| `encodeURIComponent` nos query params do verify-ticker | PASS (`position-form-dialog.tsx:132`) |
| `encodeURIComponent` nos path params de PATCH/DELETE | RESSALVA (M-02) |

---

## npm audit

**Total de vulnerabilidades:** 2 moderadas, 0 altas, 0 críticas.

| Pacote | Severidade | CVE/Advisory | Descrição |
|--------|-----------|--------------|-----------|
| `postcss` (bundled via `next`) | Moderada | GHSA-qx2v-qp2m-jg93 | XSS via `</style>` não escapado no stringify de CSS. Afecta apenas build time, não runtime de produção. |
| `next` | Moderada | Via postcss acima | Transitivo. |

**Nota:** A versão de `postcss` afectada está apenas no pipeline de build (processamento de CSS via Next.js). Não afecta o runtime do servidor nem dados do utilizador em produção. O fix sugerido pelo `npm audit` (`next@9.3.3`) é na realidade um downgrade major — não aplicar. Aguardar patch da equipa do Next.js.

---

## Verificações Automáticas

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | PASS — 0 erros |
| `npm run lint` | PASS — 0 warnings |

---

## Resumo Executivo

A implementação da feature de verificação de ticker segue correctamente o padrão canónico de segurança do projecto: autenticação com `getUser()` antes de qualquer operação, rate limit por utilizador, validação Zod de todos os inputs, e isolamento server-only das dependências sensíveis (Yahoo Finance, Anthropic, Supabase server).

Os client components não importam nenhuma biblioteca server-only e usam exclusivamente paths relativos nos fetches.

As ressalvas identificadas são de baixo impacto no contexto actual (app pessoal de utilizador único autenticado), mas devem ser corrigidas antes de qualquer exposição pública:

1. **M-01** — Remover `body.error` dos `console.error` nos handlers do `portfolio-client.tsx`
2. **M-02** — Adicionar `encodeURIComponent` nos path params dos fetches PATCH/DELETE

**Veredito: `SEGURO COM RESSALVAS`**
