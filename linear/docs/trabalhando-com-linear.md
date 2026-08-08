# Trabalhando com Linear

Fluxo de **duas camadas**: trabalho local rápido em Markdown (`.issues/`) e sincronização **pontual e explícita** com o Linear. Objectivo: visibilidade total de features, bugs e tech debt com o mínimo absoluto de chamadas MCP.

## Destino no Linear (fixo)

- **MCP server:** usar sempre `mcp__linear-server__*`. Nunca usar o connector `mcp__claude_ai_Linear__*` — é o mesmo workspace, mas fixar um único server torna o fluxo determinístico.
- **Team:** `FINTrack` (id `97a705eb-0bf1-4237-8e1b-d963912a92ab`). Nenhum item deste projecto vai para outro team.
- Sem project/milestone por defeito — issues criadas directamente no team.

## Estrutura de ficheiros

```
.issues/
  backlog.md      # por refinar — itens ainda sem AC
  todo.md         # features (FEAT-) refinadas/planeadas
  bugs.md         # bugs (BUG-)
  tech-debt.md    # dívida técnica (TD-)
  details/
    {ID}-{slug}.md  # detalhe (descrição + AC); para FEATs É o working item do PO
```

O nome do ficheiro de detalhe é `{ID}-{slug}.md` (ex.: `FEAT-3-dashboard-charts.md`) — resolve-se por prefixo do ID **e** por slug (as skills de fase localizam por `Glob .issues/details/*[slug]*.md`).

**Não existe `in-progress.md`** — o andamento vive na coluna `Estado`. Cada item existe em exactamente **um** ficheiro índice.

## IDs

- Prefixos: `FEAT-`, `BUG-`, `TD-`. Sequencial por prefixo; o próximo número é `max+1` considerando **todos** os ficheiros índice. Um ID nunca é reutilizado.
- Um item de backlog nasce já com o prefixo final (ex.: `FEAT-7` por refinar). Promoção backlog→todo: a **linha muda de ficheiro, o ID mantém-se**.

## Camada 1 — Índice (fonte de verdade)

A tabela índice é a **única fonte de verdade** para `Estado`, `Prioridade` e `Linear ID`. Os ficheiros de detalhe **não repetem** esses campos.

Colunas por ficheiro:

- `backlog.md`: `| ID | Título | Prioridade | Notas | Linear ID |` (Estado implícito: Aberto)
- `todo.md`: `| ID | Título | Prioridade | Estado | Área/Ficheiro | Linear ID |`
- `bugs.md`: `| ID | Título | Prioridade | Estado | Área/Ficheiro | Linear ID |`
- `tech-debt.md`: `| ID | Título | Prioridade | Estado | Impacto | Esforço | Linear ID |`

Valores fechados:

- `Estado` ∈ `Aberto | Em progresso | Resolvido | Cancelado`
- `Prioridade` ∈ `Urgente | Alta | Média | Baixa`
- `Linear ID`: `-` até sincronizar; depois o identificador real (ex.: `FIN-42`)

**Marcador de sync pendente:** ao mudar o `Estado` de uma linha que **já tem** Linear ID, escrever o novo estado com `*` (ex.: `Resolvido*`). O `*` significa "por sincronizar" e é removido no próximo sync. Isto detecta divergência com **zero** chamadas MCP.

## Camada 2 — Detalhe (`details/{ID}-{slug}.md`)

Criar só quando vale a pena (antes de trabalhar no item, ou antes do sync). Formato base:

```markdown
# {ID}: {Título}

## Descrição

## Acceptance Criteria

- [ ] ...

## Notas técnicas
```

- **FEATs:** o ficheiro de detalhe **é o working item do PO** — o agente `po` grava aqui (template próprio: User Story, Contexto, CA, Requisitos Não-Funcionais, Dependências, Fora do Escopo) e toda a pipeline (Designer → Frontend → SM → Engineer → QA → Security) lê deste caminho.
- **BUGs:** o agente `bug-reporter` grava aqui o bug report formal (template próprio).
- Nunca escrever Estado/Prioridade/Linear ID no detalhe — vivem só na tabela índice.

## Regras de comportamento

1. **Anotação rápida** ("encontrei um bug X", "precisamos de Y"): adicionar **só uma linha** na tabela do índice correcto. Não criar detalhe, não chamar o Linear.
2. **Detalhamento** (pedido explícito, ex. "detalha o BUG-1"): criar/actualizar `details/{ID}-{slug}.md`.
3. **Actualização de estado** (ex. "marca o BUG-1 como resolvido"): mudar `Estado` **apenas na tabela índice**. Se a linha já tiver Linear ID, usar o marcador `*`. Fica local — nunca sincroniza sozinho.
4. **Sync com o Linear** (só quando pedido explicitamente, ex. "sincroniza o backlog com o Linear"):
   - **Novos** = linhas com `Linear ID` = `-` → criar com `save_issue` no team FINTrack. Corpo = `details/{ID}-*.md` se existir; título = `{ID}: {Título}` (o ID local no título permite reconciliação futura). Item **sem detalhe**: perguntar antes de criar só com título (regra única — nunca criar em silêncio).
   - **Alterados** = linhas com `Estado*` → `save_issue` de actualização de estado e remover o `*`. **Em conflito, o local ganha** — o Linear é espelho do local, nunca o contrário.
   - Após criar, preencher `Linear ID` na tabela índice.
   - Agrupar tudo numa única leva de chamadas. Se nada tem `-` nem `*`, o sync termina com **zero** chamadas.
   - `get_issue`/listagens só em modo **reconciliação**, pedido à parte (ex. "reconcilia com o Linear") — nunca no sync normal.
5. **Nunca** sincronizar automaticamente após anotação ou actualização local.

## Mapeamentos locais ↔ Linear

| Local (Estado)             | Linear (state)                      |
| -------------------------- | ----------------------------------- |
| Aberto (em `backlog.md`)   | Backlog                             |
| Aberto (restantes índices) | Todo                                |
| Em progresso               | In Progress                         |
| Resolvido                  | Done                                |
| Cancelado                  | Canceled                            |

Leitura inversa (só em reconciliação): `In Review` conta como `Em progresso`; `Duplicate` como `Cancelado`.

| Local (Prioridade) | Linear (priority) |
| ------------------ | ----------------- |
| Urgente            | 1                 |
| Alta               | 2                 |
| Média              | 3                 |
| Baixa              | 4                 |

## Integração com a pipeline de agentes

- **`po`**: atribui `FEAT-n`, garante a linha em `todo.md` (ou `backlog.md` se por refinar) e grava o working item em `details/FEAT-n-{slug}.md`.
- **`qa`**: bugs descobertos durante verificação = linha em `bugs.md` (nunca no `TODO.md`).
- **`bug-reporter`**: atribui `BUG-n`, escreve a linha em `bugs.md` e o relatório em `details/BUG-n-{slug}.md`.
- **`/bug-fix`**: lê de `bugs.md`; quando a correcção é aprovada, `Estado` → `Resolvido` (local; `*` se já sincronizado).
- **`TODO.md`** não regista bugs nem backlog — é apenas o plano da fase de trabalho em curso.

## Por que este fluxo

- Anotações e edições locais em Markdown não geram chamadas MCP — custam uma fracção dos tokens.
- A separação índice/detalhe evita escrever descrição e AC para itens que podem nem avançar.
- O marcador `*` torna o sync incremental sem estado externo nem leituras ao Linear.
- O sync pontual agrupa criações/actualizações numa única leva de chamadas.
