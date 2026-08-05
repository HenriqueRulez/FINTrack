# FINTrack — Migração para Supabase Cloud

> **Objetivo:** substituir o Supabase local (Docker) pelo Supabase Cloud (hosted), mantendo o mesmo código, schema e modelo de segurança (PostgreSQL + RLS + GoTrue Auth). **Zero mudanças de código** — só env vars e configuração no dashboard.
>
> **Pré-requisito já cumprido neste branch:** o sandbox fable5 foi totalmente removido (rotas sem auth + tabelas com RLS aberto — C-02 da auditoria), o seed do owner com passphrase `fintrack` saiu das migrations (parte do C-01) e o seed de transações mock saiu da 0009 (parte do F-04). As migrations restantes (0001, 0002, 0005, 0007, 0008, 0009) são seguras para um banco exposto na internet.

---

## Passo 1 — Criar o projeto no Supabase

1. Cria conta/entra em [supabase.com](https://supabase.com) → **New project**.
2. **Região:** escolhe a mais próxima de ti (menor latência — ex.: `eu-west` se estás na Europa, `sa-east-1` se no Brasil).
3. **Database password:** gera uma forte e guarda no teu gestor de passwords (é a password do Postgres, não a passphrase do app).
4. Plano **Free** chega para o app pessoal (500 MB). Aviso: no free tier o projeto **pausa após ~1 semana sem uso** e tens de o despausar no dashboard. O plano Pro remove isso.

## Passo 2 — Aplicar as migrations (sem Docker)

O `supabase db push` para um projeto **linked** fala direto com o banco cloud — não precisa do Docker local.

```bash
npx supabase login                          # abre o browser para autenticar o CLI
npx supabase link --project-ref <ref>       # <ref> está em Settings → General → Project ID
npx supabase db push                        # aplica supabase/migrations/ no cloud
```

Verifica no Dashboard → **Table Editor**: devem existir `profiles`, `transactions`, `portfolio_positions`, `ai_insights` — e **nenhuma** tabela `f5_*`.

## Passo 3 — Criar o utilizador owner (substitui as antigas migrations 0004/0006)

No cloud, o owner é criado pelo GoTrue gerido — nunca por INSERT manual em `auth.users` (frágil e inseguro; era como a migration 0004 fazia, com a passphrase default `fintrack`).

1. Dashboard → **Authentication → Users → Add user → Create new user**.
2. Email: `owner@fintrack.local` (tem de ser exatamente este — está hardcoded em `src/app/(auth)/passphrase/page.tsx:21`).
3. Password: **a tua passphrase — forte, ≥ 12 caracteres, única**. É ela que digitas no ecrã de passphrase do app.
4. Marca **Auto Confirm User**.

O trigger `on_auth_user_created` (migration 0001) cria a linha em `profiles` automaticamente.

> Para trocar a passphrase mais tarde (enquanto o app não tiver UI para isso — achado C-01): Dashboard → Authentication → Users → owner → **Reset password**.

## Passo 4 — Configuração de segurança do Auth (OBRIGATÓRIO)

O Supabase Cloud vem com **signups públicos ligados por default**. Num app single-user isso significa que qualquer pessoa pode criar conta. Corrige antes de usar:

1. **Authentication → Sign In / Providers → Email**: desliga **"Allow new users to sign up"**.
2. Confirma que nenhum outro provider (Google, GitHub…) está ativo.
3. **Authentication → Rate Limits**: baixa o limite de sign-in (ex.: 10/h por IP) — mitiga brute-force da passphrase, que é possível direto no endpoint do GoTrue porque a anon key é pública.
4. (Se fores expor o app na internet) **Authentication → Attack Protection**: ativa captcha.

## Passo 5 — Apontar o app para o cloud

Cria/edita `.env.local` (valores em Dashboard → **Settings → API**):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server-only; o código atual não a usa, mas mantém-na SEM prefixo NEXT_PUBLIC_
ANTHROPIC_API_KEY=<a tua key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Se fizeres deploy (Vercel etc.), define as mesmas variáveis lá. A CSP em `src/proxy.ts` usa `NEXT_PUBLIC_SUPABASE_URL` no `connect-src`, portanto passa a permitir o domínio cloud automaticamente.

## Passo 6 — Regenerar os tipos TypeScript

O comando do CLAUDE.md usava `--local` (Docker). Contra o cloud é:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

Isto também remove a razão dos casts `(supabase as any)` nas rotas (achado M-02 — limpar depois).

## Passo 7 — Verificar

```bash
npm run dev
```

1. `/passphrase` → entra com a passphrase nova → redireciona para `/dashboard`.
2. Dashboard carrega vazio (patrimônio 0) — **correto**: o banco nasce limpo, sem seeds mock.
3. Numa janela anónima, `curl https://<ref>.supabase.co/rest/v1/transactions -H "apikey: <anon key>"` deve devolver `[]` — RLS a bloquear leitura sem sessão.
4. `npm run typecheck && npm run lint` — zero erros.

## Dados antigos (banco Docker local)

As posições e transações no banco local eram **seeds mock** (migration 0009 antiga) — não vale a pena migrá-los; o correto é começar limpo e registar as posições reais. Se ainda assim tiveres dados reais presos no volume Docker e o container voltar a arrancar um dia:

```bash
npx supabase db dump --local --data-only -f dump.sql   # exporta só os dados
# depois filtra as tabelas que interessam e aplica no cloud via SQL Editor
```

---

## O que mudou neste repositório para esta migração

| Mudança | Motivo |
|---|---|
| Removidos `src/app/projeto-fable-5/`, `src/app/api/fable5/`, `src/components/fable5/`, `src/lib/fable5/`, `src/lib/validations/fable5.ts`, `tests/fable5/`, `playwright.fable5.config.ts` | C-02: rotas de escrita sem auth num deploy público |
| Removidas migrations `0010`/`0011` (tabelas `f5_*`) | C-02: RLS `USING (true)` para `anon` — escrita pública num banco online |
| Removidas migrations `0004`/`0006` (seed do owner via SQL) | C-01: passphrase default `fintrack`; no cloud o owner é criado pelo Dashboard (Passo 3) |
| Removida migration `0003` (seed de categorias) | Peso morto: as tabelas que semeava são dropadas pela 0009 |
| Migration `0009`: removido o seed de 13 transações mock | F-04: dados fictícios não entram no banco de produção |
| Motor de ledger preservado em `src/lib/portfolio/ledger.ts` + testes em `tests/unit/ledger.spec.ts` (`npx playwright test -c playwright.unit.config.ts`) | Base para F-03 (derivar holdings/performance do ledger) — ainda não ligado às rotas |
| `.env.example` atualizado para URLs do cloud | — |

> **Nota:** o `CLAUDE.md` ainda contém as secções "Instruções para Fable 5" e "Fase 2 — /projeto-fable-5", agora obsoletas, e o comando de gen types com `--local`. Atualizar quando fizer sentido.
