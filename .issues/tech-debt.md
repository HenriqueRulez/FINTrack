# Tech debt

> Dívida técnica (TD-). Regras e colunas: `linear/docs/trabalhando-com-linear.md`.

| ID  | Título | Prioridade | Estado | Impacto | Esforço | Linear ID |
| --- | ------ | ---------- | ------ | ------- | ------- | --------- |
| TD-1 | Reconciliar suite E2E legada (G-05) — specs mutuamente destrutivos | Média | Aberto | ~11 specs só correm localmente, fora do CI | Alto — exige banco de teste | FIN-2 |
| TD-2 | Security Review em falta — transactions-redesign | Alta | Concluído | Feature entregue sem o gate obrigatório de segurança | Baixo — correr o agente | FIN-3 |
| TD-3 | QA + Security em falta — logout-settings-page (pipeline parou na Fase 1) | Média | Aberto | Logout implementado e funcional mas nunca verificado/auditado | Baixo — correr /verify-feature | FIN-4 |
| TD-4 | Branch protection em main (A1) — required check "Deterministic gate" | Alta | Concluído | Sem ela o CI é informativo: vermelho não bloqueia merge | Mínimo — acção manual do utilizador no GitHub | FIN-5 |
| TD-5 | Preencher auditoria de tokens (D2) no fim da próxima feature | Baixa | Aberto | Sem medição real, a próxima optimização de tokens é palpite | Mínimo — preencher tabela no TODO.md | FIN-6 |
| TD-6 | Regenerar database.ts via supabase gen types --linked | Média | Aberto | Fecha B-13/B-15/B-18 (casts as any/unknown que mascaram drift de schema) | Baixo — comando + typecheck | FIN-7 |
