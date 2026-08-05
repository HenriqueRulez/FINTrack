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

> **Importante:** este passo tem de correr a partir do commit de limpeza (`76dbf33` ou posterior, do branch `claude/security-audit-finance-1i4vns`). Se correres a partir de um checkout antigo, as migrations `0010`/`0011` do sandbox ainda existem e o teu banco cloud fica com o schema ERRADO (tabelas `f5_assets`, `f5_price_cache`, `f5_settings`, `f5_transactions` em vez das reais). Ver **Troubleshooting** no fim.

**2a. Garante que estás no código limpo:**

```bash
git fetch origin
git checkout claude/security-audit-finance-1i4vns
git pull
ls supabase/migrations/   # deve mostrar SÓ: 0001 0002 0005 0007 0008 0009 — nenhum 0010/0011
```

**2b. Liga o CLI ao projeto cloud** (`db push`/`db reset --linked` falam direto com o banco — não precisam de Docker):

```bash
npx supabase login                          # abre o browser para autenticar o CLI
npx supabase link --project-ref <ref>       # <ref> está em Settings → General → Project ID
```

**2c. Confirma o estado do histórico de migrations no remote:**

```bash
npx supabase migration list --linked
```

- Se a coluna **Remote** estiver vazia (projeto novo, nunca migrado) → aplica com `npx supabase db push`.
- Se o remote já tiver migrations aplicadas (0010/0011, ou desalinhadas com a coluna Local) → **não uses `db push`** (ele não apaga tabelas a mais). Faz um reset limpo, que dropa tudo e reaplica só as migrations atuais:

```bash
npx supabase db reset --linked
```

> ⚠️ `db reset --linked` **apaga todos os dados e utilizadores** do banco cloud e reaplica as migrations do zero. Num projeto pessoal ainda vazio é exatamente o que queres. Se já criaste o owner (Passo 3), terás de o recriar depois do reset.

**2d. Verifica** no Dashboard → **Table Editor**: devem existir **exatamente** `profiles`, `transactions`, `portfolio_positions`, `ai_insights` — e **nenhuma** tabela `assets`, `price_cache`, `settings` ou `f5_*`. Abre `transactions` e confirma que tem a coluna **`user_id`** (a tabela certa) e não `fx_to_eur`/`notes` (essa era a do sandbox).

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

## Troubleshooting

### Sintoma: no cloud aparecem `transactions`, `assets`, `price_cache`, `settings` (e faltam `profiles`/`portfolio_positions`/`ai_insights`)

Essas são as tabelas do **sandbox fable5** (`f5_assets`, `f5_price_cache`, `f5_settings`, `f5_transactions`) — não da app principal. Aconteceu uma de duas coisas:

1. O `db push` correu a partir de um checkout **anterior** ao commit de limpeza `76dbf33` (as migrations `0010`/`0011` ainda existiam), ou
2. O projeto cloud é o mesmo usado no desenvolvimento do sandbox e já tinha essas tabelas — e o `db push` não as remove.

**Como confirmar:** abre a tabela `transactions` no Table Editor. Se tiver `fx_to_eur`/`notes` e **não** tiver `user_id`, é a `f5_transactions` do sandbox.

**Correção (banco pessoal, sem dados reais):**

```bash
git checkout claude/security-audit-finance-1i4vns && git pull   # código limpo
ls supabase/migrations/                                          # confirmar: sem 0010/0011
npx supabase link --project-ref <ref>
npx supabase db reset --linked                                  # dropa tudo e reaplica limpo
```

Depois volta ao **Passo 2d** para verificar as tabelas e ao **Passo 3** para (re)criar o owner. Se preferires não apagar o banco todo, em alternativa dropa só as tabelas a mais no **SQL Editor** e depois `npx supabase migration repair` para alinhar o histórico — mas o reset é mais simples e garantido.

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
