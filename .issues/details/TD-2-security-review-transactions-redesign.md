# TD-2: Security Review em falta — transactions-redesign

## Descrição

A feature transactions-redesign completou QA com status PARCIAL (CA-07: `<button>` aninhado no Select All, depois corrigido via /bug-fix com qa-fix APROVADO), mas o Security Review — gate obrigatório da pipeline — nunca correu. Não existe `.claude/reports/security-transactions-redesign.md` e o SECURITY_FINDINGS.md não tem entrada desta feature.

## Acceptance Criteria

- [ ] Agente `security-reviewer` corrido sobre os ficheiros da feature (relatório do Engineer: `.claude/reports/engineer-transactions-redesign.md`)
- [ ] `SECURITY_FINDINGS.md` actualizado (novos achados ou registo explícito de zero)
- [ ] Relatório `security-transactions-redesign.md` gerado

## Notas técnicas

- Inclui os ficheiros do fix posterior (`FilterRow.tsx`, ver `.claude/reports/fix-transactions-select-all-nested-button.md`)
