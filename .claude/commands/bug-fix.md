---
description: "Pipeline de correcção de bugs: Bug Reporter → Engineer → QA, com retry automático até aprovação ou 3 tentativas."
---

Execute o ciclo de correcção de bug para o problema descrito pelo utilizador. Informe o progresso em cada passo.

O input pode ser:
- Descrição directa do bug no argumento do comando
- Referência a um item `[BUG]` no `TODO.md` — nesse caso, leia o ficheiro e extraia o primeiro item `- [ ] **[BUG]**` não concluído

## Variáveis de estado a manter entre passos

- `bug_report_path` — definido pelo Bug Reporter no Passo 1
- `engineer_report_path` — definido pelo Engineer no Passo 2

## Protocolo de Execução

### Passo 1 — Bug Reporter
Informe: "**Bug Reporter — a estruturar relatório...**"

Use o agente `bug-reporter` (subagent_type: "general-purpose") com as instruções completas do ficheiro `.claude/agents/bug-reporter.md` e a descrição do bug como input.

- Output esperado: caminho no formato `.claude/bug-reports/*.md`

**Validação obrigatória — guardar como `bug_report_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **Bug Reporter BLOQUEADO** — [motivo exacto do BLOCKED]. A descrição do bug pode estar incompleta. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/bug-reports/` → emita "❌ **Bug Reporter FALHOU** — resposta inesperada: [resposta recebida completa]. Ciclo interrompido." e pare.
- Tenta ler o ficheiro retornado. Se não existir → emita "❌ **Bug Reporter FALHOU** — path retornado mas ficheiro não encontrado em disco: [path]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `bug_report_path`.

### Passo 2 — Engineer
Informe: "**Engineer — a corrigir o bug...**"

Use o agente `engineer` (subagent_type: "general-purpose") com as instruções completas do ficheiro `.claude/agents/engineer.md`. No prompt, inclua:
- O `bug_report_path`
- Instrução explícita: **"Está em modo BUG-FIX. O input não é um plano de tarefas do SM — é um bug report em `.claude/bug-reports/`. Leia o bug report no caminho indicado, identifique a root cause no codebase, corrija o problema, e produza o relatório em `.claude/reports/fix-[slug].md`."**

- Output esperado: caminho no formato `.claude/reports/fix-*.md`

**Validação obrigatória — guardar como `engineer_report_path`:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **Engineer BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Lê o ficheiro de relatório retornado. Se não existir → emita "❌ **Engineer FALHOU** — relatório não encontrado em disco: [path]. Ciclo interrompido." e pare.
- Se o relatório contiver `TYPECHECK_FAILED:` → emita "❌ **Engineer FALHOU — Typecheck com erros:**\n[output completo do TYPECHECK_FAILED do relatório]\nCiclo interrompido." e pare.
- Se o relatório contiver `LINT_FAILED:` → emita "❌ **Engineer FALHOU — Lint com erros:**\n[output completo do LINT_FAILED do relatório]\nCiclo interrompido." e pare.
- Se a resposta não contiver `.claude/reports/` → emita "❌ **Engineer FALHOU** — resposta inesperada: [resposta recebida completa]. Ciclo interrompido." e pare.
- Se passou: guarda o path como `engineer_report_path`.

### Passo 3 — QA
Informe: "**QA — a verificar a correcção...**"

Use o agente `qa` (subagent_type: "general-purpose") com as instruções completas do ficheiro `.claude/agents/qa.md`. No prompt, inclua:
- O `engineer_report_path`
- O `bug_report_path` **no lugar do working_item_path** — o bug report contém os critérios de aceite para a correcção
- Instrução explícita: **"Está em modo BUG-FIX. O 'working item' é o bug report em `.claude/bug-reports/`. Verifique se os critérios de aceite do bug report foram satisfeitos e se não há regressões."**

- Output esperado: caminho `.claude/reports/qa-fix-*.md` + exactamente uma das palavras: `APROVADO`, `PARCIAL` ou `REPROVADO`

**Validação obrigatória:**
- Se a resposta começar com `BLOCKED:` → emita "❌ **QA BLOQUEADO** — [motivo exacto]. Ciclo interrompido." e pare.
- Se a resposta não contiver `.claude/reports/qa-` → emita "❌ **QA FALHOU** — resposta inesperada: [resposta recebida completa]. Ciclo interrompido." e pare.
- Extrai o status da resposta. Se nenhuma das três palavras estiver presente → emita "❌ **QA FALHOU** — status não identificado na resposta: [resposta recebida]. Ciclo interrompido." e pare.

### Passo 4 — Decisão

**Contagem de ciclos:** O ciclo Engineer→QA pode correr no máximo **3 vezes no total** (a primeira tentativa conta como ciclo 1).

**Se APROVADO:** avançar para o resumo final.

**Se PARCIAL ou REPROVADO e ciclos < 3:**
- Informe: "⚠️ **QA encontrou problemas — Engineer a corrigir (ciclo N de 3)...**"
- Use o agente `engineer` (subagent_type: "general-purpose") passando no prompt: `bug_report_path` + caminho do relatório QA + instrução explícita de modo BUG-FIX + instrução de que se trata de uma correcção com base nos problemas listados no relatório QA
- Aplicar exactamente as mesmas validações do Passo 2 antes de avançar
- Voltar ao Passo 3

**Se PARCIAL ou REPROVADO e ciclos = 3:**
- Informe: "⚠️ **Máximo de 3 ciclos atingido — a avançar para o resumo com problemas por resolver.**"
- Avançar para o resumo final com status PARCIAL/REPROVADO

## Resumo Final

Apresente ao utilizador:

---
## Bug Fix Concluído — [Descrição do Bug]

**Status:** ✅ CORRIGIDO / ⚠️ PARCIAL após [N] ciclos / ❌ NÃO RESOLVIDO após [N] ciclos

**Artefactos gerados:**
- Bug report: `[bug_report_path]`
- Relatório Engineer: `[engineer_report_path]`
- Relatório QA: `[caminho do último relatório QA]`

**Root cause identificada:**
[extraída do relatório do Engineer]

**Ficheiros modificados:**
[lista do relatório do Engineer]

**Para verificar no browser:**
[lista dos CAs MANUAL do último relatório QA]

**Problemas não resolvidos** (apenas se PARCIAL ou NÃO RESOLVIDO):
[lista completa dos problemas do relatório QA final — nunca omitir]
---
