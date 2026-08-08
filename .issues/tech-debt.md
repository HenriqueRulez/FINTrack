# Tech debt

> Dívida técnica (TD-). Regras e colunas: `linear/docs/trabalhando-com-linear.md`.

| ID  | Título | Prioridade | Estado | Impacto | Esforço | Linear ID |
| --- | ------ | ---------- | ------ | ------- | ------- | --------- |
| TD-1 | Reconciliar suite E2E legada (G-05) — specs mutuamente destrutivos | Média | Aberto | ~11 specs só correm localmente, fora do CI | Alto — exige banco de teste | FIN-2 |
| TD-2 | Security Review em falta — transactions-redesign | Alta | Concluído | Feature entregue sem o gate obrigatório de segurança | Baixo — correr o agente | FIN-3 |
| TD-3 | QA + Security em falta — logout-settings-page (pipeline parou na Fase 1) | Média | Concluído | Logout implementado e funcional mas nunca verificado/auditado | Baixo — correr /verify-feature | FIN-4 |
| TD-4 | Branch protection em main (A1) — required check "Deterministic gate" | Alta | Concluído | Sem ela o CI é informativo: vermelho não bloqueia merge | Mínimo — acção manual do utilizador no GitHub | FIN-5 |
| TD-5 | Preencher auditoria de tokens (D2) no fim da próxima feature | Baixa | Aberto | Sem medição real, a próxima optimização de tokens é palpite | Mínimo — preencher tabela no TODO.md | FIN-6 |
| TD-6 | Regenerar database.ts via supabase gen types --linked | Média | Concluído | database.ts regenerado (marcador __InternalSupabase); B-13 resolvido + 1 cast de leitura removido. B-15/B-18 (casts de write) migram para TD-7 — bloqueados por incompat. @supabase/ssr | Baixo — comando + typecheck | FIN-7 |
| TD-7 | Atualizar @supabase/ssr 0.6.1→0.12.4 para fechar B-15/B-18 (casts de write) | Média | Aberto | 4 casts (supabase as any) em writes permanecem; @supabase/ssr@0.6.1 usa ordem de genéricos antiga → Schema colapsa para never no createServerClient | Médio — bump de 6 minors mexe na API de cookies de auth; exige QA/security | FIN-9 |
