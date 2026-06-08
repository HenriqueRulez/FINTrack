# Relatório de Implementação — Fix: Botão aninhado no "Select All" de /transactions

**Bug Report:** `.claude/bug-reports/transactions-select-all-nested-button.md`
**Modo:** BUG-FIX (sem plano de SM)
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings/erros
**Migration:** N/A — sem alterações de banco

## Root Cause

`CheckBox` (`src/components/transactions/CheckBox.tsx`) renderizava sempre como
elemento raiz um `<button type="button" role="checkbox">`. Em
`src/components/transactions/FilterRow.tsx` (linhas 204-215), o controlo
"Select All" envolvia esse `<CheckBox>` dentro de um
`<button type="button" onClick={onToggleAll}>`. Resultado: `<button>` aninhado
dentro de `<button>` — HTML inválido — gerando o erro de hidratação React
"In HTML, `<button>` cannot be a descendant of `<button>`".

Nas restantes utilizações (`TxTable.tsx`, header e linhas), o `CheckBox` é o
próprio elemento clicável e não está aninhado em nenhum botão, pelo que esse
uso continuava correcto.

## Correcção

Mantém-se **um único elemento clicável** — o `<button>` exterior do "Select
All" — agora também portador da semântica de checkbox:

1. **`CheckBox.tsx`** — adicionada a prop opcional `interactive` (default
   `true`). Com `interactive={false}`, o componente renderiza um `<span>`
   visual-only (`aria-hidden`) em vez de um `<button>`, permitindo nesting
   dentro de outro elemento interactivo sem produzir HTML inválido. O markup do
   checkmark/traço foi extraído para um sub-componente `CheckMark` partilhado
   pelos dois modos, preservando exactamente o visual off/on/mixed. `onClick`
   passou a opcional (não é usado no modo não-interactivo).

2. **`FilterRow.tsx`** — o `<button onClick={onToggleAll}>` do "Select All"
   passou a:
   - usar `<CheckBox state={checkState} interactive={false} />` (sem botão
     interno);
   - assumir a semântica de checkbox: `role="checkbox"`,
     `aria-checked={mixed | on | off}`, `aria-label="Select all"`;
   - manter foco/anel de teclado (`focus-visible:ring-*`).

   Como `<button>` nativo, é focável por Tab e activável por Enter/Space; o
   `onClick` continua a chamar `onToggleAll` (select/deselect-all preservado).
   Os estados off/on/mixed continuam derivados de `checkState`
   (`allOnPageSelected`/`someSelected`), inalterados.

## Ficheiros Criados

- (nenhum)

## Ficheiros Modificados

- `src/components/transactions/CheckBox.tsx` — nova prop `interactive` (modo
  visual-only via `<span aria-hidden>`); `onClick` opcional; checkmark extraído
  para sub-componente `CheckMark`. Modo interactivo (`<button role="checkbox">`)
  inalterado para `TxTable.tsx`.
- `src/components/transactions/FilterRow.tsx` — "Select All" deixa de aninhar um
  `<button>`; `CheckBox` agora `interactive={false}`; o `<button>` exterior
  recebe `role="checkbox"`, `aria-checked`, `aria-label` e anel de foco.

## Critérios de Aceite

- [x] CA1 — Removido o `<button>` dentro de `<button>`; não há mais a causa do
      erro de hidratação React.
- [x] CA2 — "Select All" é um único elemento clicável e acessível
      (`<button role="checkbox">` nativo: focável por Tab, activável por
      Enter/Space).
- [x] CA3 — Comportamento select/deselect-all preservado (`onToggleAll`) e
      estados off/on/mixed mantidos (`checkState` + `aria-checked`).
- [x] CA4 — Nenhuma alteração ao botão "Delete" nem ao uso do `CheckBox` em
      `TxTable.tsx`; permanecem funcionais.

## Notas para o QA

- Verificar no console do browser, em `/transactions` em modo de edição, que os
  2 erros de hidratação "`<button>` cannot be a descendant of `<button>`"
  deixaram de aparecer.
- O `CheckBox` no header e nas linhas de `TxTable.tsx` continua a usar o modo
  interactivo (default), inalterado — confirmar que esses checkboxes continuam
  clicáveis individualmente.
- Acessibilidade do "Select All": testar foco por teclado (Tab) e activação por
  Enter e Space; o leitor de ecrã deve anunciar estado checked/mixed/unchecked
  via `aria-checked`.
