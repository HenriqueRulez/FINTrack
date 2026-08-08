# TD-3: QA + Security em falta — logout-settings-page

## Descrição

A pipeline da feature logout-settings-page parou na Fase 1: existem design + frontend reports mas nunca correram SM, Engineer, QA nem Security. O código real está implementado e ligado (`src/components/settings/logout-button.tsx` chama `supabase.auth.signOut()`, sem TODOs pendentes) — funciona, mas nunca foi verificado por QA nem auditado.

## Acceptance Criteria

- [ ] QA verifica os CAs do working item (`.issues/details/` — working item legado está no histórico git de `.claude/working-items/logout-settings-page.md`)
- [ ] Security Review corrido sobre `logout-button.tsx` e `settings/page.tsx`
- [ ] Logout confirmado: sessão termina e rotas protegidas redireccionam para /passphrase

## Notas técnicas

- Provável caminho: `/verify-feature logout-settings-page` (adaptando a origem do working item, que é pré-migração `.issues/`)
