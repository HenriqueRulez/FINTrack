# Relatório de Implementação — FIN-7 / TD-6: Higiene de tipos Supabase

**Plano:** N/A (sem ficheiro em `.claude/tasks/`; instruções directas do orquestrador)
**Working Item:** `.issues/details/TD-6-regenerar-database-types.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings/erros
**Migration:** N/A (não houve migration)

## Resumo executivo

AC1 (regenerar `database.ts` com marcador `__InternalSupabase`) foi feito pelo orquestrador. AC2 (remover os 4 casts `(supabase as any)`) **NÃO é alcançável** como especificado: a inferência continua a colapsar para `never` mesmo com o marcador presente. A causa raiz não é o `database.ts` — é uma **incompatibilidade de versões entre `@supabase/ssr@0.6.1` e `@supabase/supabase-js@2.112.1`**. Provei-o com um teste de tipos isolado. Removi o que era genuinamente removível (1 cast de leitura), mantive os 4 casts de escrita com comentário a apontar a causa raiz real, e actualizei o SECURITY_FINDINGS.md com o estado factual (que diverge do que o AC assumia).

## Causa raiz (provada, não especulada)

`@supabase/ssr@0.6.1` tipa o client via:

```
createServerClient<Database>(...) : SupabaseClient<Database, SchemaName, Schema>
```

ordem posicional de genéricos **antiga** (3 slots). Mas `@supabase/supabase-js@2.112.1` mudou a assinatura de `SupabaseClient` para 5 slots:

```
SupabaseClient<Database, SchemaNameOrClientOptions, SchemaName, Schema, ClientOptions>
```

Ao passar `<Database, SchemaName, Schema>`, o 3.º slot (`SchemaName`, que TEM de ser `string & keyof Database`) recebe o **objecto** `Schema` (`{Tables, Views, ...}`). A constraint quebra, `Omit<Database>[SchemaName]` = `never`, e `Schema` colapsa para `never`. Resultado: `.from(...).insert(...)` só aceita `never`, e `.select()` devolve `never[]`. O marcador `__InternalSupabase` está correcto no `database.ts` mas **nunca chega à inferência** porque o tipo do client, vindo do `ssr`, já é `never` antes disso.

### Evidência (teste de tipos isolado, corrido dentro do projecto e depois removido)

- Client via `@supabase/supabase-js` `createClient<Database>` → `price_cache.insert({...})` **infere correctamente, zero erros**.
- Client via `@supabase/ssr` `createServerClient<Database>` → mesmo insert dá `TS2353: 'ticker' does not exist in type 'never[]'`.

Mesma `Database`, mesmo payload; só muda a fonte do client. Isto isola a causa no `ssr`, não no `database.ts`.

## Casts do AC — estado real

| Local (AC) | Tipo | Acção |
|---|---|---|
| `api/transactions/import/route.ts:201` | `(supabase as any)` insert | **Mantido** — write, bloqueado pela incompat. ssr×supabase-js. Comentário corrigido para apontar a causa raiz real. |
| `api/transactions/route.ts:160` | `(supabase as any)` insert | **Mantido** — idem. |
| `api/transactions/[id]/route.ts:186` | `(supabase as any)` update | **Mantido** — idem. |
| `lib/portfolio/prices.ts:106` | `(supabase as any)` upsert | **Mantido** — idem. |
| `lib/portfolio/prices.ts:51-53` | `(data ?? []) as Array<...>` read (B-15) | **Removido** — convertido em anotação de tipo `const rows: Array<...> = data ?? []` (o read infere `never[]`, atribuível ao tipo alvo). Mesmo padrão que os reads de `api/portfolio/*`. |

Não usei `as unknown as` nem `@ts-ignore` em lado nenhum. Os 4 writes não podem usar o truque da anotação: um objecto não é atribuível a `never` (ao contrário de `never[]`, que é atribuível a qualquer array). A única forma de os remover seria actualizar o `@supabase/ssr` (mudança de dependência, fora de escopo e sujeita a consentimento) ou um `as unknown as SupabaseClient<Database>` no boundary — explicitamente proibido pelo orquestrador.

`src/lib/yahoo-finance/client.ts:75` não foi tocado (fora de escopo, como instruído).

## Ficheiros Modificados

- `src/lib/portfolio/prices.ts` — cast de leitura (linha 51-53) convertido em anotação de tipo; comentário do cast de write (linha 106) corrigido para a causa raiz real.
- `src/app/api/transactions/import/route.ts` — comentário do cast corrigido (o cast mantém-se).
- `src/app/api/transactions/route.ts` — comentário do cast corrigido (mantém-se).
- `src/app/api/transactions/[id]/route.ts` — comentário do cast corrigido (mantém-se).
- `SECURITY_FINDINGS.md` — ver secção abaixo.

Os comentários antigos atribuíam o cast a "`database.ts` mantido à mão" — agora factualmente errado (o `database.ts` foi regenerado). Corrigi-os para a causa raiz verdadeira.

## Ficheiros Criados

Nenhum.

## Tarefas Implementadas

- [x] AC2 (parcial) — removido 1 cast de leitura (`prices.ts:51-53`); 4 casts de write documentados com a causa raiz real e mantidos por bloqueio genuíno.
- [x] AC3 — typecheck limpo, lint limpo, SECURITY_FINDINGS.md actualizado com o estado factual.

## SECURITY_FINDINGS.md — estado de B-13/B-15/B-18

O AC pedia marcar os três como Resolvidos. O estado factual diverge:

- **B-13 → Resolvido.** Os double-casts `(data ?? []) as unknown as TransactionRow[]` **já não existem** no código actual: os 6 locais (`dashboard/page.tsx`, `api/portfolio/{holdings,summary,movers,chart,performance}`) usam a anotação `const rows: TransactionRow[] = data ?? []`. Foi um refactor anterior, não FIN-7; FIN-7 confirmou a ausência e alinhou o padrão. Movido para Resolvidos (2026-08-08).
- **B-15 → Aberto (parcialmente resolvido).** O cast de leitura foi removido por FIN-7; o cast de write (`prices.ts:106`) **permanece** por bloqueio da incompat. ssr×supabase-js. Nota actualizada com a causa raiz real. **Não** marcado Resolvido — seria um falso positivo.
- **B-18 → Aberto.** O `(supabase as any)` do insert de import **permanece** (mesma causa raiz). Nota actualizada. Registei também que existem dois casts de write da mesma família **não rastreados por finding próprio**: `api/transactions/route.ts:160` e `api/transactions/[id]/route.ts:186`.

Contadores do resumo actualizados: Baixo Abertos 11→10, Resolvidos 7→8; Total Abertos 11→10, Resolvidos 10→11.

## Notas para o QA

- Nenhuma mudança de comportamento em runtime. As alterações são só de tipos/comentários. O `(data ?? []) as ...` → `const rows: ... = data ?? []` em `prices.ts` produz o mesmo valor em runtime (o cache de preços continua a funcionar igual).
- O bloqueio de AC2 é uma dívida de dependência, não de código. Fecho real dos casts de write exige actualizar `@supabase/ssr` para uma versão que forwarde os genéricos na nova ordem do `supabase-js@2.112.1` — decisão de instalação que precisa de consentimento (política de npm installs).
