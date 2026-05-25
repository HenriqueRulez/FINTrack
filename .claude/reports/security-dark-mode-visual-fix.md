# Relatório de Segurança — Dark Mode Visual Fix

**Data:** 2026-05-23
**Auditor:** Security Reviewer (subagente)
**Feature:** Dark Mode Visual Fix
**Veredito:** SEGURO COM RESSALVAS

---

## Sumário Executivo

A feature de dark mode visual fix modifica exclusivamente apresentação visual (CSS, Tailwind tokens, estilos de componentes). Nenhuma alteração de lógica de negócio, API routes ou fluxo de autenticação foi introduzida. Não foram encontradas vulnerabilidades críticas ou de alto risco nos arquivos auditados. Existem dois achados de severidade média/baixa que merecem atenção.

---

## Resultados por Categoria

### CRÍTICO

**Nenhum encontrado.**

---

### ALTO

**Nenhum encontrado.**

---

### MÉDIO

#### M-01 — Email hardcoded no componente de autenticação

| Campo     | Detalhe |
|-----------|---------|
| Arquivo   | `src/app/(auth)/passphrase/page.tsx:21` |
| Problema  | O email `owner@fintrack.local` está hardcoded no componente cliente de autenticação. |
| Código    | `email: "owner@fintrack.local",` |
| Impacto   | Em aplicações pessoais de uso único este padrão é aceitável por design (sem registo público). Contudo, o email fica exposto no bundle JavaScript enviado ao browser, o que revela informação sobre a conta de utilizador para quem inspecionar o código fonte. Se alguém tiver acesso ao bundle, sabe o email exato e só precisa de adivinhar a password. |
| Mitigação | Mover o email para uma variável de ambiente `NEXT_PUBLIC_OWNER_EMAIL` ou, preferivelmente, implementar o login exclusivamente no lado do servidor (Server Action) onde o email permanece fora do bundle do browser. |

---

### BAIXO / INFORMACIONAL

#### B-01 — Vulnerabilidade moderada no postcss (dependência transitiva do Next.js)

| Campo     | Detalhe |
|-----------|---------|
| Componente | `next@16.2.6` -> `postcss@8.4.31` (dependência interna) |
| CVE/Advisory | GHSA-qx2v-qp2m-jg93 — PostCSS XSS via `</style>` não escapado no output de CSS Stringify |
| Severidade | Moderada (npm audit) |
| Impacto   | Esta vulnerabilidade afeta o processo de compilação (build-time), não o runtime da aplicação em produção. O vetor de ataque requer que CSS controlado por um atacante seja processado por PostCSS. Numa aplicação onde o CSS é definido pelos próprios developers, o risco prático é muito baixo. |
| Estado    | O fix recomendado pelo npm (`npm audit fix --force`) faria um downgrade para Next.js 9.x — inaceitável. A versão `postcss@8.5.15` (já instalada para `@tailwindcss/postcss`) está acima do limiar vulnerável (`< 8.5.10`). O problema está na cópia interna do Next.js que não pode ser substituída sem quebrar o framework. |
| Mitigação | Aguardar uma release do Next.js que actualize a sua dependência interna. Monitorizar o advisory. Sem acção imediata necessária. |

#### B-02 — Ausência de feedback de erro genérico no formulário de passphrase

| Campo     | Detalhe |
|-----------|---------|
| Arquivo   | `src/app/(auth)/passphrase/page.tsx:57` |
| Problema  | A mensagem de erro "Palavra-passe incorrecta." confirma implicitamente que o email existe no sistema (user enumeration). |
| Impacto   | Para uma aplicação pessoal com um único utilizador, o risco prático é desprezível. Em contexto multi-utilizador seria ALTO. Anotado para completude. |
| Mitigação | Já está tratado pelo design single-user. Sem acção necessária. |

#### B-03 — `console.error` com detalhes de erros de API nos componentes cliente

| Campo     | Detalhe |
|-----------|---------|
| Arquivos  | `src/components/portfolio/portfolio-client.tsx:27,43,65` |
| Problema  | Erros da API (incluindo mensagens do servidor) são logados via `console.error` e ficam visíveis na consola do browser. |
| Impacto   | Baixo — a aplicação é de uso pessoal e o utilizador é o próprio developer. As mensagens de erro não vazam tokens ou credenciais. |
| Mitigação | Opcional: substituir por um sistema de notificação UI (toast) sem expor detalhes técnicos ao utilizador. |

