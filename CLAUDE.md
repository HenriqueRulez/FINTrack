# FINTrack — Contexto do Projeto

## O que é este projeto
App web pessoal de acompanhamento de portfólio de investimentos: portfólio de stocks/ETFs com preços automáticos, visão geral do patrimônio e configurações. App de uso pessoal — sem login tradicional, protegido por passphrase simples.

## Stack
- **Framework**: Next.js 15, App Router, TypeScript strict, React 19
- **Banco**: Supabase local (PostgreSQL + Row Level Security + Auth)
- **Estilo**: TailwindCSS v4 + shadcn/ui (componentes em `src/components/ui/`)
- **Validação**: Zod — schemas em `src/lib/validations/`
- **AI**: Anthropic SDK (`claude-sonnet-4-6`) — server-only em `src/lib/anthropic/`
- **Preços**: yahoo-finance2 — server-only em `src/lib/yahoo-finance/`
- **Charts**: Recharts

## Regras de Segurança — Obrigatórias

### Em todo API route (`src/app/api/**/route.ts`)
1. Primeira operação SEMPRE: `supabase.auth.getUser()` — NUNCA `getSession()`
2. Retornar 401 imediatamente se não houver usuário
3. Aplicar rate limit via `rateLimit()` de `@/lib/rate-limit`
4. Validar input com Zod `safeParse` antes de qualquer operação de banco
5. `user_id` vem SEMPRE da sessão autenticada, NUNCA do body da requisição

### Fronteira servidor/cliente
- `src/lib/supabase/server.ts` → Server Components, API Routes
- `src/lib/supabase/client.ts` → Client Components (`'use client'`) APENAS
- `src/lib/anthropic/` → server-only, NUNCA importar em Client Components
- `src/lib/yahoo-finance/` → server-only, NUNCA importar em Client Components

