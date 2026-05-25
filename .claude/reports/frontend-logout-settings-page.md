# Relatório Frontend — Logout na Página de Configurações

**Especificação Visual:** `.claude/reports/design-logout-settings-page.md`
**Working Item:** `.claude/working-items/logout-settings-page.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero erros

## Ficheiros Criados
- `src/components/settings/logout-button.tsx` — Client Component com botão destrutivo de logout: estado idle ("Terminar sessão") e estado pending ("A terminar sessão…" + disabled + aria-busy)

## Ficheiros Modificados
- `src/app/(dashboard)/settings/page.tsx` — Adicionado segundo card "Sessão" abaixo do card de perfil, separado por `mt-4`, contendo label de secção, texto de suporte e `<LogoutButton />`

## Componentes Implementados
- **LogoutButton:** Botão `variant="destructive"` com ícone `LogOut` (lucide-react) à esquerda. Usa `useState<boolean>` para `isPending`: ao clicar, desactiva o botão, muda o label para "A terminar sessão…" e executa `supabase.auth.signOut()` → `router.push("/login")` → `router.refresh()`. Padrão idêntico ao da Navbar existente. Acessibilidade: `aria-label="Terminar sessão"` e `aria-busy={isPending}`.

## Notas para o SM e Engineer

- **Lógica de logout já implementada** no componente — usa o padrão existente da Navbar (`createClient()` + `signOut()` + `router.push`). Não são necessárias API routes adicionais.
- **Sem TODOs pendentes de ligação a API** — o logout é client-side via Supabase Auth SDK, não requer endpoint de servidor.
- **CA2 depende do middleware existente** (`proxy.ts`) para bloquear acesso a rotas protegidas após logout — não foi alterado, confirmar que está a funcionar correctamente em QA.
- A `SettingsPage` permanece Server Component; apenas o `LogoutButton` é Client Component, importado correctamente.
