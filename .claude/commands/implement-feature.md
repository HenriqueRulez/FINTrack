---
description: "Fase 2/3 da pipeline: SM → Engineer. Corre numa sessão separada após /design-feature. Argumento: slug da feature (ex: /implement-feature dashboard-charts)."
---

Execute a **Fase 2** do ciclo de desenvolvimento: planeamento e implementação da lógica de negócio e API.

O argumento recebido é o **slug da feature** (ex: `dashboard-charts`). Corra esta fase numa sessão dedicada após `/design-feature`. No fim, inicie uma nova sessão para `/verify-feature`.

## Localizar artefactos da Fase 1

Antes de qualquer passo, localizar os ficheiros deixados pela Fase 1 usando o slug recebido:

```
working_item_path   → Glob ".claude/working-items/*[slug]*.md" → primeiro resultado
design_report_path  → Glob ".claude/reports/design-*[slug]*.md" → primeiro resultado
frontend_report_path→ Glob ".claude/reports/frontend-*[slug]*.md" → primeiro resultado
```

Se algum não for encontrado → emitir "❌ **Fase 1 não encontrada** — ficheiro [tipo] para '[slug]' não existe. Execute `/design-feature` primeiro." e pare.

Confirmar lendo os 3 ficheiros. Se qualquer Read falhar → "❌ **Artefacto corrompido** — [path] não pode ser lido. Fase interrompida." e pare.

## Variáveis de estado

- `working_item_path` — localizado acima
- `design_report_path` — localizado acima
- `frontend_report_path` — localizado acima
- `task_path` — definido pelo SM
- `engineer_report_path` — definido pelo Engineer

## Protocolo de Execução

### Passo 4 — Scrum Master
Informe: "**SM — a planear implementação...**"

Use o agente `sm` (subagent_type: "sm") passando `working_item_path`, `design_report_path` e `frontend_report_path`.

**Validação — guardar como `task_path`:**
- `BLOCKED:` → "❌ **SM BLOQUEADO** — [motivo]. Fase interrompida." e pare.
- Sem `.claude/tasks/` → "❌ **SM FALHOU** — [resposta completa]. Fase interrompida." e pare.
- Ficheiro não existe → "❌ **SM FALHOU** — ficheiro não encontrado: [path]. Fase interrompida." e pare.

---

### Passo 5 — Engineer
Informe: "**Engineer — a implementar lógica e API...**"

Use o agente `engineer` (subagent_type: "engineer") passando `task_path`, `working_item_path`, `design_report_path` e `frontend_report_path`.

**Validação — guardar como `engineer_report_path`:**
- `BLOCKED:` → "❌ **Engineer BLOQUEADO** — [motivo]. Fase interrompida." e pare.
- `TYPECHECK_FAILED:` → "❌ **Engineer FALHOU — Typecheck:**\n[output]. Fase interrompida." e pare.
- `LINT_FAILED:` → "❌ **Engineer FALHOU — Lint:**\n[output]. Fase interrompida." e pare.
- `MIGRATION_FAILED:` → "❌ **Engineer FALHOU — Migration:**\n[output]. Fase interrompida." e pare.
- Sem `.claude/reports/` ou prefixo proibido (`qa-`, `design-`, `frontend-`, `security-`) → "❌ **Engineer FALHOU** — [resposta completa]. Fase interrompida." e pare.
- Ficheiro não existe → "❌ **Engineer FALHOU** — ficheiro não encontrado: [path]. Fase interrompida." e pare.

---

## Registo em TOKEN_USAGE.md

Acrescentar ao `TOKEN_USAGE.md` antes da linha `## Resumo Acumulado`:

```markdown
### [Fase 2] [slug-da-feature] ([YYYY-MM-DD HH:MM])

| Agente | Status |
|--------|--------|
| SM | ✅ / ❌ |
| Engineer | ✅ / ❌ |

**Artefactos criados:**
- `[task_path]`
- `[engineer_report_path]`

**Tokens exactos:** verificar Claude Code → Stats

---
```

---

## Resumo da Fase 2

```
## Fase 2 Concluída — [Nome da Feature]

**Plano de tarefas:** [task_path]
**Relatório Engineer:** [engineer_report_path]

**Próximo passo — numa nova sessão:**
/verify-feature [slug-da-feature]
```
