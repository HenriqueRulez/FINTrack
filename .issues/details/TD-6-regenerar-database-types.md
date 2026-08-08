# TD-6: Regenerar database.ts via Supabase CLI (--linked)

## Descrição

`src/types/database.ts` é mantido à mão e não tem o marcador `__InternalSupabase` da inferência do postgrest-js v2. Consequência: double-casts `as unknown as` e `(supabase as any)` espalhados (achados B-13, B-15, B-18 do SECURITY_FINDINGS.md) que contornam a inferência de tipos e podem mascarar drift de schema em compile time. Não é bypass de segurança (RLS activo em todas as tabelas), é higiene de tipos.

## Acceptance Criteria

- [ ] `npx supabase gen types typescript --linked` gera o `database.ts` a partir do schema Cloud real
- [ ] Casts `as unknown as`/`(supabase as any)` removidos dos 8 locais identificados (dashboard/page.tsx, api/portfolio/*, lib/portfolio/prices.ts, api/transactions/import)
- [ ] `npm run typecheck` limpo; B-13/B-15/B-18 marcados Resolvidos no SECURITY_FINDINGS.md

## Notas técnicas

- Verificar diff do gerado vs manual antes de substituir — o manual pode ter divergido do schema real
