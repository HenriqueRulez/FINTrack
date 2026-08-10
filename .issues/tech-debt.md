# Tech debt

> Dívida técnica (TD-). Regras e colunas: `linear/docs/trabalhando-com-linear.md`.

| ID  | Título | Prioridade | Estado | Impacto | Esforço | Linear ID |
| --- | ------ | ---------- | ------ | ------- | ------- | --------- |
| TD-1 | Reconciliar suite E2E legada (G-05) — specs mutuamente destrutivos | Média | Concluído | Isolamento por spec (AC1/AC2); AC3 = regressão local documentada. UI drift remanescente → TD-11 | Alto — exige banco de teste | FIN-2 |
| TD-11 | Realinhar specs E2E legados à UI actual (20 falhas de UI drift) | Baixa | Aberto | Suite @authed local não fica 100% verde por specs desalinhados com a UI | Médio — realinhar asserções + mitigar flakiness | FIN-13 |
| TD-2 | Security Review em falta — transactions-redesign | Alta | Concluído | Feature entregue sem o gate obrigatório de segurança | Baixo — correr o agente | FIN-3 |
| TD-3 | QA + Security em falta — logout-settings-page (pipeline parou na Fase 1) | Média | Concluído | Logout implementado e funcional mas nunca verificado/auditado | Baixo — correr /verify-feature | FIN-4 |
| TD-4 | Branch protection em main (A1) — required check "Deterministic gate" | Alta | Concluído | Sem ela o CI é informativo: vermelho não bloqueia merge | Mínimo — acção manual do utilizador no GitHub | FIN-5 |
| TD-5 | Preencher auditoria de tokens (D2) no fim da próxima feature | Baixa | Aberto | Sem medição real, a próxima optimização de tokens é palpite | Mínimo — preencher tabela no TODO.md | FIN-6 |
| TD-6 | Regenerar database.ts via supabase gen types --linked | Média | Concluído | database.ts regenerado (marcador __InternalSupabase); B-13 resolvido + 1 cast de leitura removido. B-15/B-18 (casts de write) migram para TD-7 — bloqueados por incompat. @supabase/ssr | Baixo — comando + typecheck | FIN-7 |
| TD-7 | Atualizar @supabase/ssr 0.6.1→0.12.4 para fechar B-15/B-18 (casts de write) | Média | Aberto | 4 casts (supabase as any) em writes permanecem; @supabase/ssr@0.6.1 usa ordem de genéricos antiga → Schema colapsa para never no createServerClient | Médio — bump de 6 minors mexe na API de cookies de auth; exige QA/security | FIN-9 |
| TD-8 | Rate limit em memória não protege o login (single-secret) em serverless | Alta | Concluído | Risco M-04 ACEITE+documentado (app só local/instância única; reabrir se deploy serverless) | Médio — store distribuído (Upstash) ou aceitar+documentar | FIN-10 |
| TD-9 | Sem cobertura de CI da rota POST /api/auth/login | Média | Aberto | Regressão no cookie/sessão do login passaria verde no CI | Baixo — spec no smoke ou job dedicado | FIN-11 |
| TD-10 | Chrome Extension desconecta — gate de QA visual não-funcional | Média | Aberto | 2 features de auth mergeadas sem verificação visual real (BUG-2/BUG-3) | Baixo — diagnóstico + política de gate | FIN-12 |
