# Relatório Frontend — Tax Calculator

**Especificação Visual:** `.claude/reports/design-tax-calculator.md`
**Working Item:** `.claude/working-items/tax-calculator.md`
**Typecheck:** ✅ Zero erros (`tsc --noEmit` sem output)
**Lint:** ✅ Zero erros (`eslint src` sem output)

## Ficheiros Criados
- `src/app/(dashboard)/tax-calculator/page.tsx` — Server Component stub que monta `TaxCalculatorPage`; exporta `metadata.title`
- `src/components/tax-calculator/mock-data.ts` — tipos (`SaleEvent`, `DividendEvent`, `TaxTier`, `TaxSettings`, `CgRow`, `DivRow`, `CgView`, `TaxYear`), dados mock (`SAMPLE_EVENTS_2026`, `EMPTY_EVENTS`, `TAX_SETTINGS`) e matemática pura (`rateForHoldYears`, `fmtEUR`, `fmtDate`, `deriveCapitalGains`, `deriveDividendTax`)
- `src/components/tax-calculator/TaxCalculatorPage.tsx` — Client root; estado `useSampleData`/`cgView`/`year`; deriva `cg`/`div` via `useMemo`; aplica `rise`/`d1`–`d3`
- `src/components/tax-calculator/TaxPageHead.tsx` — h1 + help button (`cursor-help`, `hover:text-primary`, `title`) + `TaxYearChip` (`<select>` nativo estilizado como chip, inline)
- `src/components/tax-calculator/TaxKpiStrip.tsx` — 3 cartões fat em grid `1.4fr 1fr 1fr`; `neon-loss` no cartão 1 quando `totalTax > 0`; ícones `info`/`trendUp`/`coins`
- `src/components/tax-calculator/CapitalGainsPanel.tsx` — header + `SegSelector` (Aggregate/Detailed inline) + vista agregada (4 linhas dashed) + tabela detalhada (6 colunas) + estado vazio
- `src/components/tax-calculator/DividendTaxPanel.tsx` — header + badge `{X}% rate` + 3 linhas agregadas + tabela (4 colunas) + estado vazio
- `src/components/tax-calculator/TaxEmptyState.tsx` — componente `TaxEmptyState` parametrizável (icon + message) + ícones `EmptyTrendIcon`/`EmptyCoinsIcon` (48×48)
- `src/components/tax-calculator/TaxTweaksPanel.tsx` — FAB flutuante (padrão `TxTweaksPanel`); toggle "Show sample data" + segmented "Capital Gains view"; título "Tax Calculator · Tweaks"

## Ficheiros Modificados
- `src/components/layout/sidebar.tsx` — item "Tax Calculator" passou de `{ href: "#", active: false }` para `{ href: "/tax-calculator", active: true }`; agora renderiza como `<Link>` real e ganha o indicador teal activo na rota `/tax-calculator`. `TaxIcon` já existia — sem alteração de ícone.

## Componentes Implementados
- **mock-data.ts:** dados/matemática deterministas, `en-GB` em `fmtEUR` (requisito CA), sinal `−` U+2212. TODO assinalado para o Engineer trocar `SAMPLE_EVENTS_2026` e `TAX_SETTINGS` por dados reais na fase 2.
- **TaxCalculatorPage:** estado partilhado `cgView` liga o `SegSelector` do painel ao segmented do TweaksPanel (CA-08). `events` só é preenchido com `useSampleData && year === 2026` (D3). TODO: ligar a fonte de dados real.
- **TaxKpiStrip:** valor do cartão 1 mantém cor base `text-foreground` e só adiciona `neon-loss` (glow) quando `totalTax > 0` — fiel ao protótipo. Pluralização singular/plural correcta. Ícones gain/âmbar condicionais.
- **CapitalGainsPanel / DividendTaxPanel:** `min-h-[340px]` igual; cores semânticas `--gain`/`--loss`/neutro; tabelas em `overflow-x-auto`; última linha da tabela sem borda via `[&:last-child>td]:border-b-0`.
- **TaxTweaksPanel:** reimplementa `Toggle` local (padrão `role="switch"` do `TxTweaksPanel`); FAB com `aria-expanded`.

## Notas para o SM e Engineer
- **Sem API nesta fase.** Toda a página é client-side com dados mock. Pontos a ligar na fase 2 (marcados como `TODO` no código):
  - `src/components/tax-calculator/mock-data.ts`: `SAMPLE_EVENTS_2026` → vendas realizadas + dividendos reais do utilizador; `TAX_SETTINGS` → `settings.tax` persistido.
  - `TaxCalculatorPage.tsx`: a derivação `events` (hoje `useSampleData && year === 2026`) deve passar a consultar dados reais por ano fiscal.
- **Estado partilhado `cgView`** vive na `TaxCalculatorPage` e é passado tanto ao painel como ao TweaksPanel — não duplicar fonte de estado ao ligar lógica real.
- **Help icon e modal Settings "Tax Rate"** estão out-of-scope (apenas `title`/`aria-label`); o Engineer não precisa de ligar tooltip nem persistência de settings nesta fase.
- **Responsividade:** usei arbitrary breakpoints `max-[1100px]:` e `max-[700px]:` para igualar o protótipo (KPI strip 3→2→1 col com cartão 1 em `col-span-2` em ≤1100px; panel grid 2→1 col em ≤1100px). A sidebar colapsa em `<768px` (`hidden md:flex`, já no layout).

## Verificação
- `npm run typecheck` → `tsc --noEmit` terminou sem qualquer erro (output apenas o banner do script).
- `npm run lint` → `eslint src` terminou sem qualquer warning/erro.
