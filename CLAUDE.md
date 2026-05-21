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

## Skills e Subagentes Disponíveis

### Skills (slash commands)
- `/build-feature` — pipeline completo PO → SM → Engineer → QA com retry automático
- `/review-security` — auditoria OWASP nos arquivos modificados
- `/add-feature` — workflow guiado para adicionar features com segurança

### Subagentes
- `po` — Product Owner: define requisitos e working items (com confirmação interactiva)
- `sm` — Scrum Master: transforma working items em planos de tarefas ordenadas
- `engineer` — implementa código seguindo os padrões do projecto
- `qa` — verifica implementação contra critérios de aceite
- `security-reviewer` — auditor OWASP especializado
- `db-schema-designer` — designer de schema PostgreSQL + RLS para o Supabase

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
