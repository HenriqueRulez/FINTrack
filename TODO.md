# FINTrack — Tarefas

## Tasks Simples
> Claude executa diretamente — pequenas alterações de UI, texto, estilo, correções pontuais.

- [ ] Exemplo: trocar texto na sidebar


## Features
> Pipeline completo: PO → SM → Engineer → QA. Para funcionalidades com lógica de negócio.

- [ ] Exemplo: Dashboard com patrimônio total real


## Bugs
> Pipeline: Bug Reporter → Engineer → QA. Para comportamentos incorretos encontrados em testes manuais.
> Formato obrigatório de cada item:
> ```
> - [ ] **[BUG]** Descrição curta do problema
>   - **Expected:** o que deveria acontecer
>   - **Actual:** o que está acontecendo
>   - **Reproduce:** passos para reproduzir
>   - **Severity:** critical / high / medium / low
> ```

- [ ] **[BUG]** Exemplo: preço atual não atualiza ao recarregar a página
  - **Expected:** preço refrescado após cache de 15 min expirar
  - **Actual:** coluna mostra sempre "—"
  - **Reproduce:** adicionar posição → esperar 15 min → recarregar página
  - **Severity:** high


## Concluídas
- [x] Nome automático via Yahoo Finance ao adicionar posição
- [x] Preço atual com cache de 15 minutos (banco + memória)
- [x] Colunas "Preço Atual" e "Total Gasto" na tabela de portfólio
