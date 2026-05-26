---
description: "Pipeline completo de desenvolvimento: PO → Designer → Frontend → SM → Engineer → QA → Security Review, com retry automático Engineer↔QA até aprovação ou 3 tentativas."
---

> **Atalho que corre as 3 fases em sequência na mesma sessão.**
> Para conservar contexto em features grandes, corra as fases separadamente:
> `/design-feature` → (nova sessão) `/implement-feature [slug]` → (nova sessão) `/verify-feature [slug]`

Execute o ciclo completo de desenvolvimento para a feature pedida pelo utilizador. Informe o progresso em cada passo.

## Variáveis de estado a manter entre passos

Ao longo do ciclo, mantém estas variáveis:
- `working_item_path` — definido pelo PO no Passo 1
- `design_report_path` — definido pelo Designer no Passo 2
- `frontend_report_path` — definido pelo Frontend no Passo 3
- `task_path` — definido pelo SM no Passo 4
- `engineer_report_path` — definido pelo Engineer no Passo 5

## Protocolo de Execução

### Passo 1 — Product Owner
Informe: "**PO — a definir requisitos...**"

Use o agente `po` (subagent_type: "po"). O prompt enviado ao agente deve **incluir a linha literal `PIPELINE_MODE=true` no início**, seguida da descrição da feature.

```
PIPELINE_MODE=true

[descrição completa da feature aqui]
```

- Output esperado: caminho no formato `.claude/working-items/*.md`

**Validação obrigatória — guardar como `working_item_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **PO BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/working-items/` → emita "❌ **PO FALHOU** — resposta inesperada: [resposta completa]. Ciclo interrompido." e pare.
- Lê o ficheiro retornado. Se não existir → emita "❌ **PO FALHOU** — ficheiro não encontrado: [path]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `working_item_path`.

---

### Passo 2 — Designer
Informe: "**Designer — a especificar visualmente...**"

Use o agente `designer` (subagent_type: "designer") passando `working_item_path` no prompt.

- Output esperado: caminho no formato `.claude/reports/design-*.md`

**Validação obrigatória — guardar como `design_report_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **Designer BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/reports/design-` → emita "❌ **Designer FALHOU** — resposta inesperada: [resposta completa]. Ciclo interrompido." e pare.
- Lê o ficheiro retornado. Se não existir → emita "❌ **Designer FALHOU** — ficheiro não encontrado: [path]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `design_report_path`.

---

### Passo 3 — Frontend
Informe: "**Frontend — a implementar a interface visual...**"

Use o agente `frontend` (subagent_type: "frontend") passando `design_report_path` e `working_item_path` no prompt.

- Output esperado: caminho no formato `.claude/reports/frontend-*.md`

**Validação obrigatória — guardar como `frontend_report_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **Frontend BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Lê o ficheiro retornado. Se não existir → emita "❌ **Frontend FALHOU** — ficheiro não encontrado: [path]. Ciclo interrompido." e pare.
- Se o relatório contiver `TYPECHECK_FAILED:` → emita "❌ **Frontend FALHOU — Typecheck com erros:**\n[output completo]. Ciclo interrompido." e pare.
- Se o relatório contiver `LINT_FAILED:` → emita "❌ **Frontend FALHOU — Lint com erros:**\n[output completo]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/reports/frontend-` → emita "❌ **Frontend FALHOU** — resposta inesperada: [resposta completa]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `frontend_report_path`.

---

### Passo 4 — Scrum Master
Informe: "**SM — a planear implementação...**"

Use o agente `sm` (subagent_type: "sm") passando `working_item_path`, `design_report_path` e `frontend_report_path` no prompt.

- Output esperado: caminho no formato `.claude/tasks/*.md`

**Validação obrigatória — guardar como `task_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **SM BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/tasks/` → emita "❌ **SM FALHOU** — resposta inesperada: [resposta completa]. Ciclo interrompido." e pare.
- Lê o ficheiro retornado. Se não existir → emita "❌ **SM FALHOU** — ficheiro não encontrado: [path]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `task_path`.

---

### Passo 5 — Engineer
Informe: "**Engineer — a implementar lógica e API...**"

Use o agente `engineer` (subagent_type: "engineer") passando `task_path`, `working_item_path`, `design_report_path` e `frontend_report_path` no prompt.

- Output esperado: caminho no formato `.claude/reports/*.md` (nunca com prefixo `qa-`, `design-`, `frontend-`, ou `security-`)

**Validação obrigatória — guardar como `engineer_report_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **Engineer BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Lê o ficheiro retornado. Se não existir → emita "❌ **Engineer FALHOU** — ficheiro não encontrado: [path]. Ciclo interrompido." e pare.
- Se o relatório contiver `TYPECHECK_FAILED:` → emita "❌ **Engineer FALHOU — Typecheck com erros:**\n[output completo]. Ciclo interrompido." e pare.
- Se o relatório contiver `LINT_FAILED:` → emita "❌ **Engineer FALHOU — Lint com erros:**\n[output completo]. Ciclo interrompido." e pare.
- Se o relatório contiver `MIGRATION_FAILED:` → emita "❌ **Engineer FALHOU — Migration falhou:**\n[output completo]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/reports/` → emita "❌ **Engineer FALHOU** — resposta inesperada: [resposta completa]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `engineer_report_path`.

---

### Passo 6 — QA
Informe: "**QA — verificação visual (Chrome Extension) + testes funcionais (Playwright)...**"

Use o agente `qa` (subagent_type: "qa") passando **ambos** `engineer_report_path` e `working_item_path` no prompt.

