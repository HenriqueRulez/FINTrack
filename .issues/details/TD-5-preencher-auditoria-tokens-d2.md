# TD-5: Preencher auditoria de tokens (D2) no fim da próxima feature

## Descrição

A estrutura da auditoria de gasto por agente (D2) existe no TODO.md (template de tabela por fase da pipeline), mas sem nenhuma medição real. Regra: só se optimiza o que se mediu — sem números, a próxima optimização de tokens é palpite. Baseline histórico único: ~166k tokens num ciclo de QA da csv-import.

## Acceptance Criteria

- [ ] No fim da próxima feature completa, a tabela D2 é preenchida com tokens reais por fase (runtime → Stats), sem estimativas
- [ ] Registada a fase de maior custo e o próximo alvo de optimização (ou "nenhum")
