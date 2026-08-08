# Trabalhando com Linear

Este projeto usa um fluxo de **duas camadas** para gestão de backlog: trabalho local rápido durante o desenvolvimento, e sincronização pontual com o Linear. O objetivo é manter visibilidade clara sobre features, bugs e tech debt sem gastar tokens excessivos em chamadas MCP constantes.

## Estrutura de ficheiros

```
.issues/
  backlog.md     # Indíce de items ainda por definir. Apenas um scopo inicial para se refinar
  todo.md          # índice de features planeadas/por desenvolver
  in-progress.md        # índice do que está a ser trabalhado agora
  bugs.md                # índice de bugs conhecidos
  tech-debt.md            # índice de dívida técnica
  details/
    {ID}.md               # detalhe completo de um item específico (descrição, AC, notas técnicas)
```

## Camada 1: Índice (tabela resumo)

Cada ficheiro em `.issues/*.md` (exceto `details/`) contém uma tabela markdown com colunas fixas. Exemplo (`bugs.md`):

```markdown
| ID    | Título                           | Prioridade | Estado | Área/Ficheiro        | Linear ID |
| ----- | -------------------------------- | ---------- | ------ | -------------------- | --------- |
| BUG-1 | Login falha com email em maiúsc. | Alta       | Aberto | src/auth/login.ts    | -         |
| BUG-2 | Imagem não carrega no mobile     | Média      | Aberto | components/Image.tsx | -         |
```

- `ID`: identificador local, sequencial por prefixo (`BUG-`, `FEAT-`, `TD-`).
- `Linear ID`: fica `-` até o item ser sincronizado. Depois do sync, é preenchido com o ID real do Linear (ex.: `ENG-143`).

Cada tipo de ficheiro tem colunas próprias adequadas ao seu contexto (ex.: `tech-debt.md` tem `Impacto` e `Esforço estimado`; `in-progress.md` tem `Notas` de progresso).

## Camada 2: Detalhe (descrição e AC)

Itens que precisam de descrição completa e Acceptance Criteria têm um ficheiro próprio em `details/{ID}.md`:

```markdown
# BUG-1: Login falha com email em maiúsculas

**Estado:** Aberto
**Prioridade:** Alta
**Linear ID:** -

## Descrição

[descrição do problema/feature, contexto técnico relevante]

## Acceptance Criteria

- [ ] Critério 1
- [ ] Critério 2

## Notas técnicas

[observações adicionais, dependências, riscos]
```

Nem todo item precisa de ficheiro de detalhe imediatamente — só quando fizer sentido investir nesse detalhe (ex.: antes de começar a trabalhar nele, ou antes do sync).

## Regras de comportamento

1. **Anotação rápida** ("encontrei um bug X", "precisamos de fazer Y"): adiciona só uma linha na tabela do ficheiro índice correspondente. Não criar ficheiro de detalhe automaticamente, não chamar o Linear.

2. **Detalhamento** (quando pedido explicitamente, ex. "detalha o BUG-1"): criar/atualizar `details/{ID}.md` com descrição e AC.

3. **Atualização de estado** (ex. "marca o BUG-1 como resolvido"): atualizar o campo `Estado` tanto na tabela índice quanto no ficheiro de detalhe (se existir). Isto fica **local** — não sincronizar com o Linear automaticamente.

4. **Sync com o Linear** (só quando pedido explicitamente, ex. "sincroniza o backlog com o Linear"):
   - Ler os ficheiros índice e identificar itens com `Linear ID` vazio (`-`) → são novos, precisam de ser criados.
   - Identificar itens cujo `Estado` local diverge do estado atual no Linear → precisam de atualização.
   - Para criar um ticket novo: usar o ficheiro `details/{ID}.md` como corpo/descrição, se existir. Se não existir ficheiro de detalhe, avisar antes de criar o ticket só com o título, ou perguntar se deve prosseguir assim.
   - Após criar/atualizar no Linear, preencher o campo `Linear ID` na tabela índice com o ID real retornado.
   - Fazer apenas as chamadas necessárias (não relistar todo o backlog do Linear a cada sync, a menos que seja preciso reconciliar divergências).

5. **Nunca fazer sync automaticamente** após uma simples anotação ou atualização de estado local — o sync é sempre uma ação explícita e pontual.

## Por que este fluxo

- Anotações e edições locais em Markdown não geram chamadas MCP, logo custam muito menos tokens do que interagir com o Linear a cada pequena alteração.
- A separação índice/detalhe evita gastar tokens escrevendo descrição e AC completos para itens que ainda podem nem avançar.
- O sync pontual agrupa várias criações/atualizações numa única leva de chamadas, em vez de uma chamada por item.
