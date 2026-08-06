---

# Relatório Frontend — Import CSV (Trading212) em /transactions

**Especificação Visual:** `.claude/reports/design-csv-import.md`
**Working Item:** `.claude/working-items/csv-import.md`
**Typecheck:** ✅ Zero erros
**Lint:** ✅ Zero erros

## Ficheiros Criados

- `src/components/transactions/ImportModal.tsx` — modal de import CSV em 3 fases (seleção → dryRun → preview + commit), com tabela de preview densa, badges de estado e faixa de contadores clicável (filtro opcional).

## Ficheiros Modificados

- `src/components/transactions/TxPageHead.tsx` — botão "Import" deixa de ser stub: recebe `onImportClick: () => void` e passa a ter `onClick={onImportClick}` (mesmo padrão de `onAddClick`). Zero alteração visual.
- `src/components/transactions/TransactionsPage.tsx` — novo estado `importModalOpen`; monta `<ImportModal open onOpenChange onSuccess={loadTransactions} />` a par do `<TxModal>` existente; liga `onImportClick={() => setImportModalOpen(true)}` no `<TxPageHead>`.

## Componentes Implementados

- **ImportModal:** fluxo completo de 3 fases num único `Dialog` (`max-w-3xl`, `neon-border-primary`, consistente com `TxModal`):
  - **Fase 1 (seleção):** `<input type="file" accept=".csv">` com `aria-label`; validação client-side de extensão (`.csv`) e tamanho (~2MB) antes de qualquer submissão — mensagens inline `text-[var(--loss)]`. Ao escolher ficheiro válido, dispara automaticamente o dryRun (sem botão extra).
  - **Fase 2 (loading dryRun):** spinner custom (`animate-spin`, sem componente `Progress` — não existe no projeto) + texto de apoio. Footer ausente.
  - **Fase 3 (preview):** faixa de 4 contadores clicáveis (Novas/gain, Duplicadas/muted, Ignoradas/muted-70, Erros/loss) com `aria-live="polite"` e `aria-pressed` como filtro opcional da tabela; tabela de 9 colunas (Status, Data, Tipo, Ticker/Label, Qtd, Preço, Moeda, Total, Motivo) com `max-h-[420px] overflow-y-auto` interno, badges de estado reaproveitando a fórmula exacta de `TypeBadge.tsx`, linhas `duplicate`/`ignored` esbatidas (`opacity-70`), `error` não esbatida com Motivo em `text-[var(--loss)]`, truncagem `max-w-[220px]` + `title` no Motivo. Footer com "Cancelar" (ghost) + "Confirmar Importação" (`neon-primary`, label dinâmico `Importar N novas`, `disabled` quando `summary.new === 0`, com texto de apoio explicando o motivo).
  - **Erro de rede/validação:** bloco `role="alert"` idêntico ao `apiError` do `TxModal`, com botão "Tentar novamente" na fase 1 (reenvia o `csvText` já lido sem obrigar a reescolher o ficheiro) e inline na fase 3 durante o commit.
  - **Sucesso:** fecha o modal imediatamente e chama `onSuccess()` (→ `loadTransactions()` na `TransactionsPage`) — sem toast, sem ecrã intermédio.
  - **Reset:** todo o estado local (fase, ficheiro, csv, summary, rows, filtro, erros) é reposto sempre que `open` passa a `true` — reabrir começa sempre na fase 1.
  - **TODO para o Engineer:** o endpoint `POST /api/transactions/import` ainda não existe em runtime — o componente assume o contrato fixo do briefing (`{csv, dryRun}` → `{summary, rows}` no dryRun; `{inserted, duplicate, summary}` no commit). Tipos `ImportRow`/`ImportSummary` em `ImportModal.tsx` espelham esse contrato 1:1 e devem ser mantidos em sincronia se o contrato mudar.

## Notas para o SM e Engineer

- Nenhuma lógica de negócio foi tocada: `src/lib/import/**`, `src/app/api/**`, `supabase/migrations/**`, `src/types/database.ts` e `src/lib/validations/import.ts` não foram criados/alterados por este agente.
- O componente chama `fetch("/api/transactions/import", { method: "POST", body: JSON.stringify({ csv, dryRun }) })` diretamente — sem estado de auth/sessão gerido no cliente (a auth é responsabilidade do endpoint, como em `TxModal`).
- Estado a ligar pelo Engineer: nenhum — o contrato já é consumido inteiramente pelo `ImportModal`; basta o endpoint responder exatamente ao shape descrito nos tipos `ImportDryRunResponse`/`ImportCommitResponse` (privados ao ficheiro, mas espelhados nos tipos exportados `ImportRow`/`ImportSummary`).
- Tabela/tabs de `/transactions` não foram tocadas (cash/div já renderizavam corretamente, conforme validado no plano).
