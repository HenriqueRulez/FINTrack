# Bug Report — Botão aninhado em botão no "Select All" do modo de edição de /transactions

**Severidade:** MEDIUM
**Área:** `src/components/transactions/FilterRow.tsx` (controlo "Select All") + `src/components/transactions/CheckBox.tsx`
**Estado:** OPEN

## Comportamento Esperado

A página `/transactions` em modo de edição produz HTML válido, sem erros de hidratação React no console. O controlo "Select All" é um único elemento clicável e acessível (não há `<button>` aninhado dentro de outro `<button>`), mantendo o comportamento de seleccionar/desseleccionar todas as linhas e os estados off/on/mixed.

## Comportamento Actual

Em `src/components/transactions/FilterRow.tsx` (linhas 204-215), um `<button type="button" onClick={onToggleAll}>` envolve o componente `<CheckBox ... />`. O `CheckBox` (`src/components/transactions/CheckBox.tsx`, linhas 15-17) renderiza como elemento raiz um `<button type="button" role="checkbox">`. Isto produz um `<button>` aninhado dentro de outro `<button>` — HTML inválido — gerando o erro de hidratação React: "In HTML, `<button>` cannot be a descendant of `<button>`. This will cause a hydration error." O controlo "Select All" continua funcional visualmente, mas o DOM é inválido (2 erros de hidratação no console).

## Passos para Reproduzir

1. Abrir `/transactions` autenticado.
2. Activar o modo de edição (botão Edit).
3. Observar o console do browser → 2 erros de hidratação React sobre `<button>` descendente de `<button>`.

## Contexto Adicional

- Confirmado por leitura do código em 2026-06-08: `FilterRow.tsx:204` (`<button onClick={onToggleAll}>`) envolve `<CheckBox>` em `FilterRow.tsx:209`; `CheckBox.tsx:15-17` é a tag `<button role="checkbox">`.
- Sugestão de correcção (não vinculativa): trocar o `<button>` exterior por um `<div role="button">`/`<label>`, ou extrair o `CheckBox` para fora do botão, mantendo um único elemento clicável e acessível (tab focus + activação por teclado).
- Originado no CA-07 da feature transactions-redesign.

## Ficheiros Provavelmente Afectados

- `src/components/transactions/FilterRow.tsx`
- `src/components/transactions/CheckBox.tsx` (apenas se a correcção alterar a API/elemento do CheckBox)

## Critérios de Aceite para a Correcção

- [ ] CA1: Não ocorrem mais erros de hidratação React (`<button>` descendente de `<button>`) na página `/transactions` em modo de edição.
- [ ] CA2: A página `/transactions` em modo de edição produz HTML válido, com o "Select All" como um único elemento clicável e acessível.
- [ ] CA3: O "Select All" mantém o comportamento de seleccionar/desseleccionar todas as linhas e os estados off/on/mixed.
- [ ] CA4: Os restantes controlos do modo de edição (ex.: "Delete") continuam funcionais, sem novos erros no console.