---

## Verificações Realizadas

### Typecheck (`npm run typecheck`)
**Resultado:** PASSOU — zero erros.

### Lint (`npm run lint`)
**Resultado:** PASSOU — zero avisos ou erros.

### Secrets em componentes cliente
Verificação de `ANTHROPIC_API_KEY`, `SERVICE_ROLE_KEY`, `supabaseServiceRole` em todos os ficheiros `.ts`/`.tsx` em `src/components/`.
**Resultado:** Nenhum secret encontrado em componentes cliente.

A referência a `ANTHROPIC_API_KEY` encontrada em `src/lib/anthropic/client.ts` é um comentário explicativo + uso correto em módulo server-only — não exposto ao browser.

### Fronteira servidor/cliente
- `src/components/layout/sidebar.tsx` (`use client`): importa apenas `next/link`, `next/navigation`, `@/lib/utils` — correto.
- `src/components/layout/navbar.tsx` (`use client`): importa `@/lib/supabase/client` (browser client) — correto.
- `src/app/(auth)/passphrase/page.tsx` (`use client`): importa `@/lib/supabase/client` (browser client) — correto.
- `src/components/portfolio/portfolio-client.tsx` (`use client`): sem imports de server libs — correto.
- `src/components/portfolio/position-table.tsx` (`use client`): sem imports de server libs — correto.
- `src/components/portfolio/position-form-dialog.tsx` (`use client`): sem imports de server libs — correto.
- `src/app/(dashboard)/dashboard/page.tsx` (Server Component): sem imports de libs server-only directos — correto (página estática de placeholder).
- `src/app/(dashboard)/settings/page.tsx` (Server Component): usa `requireUser()` de `@/lib/auth` que internamente usa `@/lib/supabase/server` — correto.

### Padrão de API Routes
Ambas as routes auditadas (`/api/portfolio` e `/api/portfolio/[id]`) seguem o padrão canónico:
1. `supabase.auth.getUser()` — sempre primeiro, nunca `getSession()`.
2. Rate limit aplicado antes de qualquer operação de dados.
3. Validação Zod com `safeParse` antes de qualquer DB query.
4. `user_id` sempre da sessão autenticada, nunca do body.
5. Filtro explícito `.eq("user_id", user.id)` em todas as queries, mesmo com RLS activo (defense in depth).

### Schema Zod (`src/lib/validations/portfolio.ts`)
- `ticker`: `string`, `min(1)`, `max(10)`, `toUpperCase()`, `trim()` — correto.
- `asset_type`: `enum(["stock", "etf", "fii", "crypto"])` — tipos correctos e completos.
- `quantity`: `number`, `positive()` — correto.
- `avg_price`: `number`, `positive()` — correto.
- `currency`: `enum(["EUR", "BRL", "USD"])`, `default("BRL")` — correto.
- `exchange`: `string`, `max(20)`, `optional`, `nullable` — correto.
- `notes`: `string`, `max(2000)`, `optional`, `nullable` — limite de tamanho definido.
- `PositionUpdateSchema` inclui validação de UUID para o parâmetro `id` — correto.

### npm audit
- **2 vulnerabilidades moderadas** — ambas na dependência transitiva `postcss` interna do Next.js (ver B-01).
- **0 vulnerabilidades críticas ou altas.**
- Bibliotecas de segurança crítica sem vulnerabilidades conhecidas: `@anthropic-ai/sdk@0.55.1`, `@supabase/ssr@0.6.1`, `@supabase/supabase-js@2.106.0`, `zod@3.25.76`.

### Pacotes com histórico de incidentes
- `yahoo-finance2@3.14.1` — sem CVEs conhecidos activos.
- `recharts@2.15.3` — sem CVEs conhecidos activos.
- `@anthropic-ai/sdk@0.55.1` — sem CVEs conhecidos activos.

---

## Conclusão

A feature de dark mode visual fix é **segura para merge**. As alterações são puramente visuais (CSS custom properties, classes Tailwind, estilos inline) e não introduzem novos vectores de ataque. O achado M-01 (email hardcoded) é uma limitação de design pré-existente na arquitectura da aplicação pessoal, não introduzida por esta feature. O achado B-01 (postcss) é uma vulnerabilidade de build-time numa dependência transitiva do framework, sem acção viável imediata.

**Veredito: SEGURO COM RESSALVAS**
