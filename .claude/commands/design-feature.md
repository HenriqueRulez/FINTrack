---
description: "Fase 1/3 da pipeline: PO → Designer → Frontend. Corre numa sessão separada para conservar contexto. Continuar com /implement-feature após esta fase."
---

Execute a **Fase 1** do ciclo de desenvolvimento: definição de requisitos, especificação visual e implementação da interface.

Corra esta fase numa sessão dedicada. No fim, inicie uma nova sessão para `/implement-feature`.

## Variáveis de estado

- `working_item_path` — definido pelo PO
- `design_report_path` — definido pelo Designer
- `frontend_report_path` — definido pelo Frontend

## Protocolo de Execução

### Passo 1 — Product Owner
Informe: "**PO — a definir requisitos...**"

Use o agente `po` (subagent_type: "po"). O prompt deve **incluir `PIPELINE_MODE=true` no início**:

```
PIPELINE_MODE=true

[descrição completa da feature aqui]
```

**Validação — guardar como `working_item_path`:**
- `BLOCKED:` → "❌ **PO BLOQUEADO** — [motivo]. Fase interrompida." e pare.
- Sem `.claude/working-items/` → "❌ **PO FALHOU** — [resposta completa]. Fase interrompida." e pare.
- Ficheiro não existe em disco → "❌ **PO FALHOU** — ficheiro não encontrado: [path]. Fase interrompida." e pare.

---

### Passo 2 — Designer
Informe: "**Designer — a especificar visualmente...**"

Use o agente `designer` (subagent_type: "designer") passando `working_item_path`.

**Validação — guardar como `design_report_path`:**
- `BLOCKED:` → "❌ **Designer BLOQUEADO** — [motivo]. Fase interrompida." e pare.
- Sem `.claude/reports/design-` → "❌ **Designer FALHOU** — [resposta completa]. Fase interrompida." e pare.
- Ficheiro não existe → "❌ **Designer FALHOU** — ficheiro não encontrado: [path]. Fase interrompida." e pare.

---

### Passo 3 — Frontend
Informe: "**Frontend — a implementar a interface visual...**"

Use o agente `frontend` (subagent_type: "frontend") passando `design_report_path` e `working_item_path`.

**Validação — guardar como `frontend_report_path`:**
- `BLOCKED:` → "❌ **Frontend BLOQUEADO** — [motivo]. Fase interrompida." e pare.
- `TYPECHECK_FAILED:` no relatório → "❌ **Frontend FALHOU — Typecheck:**\n[output]. Fase interrompida." e pare.
- `LINT_FAILED:` no relatório → "❌ **Frontend FALHOU — Lint:**\n[output]. Fase interrompida." e pare.
- Sem `.claude/reports/frontend-` → "❌ **Frontend FALHOU** — [resposta completa]. Fase interrompida." e pare.
- Ficheiro não existe → "❌ **Frontend FALHOU** — ficheiro não encontrado: [path]. Fase interrompida." e pare.

---

## Registo em TOKEN_USAGE.md

Extrair o slug da feature do `working_item_path` (parte após o último `/`, sem `.md`).
Obter data/hora: `Get-Date -Format "yyyy-MM-dd HH:mm"` via Bash.
Acrescentar ao `TOKEN_USAGE.md` antes da linha `## Resumo Acumulado`:

```markdown
### [Fase 1] [slug-da-feature] ([YYYY-MM-DD HH:MM])

| Agente | Status |
|--------|--------|
| PO | ✅ / ❌ |
| Designer | ✅ / ❌ |
| Frontend | ✅ / ❌ |

**Artefactos criados:**
- `[working_item_path]`
- `[design_report_path]`
- `[frontend_report_path]`

**Tokens exactos:** verificar Claude Code → Stats

---
```

---

## Resumo da Fase 1

Apresente ao utilizador:

```
## Fase 1 Concluída — [Nome da Feature]

**Working item:** [working_item_path]
**Especificação visual:** [design_report_path]
**Relatório Frontend:** [frontend_report_path]

**Próximo passo — numa nova sessão:**
/implement-feature [slug-da-feature]
```
