# Bugs conhecidos

> Bugs (BUG-). Regras e colunas: `linear/docs/trabalhando-com-linear.md`.

| ID  | Título | Prioridade | Estado | Área/Ficheiro | Linear ID |
| --- | ------ | ---------- | ------ | ------------- | --------- |
| BUG-1 | Email owner@fintrack.local hardcoded no bundle do browser (achado M-01) | Média | Resolvido | src/app/(auth)/passphrase/page.tsx:21 | FIN-8 |
| BUG-2 | Verificação visual pendente — fix-bug-1-email-hardcoded: CAs não verificados via Chrome Extension [CA1, CA2, CA3, CA4]; resolver com /verify-feature fix-bug-1-email-hardcoded com Chrome Extension activa | Média | Aberto | auth | - |
| BUG-3 | Verificação visual pendente — logout-settings-page: CAs não verificados por Chrome Extension [CA1, CA3, CA4]; resolver com /verify-feature logout-settings-page com Chrome Extension activa | Média | Aberto | settings | - |
| BUG-4 | logout-button.tsx usa signOut() com scope=global (default), que revoga a sessão partilhada de auth.setup.ts quando o spec de logout corre antes de outros specs @authed na mesma invocação Playwright — falso-negativo em smoke.spec.ts; separar sessão do teste de logout ou reordenar specs | Baixa | Aberto | tests/e2e | - |
| BUG-5 | logout-button.tsx:26 — aria-label="Terminar sessão" estático não reflecte o estado isPending; o nome acessível para leitores de ecrã não muda para "A terminar sessão…" durante o logout (texto visível muda, nome acessível não) | Baixa | Aberto | src/components/settings/logout-button.tsx:26 | - |
| BUG-6 | getHistory() usa yahooFinance.historical() deprecado (removido no yahoo-finance2 v3) — cai no catch e devolve [] sempre; histórico 30d do dashboard e movers vazios; migrar para chart() como getHistoryRange | Média | Resolvido | src/lib/yahoo-finance/client.ts:259 | FIN-14 |
| BUG-7 | Verificação visual pendente — fix-bug-6-gethistory-chart: Chrome Extension desconectada (TD-10, browser extension not connected), CAs de UI (gráfico "Portfolio over time" e movers no dashboard) não confirmados visualmente; resolver com /verify-feature fix-bug-6-gethistory-chart com Chrome Extension activa | Média | Aberto | src/lib/yahoo-finance/client.ts | - |
| BUG-8 | dashboard-visual-redesign.spec.ts:59 — teste "itens placeholder têm href='#' e estilo visual distinto" falha: `aside [aria-disabled="true"]` filtrado por texto "Holdings" não encontrado na sidebar (regressão de label/estrutura não relacionada com BUG-6) | Baixa | Aberto | tests/e2e/dashboard-visual-redesign.spec.ts:59 | - |
| BUG-9 | dashboard-visual-redesign.spec.ts:140 — teste "pelo menos 4 cards de métricas são visíveis" falha: texto "Cash reserve" não encontrado nos KPIs do dashboard (regressão de label não relacionada com BUG-6) | Baixa | Aberto | tests/e2e/dashboard-visual-redesign.spec.ts:140 | - |
