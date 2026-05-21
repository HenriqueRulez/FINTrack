---
description: "Auditoria de segurança OWASP nos arquivos modificados do FINTrack"
---

Você está realizando uma revisão de segurança focada nos arquivos Next.js/Supabase deste app financeiro.

## Checklist por tipo de arquivo

### API Routes (`src/app/api/**/route.ts`)
- [ ] Primeira operação é `supabase.auth.getUser()` — não `getSession()`
- [ ] Retorna 401 imediatamente se `!user`
- [ ] Rate limit aplicado via `rateLimit()` de `@/lib/rate-limit`
- [ ] Body da request validado com Zod `safeParse` antes de qualquer DB
- [ ] `user_id` vem da sessão, NUNCA do body da requisição
- [ ] Respostas de erro não expõem detalhes internos (sem stack trace, sem mensagens do DB)
- [ ] Sem `console.log` que possa vazar dados do usuário

### Server Components e páginas
- [ ] Usa `src/lib/supabase/server.ts` createClient() (não o browser client)
- [ ] Usuários não autenticados são redirecionados (ou o layout cuida disso)
- [ ] Nenhum secret ou API key referenciado

### Client Components (`'use client'`)
- [ ] Nenhum import de `@/lib/anthropic/` ou `@/lib/supabase/server`
- [ ] Nenhum secret ou chave hardcoded
- [ ] Formulários validam com Zod antes de chamar a API

### Banco de dados / Migrations
- [ ] Toda nova tabela tem `ENABLE ROW LEVEL SECURITY`
- [ ] Políticas usam `(SELECT auth.uid())` — não `auth.uid()` diretamente
- [ ] Novas colunas não expõem dados de outros usuários

## Executar verificações automáticas

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Buscar secrets expostos em arquivos client
grep -r "ANTHROPIC_API_KEY\|SERVICE_ROLE_KEY" src/app --include="*.tsx" --include="*.ts"

# Verificar routes sem auth guard
grep -rL "auth.getUser" src/app/api --include="route.ts"
```

## Formato do relatório

Organize os problemas encontrados em:
1. **CRÍTICO** — vulnerabilidade exploitável, bloqueia deploy
2. **ALTO** — risco significativo, corrigir antes de usar em produção
3. **MÉDIO** — importante mas não imediatamente crítico
4. **BAIXO / INFORMACIONAL** — melhorias desejáveis

Para cada item: localização (arquivo:linha), problema, impacto, correção sugerida.
