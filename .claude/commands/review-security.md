---
description: "Auditoria de segurança OWASP nos arquivos modificados do FINTrack"
---

Você está realizando uma revisão de segurança focada nos arquivos Next.js/Supabase deste app financeiro.

> **Determinístico é do CI, não daqui.** `typecheck`, `lint` e `npm audit` correm no
> `.github/workflows/ci.yml` a cada push. **Não os reexecute** — leia o resultado do último
> run do CI e registe-o. Esta revisão foca-se apenas no que exige análise humana (checklist
> OWASP + os greps abaixo).

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
- [ ] Nenhum import de `@/lib/yahoo-finance/` ou `@/lib/supabase/server`
- [ ] Nenhum secret ou chave hardcoded
- [ ] Formulários validam com Zod antes de chamar a API

### Banco de dados / Migrations
- [ ] Toda nova tabela tem `ENABLE ROW LEVEL SECURITY`
- [ ] Políticas usam `(SELECT auth.uid())` — não `auth.uid()` diretamente
- [ ] Novas colunas não expõem dados de outros usuários

## Verificações automáticas (só as que exigem análise, não o gate do CI)

```bash
# Secrets expostos em arquivos client
grep -r "SERVICE_ROLE_KEY" src/app --include="*.tsx" --include="*.ts"

# Routes sem auth guard
grep -rL "auth.getUser" src/app/api --include="route.ts"

# Routes sem rate limit
grep -rL "rateLimit" src/app/api --include="route.ts"
```

Para o `npm audit`, leia o job **"Security audit"** do último run do CI (não o execute localmente):

```bash
GH="/c/Program Files/GitHub CLI/gh.exe"
"$GH" run list --workflow=ci.yml --limit 1
```

## Registo obrigatório

Actualize `SECURITY_FINDINGS.md`: adicione novos achados com IDs sequenciais, marque como
**Resolvido** os que esta mudança corrigiu (com data), e nunca duplique achados existentes.

## Formato do relatório

Organize os problemas encontrados em:
1. **CRÍTICO** — vulnerabilidade exploitável, bloqueia deploy
2. **ALTO** — risco significativo, corrigir antes de usar em produção
3. **MÉDIO** — importante mas não imediatamente crítico
4. **BAIXO / INFORMACIONAL** — melhorias desejáveis

Para cada item: localização (arquivo:linha), problema, impacto, correção sugerida.
