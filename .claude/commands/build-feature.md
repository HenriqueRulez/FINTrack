---
description: "Pipeline completo de desenvolvimento: PO → SM → Engineer → QA, com retry automático até aprovação ou 3 tentativas."
---

Execute o ciclo completo de desenvolvimento para a feature pedida pelo utilizador. Informe o progresso em cada passo.

## Variáveis de estado a manter entre passos

Ao longo do ciclo, mantém estas variáveis que serão passadas a cada agente:
- `working_item_path` — definido pelo PO no Passo 1
- `task_path` — definido pelo SM no Passo 2
- `engineer_report_path` — definido pelo Engineer no Passo 3

## Protocolo de Execução

### Passo 1 — Product Owner
Informe: "**PO — a definir requisitos...**"

Use o agente `po` (subagent_type: "po"). O prompt enviado ao agente deve **incluir a linha literal `PIPELINE_MODE=true` no início**, seguida da descrição da feature.

Exemplo de prompt ao PO:
```
PIPELINE_MODE=true

[descrição completa da feature aqui]
```

- Output esperado: caminho no formato `.claude/working-items/*.md`

**Validação obrigatória — guardar como `working_item_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **PO BLOQUEADO** — [motivo exacto do BLOCKED]. O briefing pode estar incompleto. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/working-items/` → emita "❌ **PO FALHOU** — resposta inesperada: [resposta recebida completa]. Ciclo interrompido." e pare.
- Tenta ler o ficheiro retornado. Se não existir → emita "❌ **PO FALHOU** — path retornado mas ficheiro não encontrado em disco: [path]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `working_item_path`.

### Passo 2 — Scrum Master
Informe: "**SM — a planear implementação...**"

Use o agente `sm` (subagent_type: "sm") passando `working_item_path` no prompt.

- Output esperado: caminho no formato `.claude/tasks/*.md`

**Validação obrigatória — guardar como `task_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **SM BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/tasks/` → emita "❌ **SM FALHOU** — resposta inesperada: [resposta recebida completa]. Ciclo interrompido." e pare.
- Tenta ler o ficheiro retornado. Se não existir → emita "❌ **SM FALHOU** — ficheiro de tarefas não encontrado em disco: [path]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `task_path`.

### Passo 3 — Engineer
Informe: "**Engineer — a implementar...**"

Use o agente `engineer` (subagent_type: "engineer") passando `task_path` e `working_item_path` no prompt.

- Output esperado: caminho no formato `.claude/reports/*.md` (nunca com prefixo `qa-`)

**Validação obrigatória — guardar como `engineer_report_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **Engineer BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Lê o ficheiro de relatório retornado. Se não existir → emita "❌ **Engineer FALHOU** — relatório não encontrado em disco: [path]. Ciclo interrompido." e pare.
- Se o relatório contiver `TYPECHECK_FAILED:` → emita "❌ **Engineer FALHOU — Typecheck com erros:**\n[output completo do TYPECHECK_FAILED do relatório]\nCiclo interrompido." e pare.
- Se o relatório contiver `LINT_FAILED:` → emita "❌ **Engineer FALHOU — Lint com erros:**\n[output completo do LINT_FAILED do relatório]\nCiclo interrompido." e pare.
- Se o relatório contiver `MIGRATION_FAILED:` → emita "❌ **Engineer FALHOU — Migration falhou:**\n[output completo do MIGRATION_FAILED do relatório]\nCiclo interrompido." e pare.
- Se a resposta não contiver `.claude/reports/` → emita "❌ **Engineer FALHOU** — resposta inesperada: [resposta recebida completa]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `engineer_report_path`.

### Passo 4 — QA
Informe: "**QA — a verificar...**"

Use o agente `qa` (subagent_type: "qa") passando **ambos** `engineer_report_path` e `working_item_path` no prompt.

- Output esperado: caminho `.claude/reports/qa-*.md` + exactamente uma das palavras: `APROVADO`, `PARCIAL` ou `REPROVADO`

**Validação obrigatória:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **QA BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/reports/qa-` → emita "❌ **QA FALHOU** — resposta inesperada: [resposta recebida completa]. Ciclo interrompido." e pare.
- Extrai o status da resposta. Se nenhuma das três palavras estiver presente → emita "❌ **QA FALHOU** — status não identificado na resposta: [resposta recebida]. Ciclo interrompido." e pare.

### Passo 5 — Decisão

**Contagem de ciclos:** O ciclo Engineer→QA pode correr no máximo **3 vezes no total** (a primeira tentativa conta como ciclo 1).

**Se APROVADO:** avançar para o resumo final.

**Se PARCIAL ou REPROVADO e ciclos < 3:**
- Informe: "⚠️ **QA encontrou problemas — Engineer a corrigir (ciclo N de 3)...**"
- Use o agente `engineer` (subagent_type: "engineer") passando no prompt: `task_path` + `working_item_path` + caminho do relatório QA + instrução explícita de que se trata de uma correcção com base nos problemas listados no relatório QA
- Aplicar exactamente as mesmas validações do Passo 3 antes de avançar
- Voltar ao Passo 4

**Se PARCIAL ou REPROVADO e ciclos = 3:**
- Informe: "⚠️ **Máximo de 3 ciclos atingido — a avançar para o resumo com problemas por resolver.**"
- Avançar para o resumo final com status PARCIAL/REPROVADO

## Resumo Final

Apresente ao utilizador:

---
## Ciclo Concluído — [Nome da Feature]

**Status:** ✅ APROVADO / ⚠️ PARCIAL após [N] ciclos / ❌ REPROVADO após [N] ciclos

**Artefactos gerados:**
- Working item: `[working_item_path]`
- Plano de tarefas: `[task_path]`
- Relatório Engineer: `[engineer_report_path]`
- Relatório QA: `[caminho do último relatório QA]`

**Ficheiros criados/modificados no projecto:**
[lista do relatório do Engineer]

**Para testar no browser:**
[lista dos itens MANUAL do último relatório QA]

**Problemas não resolvidos** (apenas se PARCIAL ou REPROVADO):
[lista completa dos problemas do relatório QA final — nunca omitir]
---
