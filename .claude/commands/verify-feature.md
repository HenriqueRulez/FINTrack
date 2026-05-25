---
description: "Fase 3/3 da pipeline: QA → Security Review, com retry Engineer↔QA. Corre numa sessão separada após /implement-feature. Argumento: slug da feature."
---

Execute a **Fase 3** do ciclo de desenvolvimento: verificação, testes no browser e auditoria de segurança.

O argumento recebido é o **slug da feature** (ex: `dashboard-charts`). Corra esta fase numa sessão dedicada após `/implement-feature`.

## Localizar artefactos das Fases anteriores

```
working_item_path    → Glob ".claude/working-items/*[slug]*.md" → primeiro resultado
engineer_report_path → Glob ".claude/reports/[slug]*.md" (excluindo qa-*, design-*, frontend-*, security-*) → resultado mais recente
```

Se algum não for encontrado → "❌ **Fases anteriores não encontradas** — execute `/design-feature` e `/implement-feature` primeiro." e pare.

## Variáveis de estado

- `working_item_path` — localizado acima
- `engineer_report_path` — localizado acima (ou actualizado após correccção do Engineer)
- `qa_report_path` — definido pelo QA
- `security_report_path` — definido pelo Security Reviewer

## Protocolo de Execução

### Passo 6 — QA
Informe: "**QA — a escrever testes e verificar...**"

Use o agente `qa` (subagent_type: "qa") passando `engineer_report_path` e `working_item_path`.

**Validação:**
- `BLOCKED:` → "❌ **QA BLOQUEADO** — [motivo]. Fase interrompida." e pare.
- Sem `.claude/reports/qa-` → "❌ **QA FALHOU** — [resposta completa]. Fase interrompida." e pare.
- Extrair status: `APROVADO`, `PARCIAL` ou `REPROVADO`. Se nenhum → "❌ **QA FALHOU** — status não identificado." e pare.

---

### Passo 7 — Decisão (loop Engineer ↔ QA)

**Contagem de ciclos:** máximo **3 vezes** (a primeira tentativa conta como ciclo 1).

**Se APROVADO:** avançar para Passo 8.

**Se PARCIAL ou REPROVADO e ciclos < 3:**
- Informe: "⚠️ **QA encontrou problemas — Engineer a corrigir (ciclo N de 3)...**"
- Use o agente `engineer` (subagent_type: "engineer") com: `working_item_path` + `engineer_report_path` + `qa_report_path` + instrução explícita de correcção
- Aplicar as mesmas validações do Passo 5 do `/implement-feature`
- Actualizar `engineer_report_path` com o novo relatório
- Voltar ao Passo 6

**Se PARCIAL ou REPROVADO e ciclos = 3:**
- Informe: "⚠️ **Máximo de 3 ciclos atingido — a avançar para Security Review com problemas por resolver.**"
- Avançar para Passo 8

---

### Passo 8 — Security Review
Informe: "**Security Review — a auditar...**"

Use o agente `security-reviewer` (subagent_type: "security-reviewer") passando `engineer_report_path` e `working_item_path`.

**Validação:**
- `BLOCKED:` → "⚠️ **Security Review BLOQUEADA** — [motivo]. A avançar sem auditoria."
- Sem `.claude/reports/security-` → "⚠️ **Security Review FALHOU** — a avançar sem auditoria."
- Se passou: guardar como `security_report_path`.

---

## Registo em TOKEN_USAGE.md

Acrescentar ao `TOKEN_USAGE.md` antes da linha `## Resumo Acumulado` e actualizar os contadores:

```markdown
### [Fase 3] [slug-da-feature] ([YYYY-MM-DD HH:MM])

| Agente | Status |
|--------|--------|
| QA | ✅ APROVADO / ⚠️ PARCIAL / ❌ REPROVADO |
| Engineer (correcção) | ✅ / ❌ / N/A |
| Security Review | ✅ / ⚠️ Sem auditoria |

**Ciclos QA:** [N] de 3
**Relatório QA:** `[qa_report_path]`
**Relatório Security:** `[security_report_path]`
**Testes E2E:** `tests/e2e/[slug].spec.ts`

**Tokens exactos:** verificar Claude Code → Stats

---
```

Actualizar o **Resumo Acumulado**:
- Incrementar "Execuções" (contar as 3 fases como 1 execução completa se todas correram)
- Incrementar "Features entregues / com retrabalho / reprovadas"
- Somar ciclos QA extra (ciclos − 1)

---

## Resumo da Fase 3

```
## Fase 3 Concluída — [Nome da Feature]

**Status:** ✅ APROVADO / ⚠️ PARCIAL após [N] ciclos / ❌ REPROVADO após [N] ciclos

**Relatório QA:** [qa_report_path]
**Relatório Security:** [security_report_path]
**Testes E2E:** tests/e2e/[slug].spec.ts

**Problemas não resolvidos** (só se PARCIAL/REPROVADO):
[lista completa do último relatório QA]

**Achados de segurança novos:**
[lista dos novos achados em SECURITY_FINDINGS.md]

**Feature completa. ✅**
```
