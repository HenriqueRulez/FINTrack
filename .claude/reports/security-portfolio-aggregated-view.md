# Security Audit — Portfolio Aggregated View

**Data:** 2026-05-23
**Auditor:** Security Reviewer (claude-sonnet-4-6)
**Feature:** Portfolio Aggregated View (sparklines + posição agregada)
**Veredito:** SEGURO COM RESSALVAS

---

## Ficheiros Auditados

| Ficheiro | Tipo |
|----------|------|
| `src/app/api/portfolio/history/route.ts` | API Route (servidor) |
| `src/lib/yahoo-finance/client.ts` | Biblioteca servidor |
| `src/types/portfolio.ts` | Lógica de agregação (puro) |
| `src/components/portfolio/price-sparkline.tsx` | Client Component |
| `src/components/portfolio/position-table.tsx` | Client Component |
| `src/components/portfolio/portfolio-client.tsx` | Client Component |

---

## 1. API Route — `history/route.ts`

### 1.1 Autenticação
- **PASS** — `supabase.auth.getUser()` é a primeira operação significativa (linha 22), antes de qualquer lógica
- **PASS** — Retorna 401 imediatamente se `authError || !user` (linha 23-25)
- **PASS** — Usa `getUser()` e não `getSession()` — correcto segundo o padrão canónico

### 1.2 Rate Limiting
- **PASS** — Rate limit aplicado após auth, escopo por `user.id` (linha 28)
- **PASS** — Limite de 60 req/min — razoável para sparklines carregadas por ticker
- **NOTA** — 60 req/min é ligeiramente generoso se o utilizador tiver muitos tickers; cada render do portfolio-client dispara N fetches em paralelo. Não é vulnerabilidade — informacional.

### 1.3 Validação de Input
- **PASS** — `ticker` validado com Zod via `HistoryQuerySchema` (linha 7-13)
- **PASS** — Regex `/^[A-Z0-9.\-]+$/i` — previne injecção de path traversal, SSRF por caracter especial, e XSS em logs
- **PASS** — `max(20)` limita o tamanho — previne inputs excessivamente longos
- **PASS** — `safeParse` usado correctamente — nunca `parse()` que lança

### 1.4 Exposição de Erros
- **PASS** — Sem `console.log`/`console.error` na route — nenhum dado sensível exposto nos logs do servidor
- **PASS** — Erros do Yahoo Finance são tratados em `getHistory()` e resultam em array vazio — sem leakage de stack trace para o cliente
- **PASS** — Retorna sempre 200 com `{ data: [] }` em caso de falha — não revela se o ticker existe ou não externamente

### 1.5 user_id da sessão
- **PASS** — Não há operações de DB neste endpoint (apenas Yahoo Finance) — user_id não aplicável

---

## 2. Biblioteca Yahoo Finance — `client.ts`

### 2.1 Fronteira servidor/cliente
- **PASS** — Ficheiro é server-only (sem `"use client"`, sem exports de componente)
- **PASS** — Nenhum dado de autenticação ou user_id é processado aqui

### 2.2 Cache em memória
- **PASS** — Cache de 15 min para quotes e 1h para histórico — adequado para app pessoal
- **ACHADO B-05** — `historyCache` (Map) sem limite de tamanho de entradas, análogo ao B-04 já registado para `cache`. Com sparklines, este cache pode crescer para tantos tickers quanto o utilizador tiver. Para app pessoal com <100 tickers, impacto é negligível, mas é a mesma limitação estrutural.

### 2.3 Logging
- **ACHADO B-06** — `console.error` em `getHistory` (linha 104) inclui o ticker e o objecto de erro completo do Yahoo Finance. Em produção, logs de servidor podem conter stack traces detalhados sobre a integração externa. Mitigado parcialmente porque: (a) o ticker foi validado pelo Zod antes de chegar aqui, (b) é log de servidor, não exposto ao browser. Risco baixo.

### 2.4 Injecção
- **PASS** — Ticker já foi validado pelo Zod antes de chegar a `getHistory()`; a função aceita o valor sanitizado
- **PASS** — Sem construção de queries SQL ou shell commands com o ticker

---

## 3. Lógica de Agregação — `src/types/portfolio.ts`

### 3.1 Acesso a dados externos
- **PASS** — `aggregatePositions()` é função pura: recebe array de `Position`, retorna `AggregatedPosition[]`
- **PASS** — Sem imports de Supabase, Anthropic, Yahoo Finance, ou fetch
- **PASS** — Sem operações assíncronas

### 3.2 Isolamento de dados
- **PASS** — Função opera exclusivamente sobre os dados recebidos como argumento — sem acesso global a estado ou DB
- **PASS** — Impossível expor dados de outros utilizadores por esta via (a filtragem por user_id é responsabilidade da API que fornece o array)

### 3.3 Aritmética de divisão por zero
- **PASS** — `totalInvested !== 0` verificado antes de calcular `gainLossPct` (linha 46) — sem `NaN` ou `Infinity`
- **PASS** — `totalQty` pode ser zero se todas as entradas tiverem `quantity: 0`, mas esse cenário deveria ser impedido pela validação do form. Não é uma vulnerabilidade de segurança.

