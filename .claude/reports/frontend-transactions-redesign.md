# Frontend Report — transactions-redesign

**Status:** CONCLUÍDO
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero warnings

## Ficheiros Criados

- `src/components/transactions/mock-data.ts` — 13 transacções mock + tipos TS + funções `fmt` / `fmtDate`
- `src/components/transactions/TypeBadge.tsx` — badge inline com 6 variantes semânticas (buy/sell/cash/conv/div/int)
- `src/components/transactions/CheckBox.tsx` — checkbox custom com estados off/on/mixed; ícone checkmark e traço horizontal via style inline
- `src/components/transactions/EmptyState.tsx` — estado vazio com ícone SVG e mensagem de sugestão
- `src/components/transactions/FilterRow.tsx` — 4 chips de filtro (date from/to, ticker text, type select) + botões Edit/Select All/Delete em edit mode
- `src/components/transactions/TypeTabs.tsx` — grid 6 tabs (3 cols em < md) com badges de contagem e underline neon teal activo
- `src/components/transactions/TxTable.tsx` — tabela ordenável com 8 colunas, density classes, cor semântica no Total, checkboxes em edit mode
- `src/components/transactions/TxFooter.tsx` — rodapé com contador de transacções, indicador de seleccionados e selector de page size
- `src/components/transactions/TxTweaksPanel.tsx` — painel flutuante fixed bottom-right com segmented density control e toggles FX/fees
- `src/components/transactions/TxPageHead.tsx` — título + botões Help/Import/Add Manually (stubs visuais)
- `src/components/transactions/TxCard.tsx` — card wrapper que compõe FilterRow → TypeTabs → TxTable/EmptyState → TxFooter
- `src/components/transactions/TransactionsPage.tsx` — componente raiz com todo o estado global, filtros combinados (AND lógico), contagem por tab, sort e paginação
- `src/app/(dashboard)/transactions/page.tsx` — Server Component stub que monta TransactionsPage

## Ficheiros Modificados

- `src/components/layout/sidebar.tsx` — item "Transactions" activado (`href: "/transactions"`, `active: true`) com badge de contagem hardcoded `13`

## Notas de implementação

### Padrões reutilizados
- `useAnimations()` hook para controlo de `rise dN` em TxPageHead (d1) e TxCard (d2), consistente com Holdings e Performance
- Padrão de ShowSoldToggle (toggle switch) reutilizado no TxTweaksPanel para os toggles FX e fees
- Padrão de SortArrow e `handleSort` (toggle asc/desc) idêntico ao HoldingsPage/HoldingsTable
- Server Component stub → Client Component root (mesmo padrão de holdings/page.tsx → HoldingsPage)

### Decisões técnicas
- `activeTabDef` derivado do `activeTab` no render e incluído nas deps do `useMemo` de `filtered`, evitando o eslint-disable
- TypeBadge CONV/DIV/INT usam `style` inline para `background` e `borderColor` com rgba hardcoded — Tailwind não resolve dinâmicos arbitrários com rgba()
- CheckBox estados off/on/mixed implementados com style inline para o checkmark (rotate + translate) e traço horizontal, mantendo zero CSS externo
- Tab activa usa `<span>` absoluto como underline neon em vez de `::after` CSS puro — Next.js/Tailwind não suporta pseudo-elementos inline
- TypeTabs responsive: `grid-cols-3 md:grid-cols-6` — colapsa naturalmente sem media queries manuais
- FilterRow responsive: `flex-wrap` no container (sem `flex-col` explícito) — os chips "caem" para linha seguinte quando o espaço é insuficiente
- `passGlobalFilters` considera o campo `label` no filtro de ticker para transacções CASH/INT sem ticker real
- `handleToggleAll` usa callback funcional para evitar stale closure sobre `paged`
- Delete (demo): `alert()` sem mutação real do array mock — conforme D9 do working item
