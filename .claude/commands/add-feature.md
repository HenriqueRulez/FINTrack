---
description: "Workflow guiado para adicionar uma nova feature ao FINTrack com segurança"
---

Você está ajudando a adicionar uma nova feature ao FINTrack. Siga esta sequência e aguarde confirmação a cada passo.

## Passo 1: Entender os requisitos

Pergunte ao usuário:
1. Qual é o nome e propósito da feature para o usuário final?
2. Ela requer novas tabelas ou colunas no banco?
3. É apenas leitura ou também muta dados?
4. Precisa de integração com IA (Claude) ou Yahoo Finance?

## Passo 2: Schema do banco (se necessário)

Design seguindo o padrão existente em `supabase/migrations/`:
- Colunas obrigatórias: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `created_at TIMESTAMPTZ DEFAULT NOW()`
- Usar `NUMERIC(15,2)` para valores monetários — nunca FLOAT
- Escrever as políticas RLS com `(SELECT auth.uid())`
- Criar arquivo: `supabase/migrations/XXXX_nome_da_feature.sql`

## Passo 3: Schema Zod

Criar `src/lib/validations/nome-feature.ts`:
- Exportar o schema de input e o tipo TypeScript
- As restrições do Zod devem espelhar as restrições do banco

## Passo 4: API Route

Criar `src/app/api/nome-feature/route.ts`:
- Seguir o padrão canônico: auth → rate limit → Zod → DB
- Nunca confiar em `user_id` do body
- Ver `CLAUDE.md` para o template completo

## Passo 5: Componentes

- Server Component para fetching (se os dados são necessários no render)
- Client Components para formulários e interatividade
- Colocar em `src/components/nome-feature/`

## Passo 6: Página de rota

- Adicionar `src/app/(dashboard)/nome-feature/page.tsx`
- Adicionar link na sidebar em `src/components/layout/sidebar.tsx`

## Passo 7: Revisão de segurança

Executar `/review-security` nos novos arquivos antes de considerar completo.

Apresente cada passo ao usuário e aguarde confirmação antes de prosseguir.