### Variáveis de ambiente
- `NEXT_PUBLIC_*` → vai para o bundle do browser (OK: URL e anon key do Supabase)
- Sem prefixo → server-only OBRIGATÓRIO (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

## Comandos Comuns

```bash
# Desenvolvimento
npm run dev

# Type check (zero erros exigido)
npm run typecheck

# Lint
npm run lint

# Após escrever nova migration SQL:
npx supabase db push

# Gerar tipos TypeScript do schema atual:
npx supabase gen types typescript --local > src/types/database.ts
```

## Estrutura de Pastas Importante

```
src/
├── app/
│   ├── (auth)/          # Páginas públicas: passphrase
│   ├── (dashboard)/     # Páginas protegidas: dashboard, portfólio, configurações
│   └── api/             # API Routes — toda lógica de negócio aqui
├── components/
│   ├── ui/              # shadcn/ui — NÃO editar manualmente
│   ├── layout/          # Sidebar, Navbar
│   └── {feature}/       # Componentes por funcionalidade
├── lib/
│   ├── supabase/        # Clientes Supabase (server, client, middleware)
│   ├── anthropic/       # SDK Anthropic — server-only
│   ├── yahoo-finance/   # Yahoo Finance — server-only
│   ├── validations/     # Schemas Zod compartilhados
│   ├── rate-limit.ts    # Rate limiter em memória
│   ├── auth.ts          # requireUser(), getUser()
│   └── utils.ts         # cn(), formatCurrency(), formatDate()
├── types/
│   ├── database.ts      # Gerado pelo Supabase CLI — não editar
│   └── api.ts           # Tipos de resposta da API
└── proxy.ts             # Nonce CSP + proteção de rotas
```

## Pipeline de Desenvolvimento

```
PO → Designer → frontend-design skill → SM → Engineer → QA → Security Review
```

- **Toda feature passa por esse pipeline completo** — sem exceções, incluindo as que eram "Simple Tasks"
- **Security Review é gate obrigatório**: inclui auditoria OWASP + `npm audit` + verificação de pacotes suspeitos
- **Security Reviewer deve actualizar `SECURITY_FINDINGS.md`** a cada ciclo: adicionar novos achados, marcar resolvidos, não duplicar
## Pipeline de Agentes — Ordem Obrigatória

```
PO → Designer → Frontend → SM → Engineer → QA → Security Review
```

| Passo | Agente | Responsabilidade | Output |
|-------|--------|-----------------|--------|
| 1 | `po` | Define requisitos e critérios de aceite | `.claude/working-items/*.md` |
| 2 | `designer` | Especifica visualmente usando DESIGN.md | `.claude/reports/design-*.md` |
| 3 | `frontend` | Implementa UI (componentes, estilos, estados) | `.claude/reports/frontend-*.md` |
| 4 | `sm` | Planeia tarefas de lógica/API para o Engineer | `.claude/tasks/*.md` |
| 5 | `engineer` | Implementa API routes, DB, wiring UI↔API | `.claude/reports/*.md` |
| 6 | `qa` | Escreve testes Playwright por CA + executa todos | `.claude/reports/qa-*.md` |
| 7 | `security-reviewer` | Audita OWASP + npm audit + actualiza SECURITY_FINDINGS.md | `.claude/reports/security-*.md` |

**Regra:** Todo agente criado deve estar explicitamente posicionado nesta tabela. Nunca criar agentes fora da pipeline sem actualizar este documento.

**Loop de retry:** Engineer ↔ QA (máx. 3 ciclos). Security Review corre sempre após aprovação ou após 3 ciclos.

## Skills e Subagentes Disponíveis

### Skills (slash commands)
- `/build-feature` — pipeline completo PO → Designer → Frontend → SM → Engineer → QA → Security Review
- `/frontend-design` — plugin para UI de alta qualidade (uso manual ou pelo agente Frontend)
- `/review-security` — auditoria OWASP nos arquivos modificados + `npm audit`
- `/add-feature` — workflow guiado para adicionar features com segurança

### Subagentes
- `po` — Product Owner: define requisitos e working items (com confirmação interactiva)
- `designer` — UX/UI Designer: especifica layout, componentes e visual usando `DESIGN.md`
- `frontend` — Frontend Developer: implementa componentes visuais baseado na spec do Designer
- `sm` — Scrum Master: planeia tarefas de lógica/API para o Engineer (após o Frontend)
- `engineer` — implementa API routes, DB, lógica de negócio, wiring UI↔API
- `qa` — escreve testes Playwright por CA + executa todos os testes no browser real
- `security-reviewer` — auditor OWASP + npm audit + actualiza `SECURITY_FINDINGS.md`
- `db-schema-designer` — designer de schema PostgreSQL + RLS para o Supabase

## Design System

- **Documento de referência**: `DESIGN.md` na raiz — fonte única de verdade para identidade visual
- **Tema**: dark mode apenas — classe `dark` forçada no `<html>` em `layout.tsx`
- **Fonte**: IBM Plex Mono (todas as variantes — heading, body, mono)
- **Acento**: Teal (`oklch(0.72 0.17 185)`) — botões, links, ring, glow
- **Semântica financeira**: `--gain` (verde) / `--loss` (vermelho) para variações de valor
- **Efeitos neon**: classes `.neon-primary`, `.neon-gain`, `.neon-loss`, `.neon-border-primary`, `.neon-divider`, `.neon-dot`
- **Paleta editável**: variáveis oklch no bloco `.dark` de `globals.css` — hot reload imediato

## Pattern Canônico de API Route

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Auth — sempre primeiro
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const rl = rateLimit(`resource:write:${user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // 3. Validação Zod
  const body = await request.json().catch(() => null);
  const parsed = MySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // 4. DB — user_id sempre da sessão
  const { data, error } = await supabase
    .from("my_table")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Database error" }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
```

## Banco de Dados — Padrão RLS

Toda tabela de usuário usa:
```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
-- Usar (SELECT auth.uid()) não auth.uid() — cacheia por query, não por linha
CREATE POLICY "select_own" ON my_table FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "insert_own" ON my_table FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "update_own" ON my_table FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "delete_own" ON my_table FOR DELETE USING ((SELECT auth.uid()) = user_id);
```

## Adicionando shadcn/ui Components
```bash
npx shadcn@latest add button input card dialog table select badge
```