---

## 4. Client Components

### 4.1 Imports proibidos
- **PASS** — `price-sparkline.tsx`: sem imports de `yahoo-finance2`, `supabase/server`, `@/lib/anthropic/`
- **PASS** — `position-table.tsx`: sem imports de `yahoo-finance2`, `supabase/server`, `@/lib/anthropic/`
- **PASS** — `portfolio-client.tsx`: sem imports de `yahoo-finance2`, `supabase/server`, `@/lib/anthropic/`

### 4.2 Secrets hardcoded
- **PASS** — Nenhum secret, API key, token ou credencial encontrada em nenhum dos três componentes

### 4.3 URLs de fetch
- **PASS** — `price-sparkline.tsx` linha 29: URL relativa `/api/portfolio/history?...`
- **PASS** — `portfolio-client.tsx` linha 19: URL relativa `/api/portfolio`
- **PASS** — `portfolio-client.tsx` linha 47/66: URL relativa `/api/portfolio/${id}`

### 4.4 encodeURIComponent em query params
- **PASS** — `price-sparkline.tsx` linha 29: `encodeURIComponent(ticker)` aplicado — previne HTTP header injection e query string manipulation
- **NOTA** — `portfolio-client.tsx` usa `id` (UUID do Supabase) em path param sem `encodeURIComponent`. Conforme achado M-03 já registado — o UUID é safe por natureza, risco residual muito baixo.

### 4.5 Logging em console (Client Components)
- **ACHADO existente M-02 / B-02** — `portfolio-client.tsx` tem `console.error` nas linhas 30, 55, 71. Já registados como M-02 e B-02. Esta feature não adiciona novos `console.error` problemáticos.
- **PASS** — `price-sparkline.tsx`: sem `console.error` — erros são tratados silenciosamente com `setState("error")` (linha 42)
- **PASS** — `position-table.tsx`: sem `console.error`

### 4.6 XSS
- **PASS** — Nenhum uso de `dangerouslySetInnerHTML` nos ficheiros auditados
- **PASS** — Dados do utilizador (`agg.ticker`, `agg.name`, etc.) são renderizados como texto React — escapados automaticamente

---

## 5. npm audit

**Vulnerabilidades encontradas:** 2 (ambas de severidade moderate)

| Pacote | GHSA | Descrição | Severidade | Nota |
|--------|------|-----------|------------|------|
| `postcss < 8.5.10` (interno do Next.js) | GHSA-qx2v-qp2m-jg93 | XSS via `</style>` não escapado no output CSS | Moderate | Já registado como B-01 |

Sem novas vulnerabilidades de dependências nesta feature. O achado B-01 permanece aberto, aguardando patch do Next.js.

---

## 6. Verificações Automáticas

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | PASS — zero erros |
| `npm run lint` | PASS — zero avisos |
| `npm audit` | 2 moderate (B-01 existente, sem novidades) |

---

## 7. Novos Achados

| ID | Ficheiro | Problema | Severidade |
|----|----------|----------|------------|
| B-05 | `src/lib/yahoo-finance/client.ts:45` | `historyCache` (Map) sem limite de entradas — memory leak potencial idêntico ao B-04 (cache de quotes). Para app pessoal com <100 tickers, impacto negligível. | Baixo |
| B-06 | `src/lib/yahoo-finance/client.ts:104` | `console.error` em `getHistory` loga ticker + objecto de erro completo do Yahoo Finance (stack trace da lib) nos logs do servidor. Risco baixo: ticker foi validado, log é server-side apenas. | Baixo |

---

## 8. Achados Anteriores — Verificação de Resolução

| ID | Status nesta feature |
|----|---------------------|
| M-01 | Aberto — não relacionado com esta feature |
| M-02 | Aberto — `portfolio-client.tsx` não modificado nesta feature de forma a resolver |
| M-03 | Aberto — `portfolio-client.tsx` com `id` sem `encodeURIComponent` permanece |
| B-01 | Aberto — aguarda patch Next.js |
| B-02 | Aberto — `console.error` em `portfolio-client.tsx` permanece |
| B-03 | Aberto — rate limiter sem purge permanece |
| B-04 | Aberto — cache quotes sem limite permanece |

---

## 9. Veredito

**SEGURO COM RESSALVAS**

A feature de Portfolio Aggregated View (sparklines + agregação de posições) está bem construída do ponto de vista de segurança:

- A API route `history/route.ts` segue o padrão canónico sem desvios: `getUser()` primeiro, rate limit, Zod, sem leakage de erros
- Os Client Components não importam código server-only
- `encodeURIComponent` está correctamente aplicado no único query param novo (`ticker` na sparkline)
- A lógica de agregação é pura e sem efeitos laterais

Dois novos achados de baixo risco foram identificados (B-05, B-06), ambos relacionados com o cache em memória do Yahoo Finance, sem impacto em autenticação, autorização ou integridade de dados.

Nenhuma correcção urgente é necessária. Os achados B-05 e B-06 podem ser endereçados numa iteração futura de hardening.