- Output esperado: caminho `.claude/reports/qa-*.md` + exactamente uma das palavras: `APROVADO`, `PARCIAL` ou `REPROVADO`

**Validação obrigatória:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **QA BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/reports/qa-` → emita "❌ **QA FALHOU** — resposta inesperada: [resposta completa]. Ciclo interrompido." e pare.
- Extrai o status. Se nenhuma das três palavras estiver presente → emita "❌ **QA FALHOU** — status não identificado: [resposta recebida]. Ciclo interrompido." e pare.

---

### Passo 7 — Decisão (loop Engineer ↔ QA)

**Contagem de ciclos:** O ciclo Engineer→QA pode correr no máximo **3 vezes no total** (a primeira tentativa conta como ciclo 1).

**Se APROVADO:** avançar para o Passo 8 (Security Review).

**Se PARCIAL ou REPROVADO e ciclos < 3:**
- Informe: "⚠️ **QA encontrou problemas — Engineer a corrigir (ciclo N de 3)...**"
- Use o agente `engineer` (subagent_type: "engineer") com: `task_path` + `working_item_path` + `design_report_path` + `frontend_report_path` + caminho do relatório QA + instrução explícita de correcção com base nos problemas do QA
- Aplicar exactamente as mesmas validações do Passo 5
- Voltar ao Passo 6

**Se PARCIAL ou REPROVADO e ciclos = 3:**
- Informe: "⚠️ **Máximo de 3 ciclos atingido — a avançar para Security Review com problemas por resolver.**"
- Avançar para o Passo 8

---

### Passo 8 — Security Review
Informe: "**Security Review — a auditar...**"

Use o agente `security-reviewer` (subagent_type: "security-reviewer") passando `engineer_report_path` e `working_item_path` no prompt.

- Output esperado: caminho no formato `.claude/reports/security-*.md`

**Validação obrigatória:**
- Se a resposta começar com `BLOCKED:` → emita "⚠️ **Security Review BLOQUEADA** — [motivo]. A avançar para o resumo sem auditoria de segurança."
- Se a resposta não contiver `.claude/reports/security-` → emita "⚠️ **Security Review FALHOU** — resposta inesperada. A avançar para o resumo."
- Se passou: guarda o path como `security_report_path`.

---

## Passo 9 — Registo de Utilização

Após apresentar o resumo, registar a execução em `TOKEN_USAGE.md`.

Recolher os dados necessários:
- **Nome da feature:** extrair do `working_item_path` (parte após o último `/`, sem extensão)
- **Data/hora:** executar `Get-Date -Format "yyyy-MM-dd HH:mm"` via Bash
- **Status final:** APROVADO / PARCIAL / REPROVADO
- **Ciclos QA:** número total de vezes que o loop Engineer↔QA correu
- **Ficheiros tocados:** contar os itens nas secções "Ficheiros Criados" e "Ficheiros Modificados" dos relatórios Frontend e Engineer combinados
- **Relatórios gerados:** contar os artefactos `.md` criados em `.claude/`

Construir a entrada e **substituir** a linha `_Nenhuma execução registada ainda._` na primeira execução, ou **acrescentar antes da linha `---` do Resumo Acumulado** nas seguintes. Usar este formato exacto:

```markdown
### Run #[N] — [Nome da Feature] ([YYYY-MM-DD HH:MM])

| Agente | Status |
|--------|--------|
| PO | ✅ / ❌ |
| Designer | ✅ / ❌ |
| Frontend | ✅ / ❌ |
| SM | ✅ / ❌ |
| Engineer | ✅ / ❌ (ciclo 1) / ✅ (ciclo 2) / ... |
| QA | ✅ APROVADO / ⚠️ PARCIAL / ❌ REPROVADO |
| Security Review | ✅ / ⚠️ Sem auditoria |

**Ciclos QA:** [N] de 3  
**Ficheiros tocados:** [N] ([N] criados + [N] modificados)  
**Relatórios gerados:** [N] ficheiros em `.claude/`  
**Testes E2E:** `tests/e2e/[nome].spec.ts`  
**Tokens exactos:** verificar Claude Code → Stats

---
```

Depois actualizar o **Resumo Acumulado** no fim do `TOKEN_USAGE.md`:
- Incrementar "Execuções `/build-feature`"
- Incrementar "Features entregues", "com retrabalho" ou "reprovadas" conforme o status
- Somar ciclos QA extra (ciclos − 1, pois o primeiro não é retrabalho)
- Somar ficheiros tocados

## Resumo Final

Apresente ao utilizador:

---
## Ciclo Concluído — [Nome da Feature]

**Status:** ✅ APROVADO / ⚠️ PARCIAL após [N] ciclos / ❌ REPROVADO após [N] ciclos

**Artefactos gerados:**
- Working item: `[working_item_path]`
- Especificação visual: `[design_report_path]`
- Relatório Frontend: `[frontend_report_path]`
- Plano de tarefas: `[task_path]`
- Relatório Engineer: `[engineer_report_path]`
- Relatório QA: `[caminho do último relatório QA]`
- Relatório Security: `[security_report_path]`

**Ficheiros criados/modificados no projecto:**
[lista combinada dos relatórios Frontend e Engineer]

**Testes E2E adicionados:**
`tests/e2e/[nome-da-feature].spec.ts`

**Problemas não resolvidos** (apenas se PARCIAL ou REPROVADO):
[lista completa dos problemas do último relatório QA — nunca omitir]

**Achados de segurança** (apenas se houver novos):
[lista dos novos achados adicionados ao SECURITY_FINDINGS.md]
---
