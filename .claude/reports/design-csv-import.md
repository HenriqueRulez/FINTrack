# Especificação Visual — Import CSV (Trading212) em /transactions

**Working Item:** `.claude/working-items/csv-import.md`
**DESIGN.md:** consultado ✅

## Resumo Visual

O `ImportModal` estende o padrão visual já estabelecido pelo `TxModal` (mesmo `Dialog`, mesma card `bg-card` com `neon-border-primary`), mas em vez de um formulário é um fluxo em três fases dentro do mesmo diálogo: escolher ficheiro → rever preview → confirmar. A pré-visualização é uma tabela densa, no mesmo idioma visual da `TxTable` (mesmas classes de header, mesmo `tabular-nums`), com uma barra de contadores por estado no topo que funciona como resumo executivo antes de qualquer gravação. A cor comunica risco: **Nova** usa a semântica de ganho/teal (ação positiva, será gravada), **Duplicada** é neutra (informativa, sem ação), **Ignorada** é apagada/muted (fora do âmbito), **Erro** usa a semântica de perda (vermelho, precisa de atenção). Nenhuma decoração — o utilizador só vê números e estados até decidir confirmar.

## Componentes a Criar

### ImportModal

- **Localização:** `src/components/transactions/ImportModal.tsx`
- **Tipo:** Client Component (`"use client"`)
- **Layout:** `Dialog` / `DialogContent` largo (`max-w-3xl`, mais largo que o `TxModal` porque tem tabela — o `max-w-md` do `TxModal` não comporta 8 colunas). Estrutura vertical: `DialogHeader` com título → corpo variável por fase → `DialogFooter` com ações. O corpo da fase de preview tem uma faixa de contadores (`flex` horizontal, 4 blocos) seguida da tabela em contentor com `max-h-[420px] overflow-y-auto` (scroll interno — o modal não deve crescer com o ecrã, fixture real tem 56 linhas).
- **Tokens CSS:** `bg-card`, `border-border/50`, `text-foreground`, `text-muted-foreground`, `bg-background` (dropzone/input), `border-input`
- **Classes neon:** `neon-border-primary` no `DialogContent` (consistência com `TxModal`); `neon-primary` no botão de confirmação (mesmo padrão do botão de submit do `TxModal`)
- **shadcn/ui:** `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `Button`, `Label`. Não existe `Table`, `Badge`, `Alert` nem `Progress` em `src/components/ui/` — a tabela de preview e os badges de estado seguem o padrão **custom HTML** já usado em `TxTable.tsx`/`TypeBadge.tsx` (não inventar componentes shadcn inexistentes).
- **Estados visuais:** ver secção "Estados e Feedback Visual" abaixo (idle/seleção, loading dryRun, preview, loading commit, sucesso, erro).
- **Comportamento:**
  - Fase 1 (seleção): `<input type="file" accept=".csv">` estilizado como o resto dos inputs (`bg-background border-input`); rejeita client-side qualquer ficheiro cuja extensão não seja `.csv` (mensagem inline, sem submissão possível — CA1).
  - Ao seleccionar um ficheiro válido, dispara automaticamente o dryRun (sem botão extra "Analisar" — reduz um clique) e mostra loading.
  - Fase 3 (preview): contadores clicáveis funcionam como filtro da tabela abaixo (toggle de estado — ex. clicar em "Erros" mostra só as linhas de erro). Este filtro é opcional/nice-to-have visual, não um CA — se o Frontend achar complexidade desnecessária, os contadores podem ser apenas informativos (sem interacção). Não é um requisito bloqueante.
  - Footer da fase de preview: botão secundário "Cancelar" (ghost, fecha sem gravar) + botão primário "Confirmar Importação" com `neon-primary`, **desabilitado se `summary.new === 0`** (nada para gravar) e com contagem no próprio label (ex. "Importar 56 novas").
  - Ao confirmar, botão primário entra em loading (`disabled`, label muda), sem re-render da tabela por baixo.
  - Sucesso: modal fecha imediatamente e a `TransactionsPage` recarrega via `loadTransactions()` (padrão idêntico ao `onSuccess` do `TxModal` — sem toast, sem ecrã de sucesso intermédio, consistente com o resto da app que já não usa modais de sucesso).
  - Fechar o modal em qualquer fase (botão X do `Dialog`, "Cancelar", clique fora) descarta o estado local — reabrir começa sempre na fase 1.

## Componentes a Modificar

### TxPageHead

- **Localização:** `src/components/transactions/TxPageHead.tsx`
- **Alteração:** o botão "Import" (linha 92-99) deixa de ser stub — recebe um novo prop `onImportClick: () => void` e passa a ter `onClick={onImportClick}`, tal como o botão "Add Manually" já tem `onClick={onAddClick}`. Nenhuma alteração visual ao botão em si (mesmas classes: `border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60`, ícone `UploadIcon` já existente).
- **Impacto visual:** nenhum — o botão já está desenhado correctamente, só passa a ter comportamento.

### TransactionsPage

- **Localização:** `src/components/transactions/TransactionsPage.tsx`
- **Alteração:** adicionar estado `importModalOpen` (mesmo padrão de `modalOpen` para o `TxModal`) e montar `<ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} onSuccess={loadTransactions} />` a par do `<TxModal>` existente (linha ~398). Ligar `onImportClick={() => setImportModalOpen(true)}` no `<TxPageHead>`.
- **Impacto visual:** nenhum na página em si — só passa a existir um segundo modal acessível pelo botão Import, que já estava desenhado mas inerte.

## Hierarquia Visual da Página

O `ImportModal` é um overlay sobre `/transactions` (mesmo padrão do `TxModal`: fundo escurecido, diálogo centrado). Dentro do diálogo, do topo para baixo:

1. **Título** (`DialogTitle`, `text-lg font-medium`) — muda por fase: "Importar transacções" (fase 1) → "Pré-visualização" (fase 3).
2. **Corpo da fase 1**: zona de escolha de ficheiro, centrada, com texto de apoio (`text-xs text-muted-foreground`) indicando "Apenas ficheiros .csv do Trading212".
3. **Corpo da fase 3, topo**: faixa de 4 contadores lado a lado — este é o elemento de maior destaque da fase de preview porque é o resumo que o utilizador usa para decidir se confirma ou cancela. Ordem: Novas, Duplicadas, Ignoradas, Erros (ordem de severidade crescente para a esquerda→direita, à semelhança da leitura ocidental: o que importa gravar primeiro).
4. **Corpo da fase 3, abaixo**: tabela de linhas, densidade `compact` (mais colunas que a `TxTable`, cabe mais informação por página visível), com scroll interno.
5. **Footer**: acções secundária (Cancelar) à esquerda/ghost, primária (Confirmar) à direita com destaque neon — mesma hierarquia do `TxModal` (`DialogFooter` já ordena assim por defeito nos componentes shadcn usados no projecto).

O maior destaque visual é sempre o **contador "Novas"** (cor gain/teal, é a métrica que confirma que a importação vai fazer o que o utilizador espera) e o **botão de confirmação** (neon-primary). Erros têm destaque secundário mas claro (vermelho) — não competem com "Novas" em tamanho, mas são inequivocamente identificáveis por cor na faixa de contadores e na tabela.

## Tokens e Classes Utilizados

| Elemento                          | Token/Classe                                                              | Motivo                                                             |
| ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Fundo do modal                     | `bg-card border-border/50 neon-border-primary`                             | Idêntico ao `TxModal` — consistência entre os dois modais da página |
| Largura do modal                   | `max-w-3xl`                                                                | Precisa de espaço para 8 colunas de preview; `max-md` do TxModal é insuficiente |
| Input de ficheiro                  | `bg-background border-input text-sm`                                       | Mesmo padrão dos `Input` do `TxModal`                               |
| Contador "Novas"                   | `text-[var(--gain)]` + valor em `text-2xl font-semibold tabular-nums`      | Semântica de ganho — ação positiva que será gravada                 |
| Contador "Duplicadas"               | `text-muted-foreground`                                                    | Neutro — informativo, sem ação nem risco                            |
| Contador "Ignoradas"                | `text-muted-foreground/70`                                                 | Apagado — fora do âmbito, ainda menos relevante que duplicadas      |
| Contador "Erros"                   | `text-[var(--loss)]`                                                       | Semântica de perda — precisa de atenção do utilizador                |
| Badge de estado "new" na tabela    | `bg-[var(--gain)]/12 text-[var(--gain)] border border-[var(--gain)]/40`    | Mesma fórmula do badge `buy` em `TypeBadge.tsx` — reutiliza o padrão exacto |
| Badge de estado "duplicate"        | `bg-muted text-muted-foreground border border-border/70`                   | Mesma fórmula do badge `cash` em `TypeBadge.tsx` — neutro            |
| Badge de estado "ignored"          | `bg-muted/50 text-muted-foreground/70 border border-border/40`             | Variante ainda mais apagada — fora do âmbito, sem ser erro            |
| Badge de estado "error"            | `bg-[var(--loss)]/12 text-[var(--loss)] border border-[var(--loss)]/40`    | Mesma fórmula do badge `sell` em `TypeBadge.tsx` — reutiliza o padrão exacto |
| Header da tabela de preview        | `text-[10px] font-medium uppercase tracking-wide text-muted-foreground border-b border-border/40` | Idêntico ao header da `TxTable`                        |
| Linhas da tabela de preview        | `border-b border-border/40 text-xs` (density compact)                      | Mesma fórmula de `getDensityClasses("compact")` em `TxTable.tsx`     |
| Hover de linha                     | `hover:bg-muted/40`                                                        | Idêntico à `TxTable`                                                 |
| Colunas numéricas (qty/price/total)| `text-right tabular-nums`                                                  | Regra do `DESIGN.md` para alinhamento de dados financeiros           |
| Coluna "Motivo" (reason)           | `text-xs text-muted-foreground` truncado com `title` (tooltip nativo)      | Texto de erro pode ser longo — não deve quebrar o layout da tabela   |
| Botão "Confirmar Importação"       | `bg-primary text-primary-foreground neon-primary`                          | Mesmo padrão do botão de submit do `TxModal`                         |
| Botão "Cancelar"                   | `variant="ghost"`                                                           | Mesmo padrão do botão Cancel do `TxModal`                            |
| Mensagem de erro de rede/validação | `border border-[var(--loss)]/40 bg-[var(--loss)]/10 text-[var(--loss)] text-sm rounded-md px-3 py-2` | Bloco `apiError` já existente e idêntico no `TxModal` (linha 424-431) |

## Estados e Feedback Visual

| Estado                                        | Comportamento Visual                                                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fase 1 — nenhum ficheiro escolhido             | Input de ficheiro vazio, texto de apoio `text-xs text-muted-foreground` explicando o formato aceite. Botão de confirmação do footer nem existe nesta fase (fase 1 não tem footer de acção — a selecção do ficheiro já dispara o fluxo). |
| Fase 1 — ficheiro inválido (extensão errada)   | Mensagem inline abaixo do input, mesmo padrão dos erros de campo do `TxModal`: `text-xs text-[var(--loss)]`. Ficheiro não é aceite, dryRun não dispara.                                          |
| Fase 2 — loading do dryRun                     | Corpo do modal mostra um estado de carregamento centrado: spinner simples (`animate-spin`, sem componente `Progress` — não existe no projecto) + texto `text-sm text-muted-foreground` ("A analisar ficheiro…"). Footer some (nada a confirmar ainda). |
| Fase 3 — preview carregado                     | Faixa de 4 contadores + tabela, conforme secção "Hierarquia Visual". Footer aparece com Cancelar + Confirmar.                                                                                    |
| Fase 3 — linha `new`                            | Badge teal/gain "NOVA"; colunas normais (`text-foreground` para valores, `tabular-nums` à direita).                                                                                               |
| Fase 3 — linha `duplicate`                      | Badge neutro "DUPLICADA"; linha ligeiramente esbatida (`opacity-70` na `<tr>`) para reforçar visualmente que não terá efeito.                                                                    |
| Fase 3 — linha `ignored`                        | Badge muted "IGNORADA"; coluna "Motivo" preenchida (ex. "Withdrawal não suportado"); linha esbatida (`opacity-70`).                                                                              |
| Fase 3 — linha `error`                          | Badge vermelho "ERRO"; coluna "Motivo" em `text-[var(--loss)]` (ex. "Moeda não suportada: CHF"); linha **não** esbatida — erro deve manter-se visível/legível, ao contrário de duplicate/ignored. |
| Fase 3 — `summary.new === 0`                    | Botão "Confirmar Importação" `disabled`, com `title`/texto de apoio abaixo explicando "Nada para importar — todas as linhas são duplicadas, ignoradas ou inválidas".                             |
| Fase 4 — loading do commit                      | Botão "Confirmar Importação" muda label para "A importar…", fica `disabled`; tabela por baixo permanece visível mas não interactiva (sem overlay extra — evita duplicar padrões de loading).     |
| Fase 5 — sucesso                                | Modal fecha imediatamente (`onOpenChange(false)`), `TransactionsPage` chama `loadTransactions()` e a tabela principal reflecte as novas linhas nas tabs correctas (All/Buy-Sell/Cash/Dividend). Sem toast, sem ecrã de sucesso — consistente com o resto da app. |
| Fase 6 — erro de rede/validação (dryRun ou commit) | Bloco de erro inline no corpo do modal, mesmo padrão do `apiError` do `TxModal` (`role="alert"`, borda e fundo `--loss` a 40%/10%). Modal permanece aberto, utilizador pode tentar novamente sem perder o ficheiro escolhido. |
| Ficheiro > ~2MB                                | Mesma trilha do erro de validação (CA da NFR) — mensagem clara antes de qualquer submissão à API, idealmente detectada client-side (`file.size`) para feedback imediato sem round-trip.          |

## Notas para o Frontend

- **Largura do modal**: usar `max-w-3xl` (não o `max-w-md` do `TxModal`) — com 8 colunas (Status, Data, Tipo, Ticker/Label, Qtd, Preço, Moeda, Total) + coluna de Motivo, `max-w-md` corta a tabela. Confirmar em ecrã de 1280px que a tabela não força scroll horizontal do `Dialog` inteiro — o scroll deve ficar contido no wrapper da tabela (`overflow-x-auto` como na `TxTable`), nunca no `Dialog` em si.
- **Scroll vertical interno**: a fixture real tem 56 linhas — sem `max-h` + `overflow-y-auto` no contentor da tabela, o modal cresce acima do viewport. Aplicar `max-h-[420px] overflow-y-auto` (ou equivalente) só no contentor da tabela, mantendo o header de contadores e o footer sempre visíveis (sticky fora do scroll).
- **z-index**: o `Dialog` do shadcn já trata disto via portal — não é necessário z-index manual, mas confirmar que não há conflito com o `TxTweaksPanel` (painel flutuante da página) que também usa posicionamento fixo.
- **Coluna Tipo na tabela de preview**: usar o mesmo mapeamento visual do `TypeBadge` existente sempre que `row.type` não for `null` (buy/sell/cash/div já têm cor definida em `TypeBadge.tsx` — reaproveitar, não recriar); quando `row.type === null` (linha ignorada/erro sem tipo mapeável), mostrar apenas "—" em `text-muted-foreground`.
- **Coluna Ticker/Label**: quando `row.ticker` for `null` mas `row.label` existir (ex. Deposit), mostrar o `label` — mesmo padrão de `displayTicker` já implementado em `TxTable.tsx` (linhas 249-252).
- **Acessibilidade**: `aria-live="polite"` na faixa de contadores para leitores de ecrã anunciarem a contagem quando o preview carrega; `role="alert"` no bloco de erro (já é o padrão do `TxModal`); `<input type="file">` deve ter `aria-label="Ficheiro CSV"` e `accept=".csv"` (nota: `accept` é apenas sugestão do browser, a validação real de extensão/conteúdo é responsabilidade do parser server-side — CA1 exige rejeição client-side como primeira barreira, não a única).
- **Responsividade**: a app é uso pessoal/desktop-first (confirmado pelo padrão dos restantes componentes de `/transactions`, que não têm breakpoints mobile). Não é necessário especificar um layout mobile dedicado para este modal.
- **Truncagem do Motivo**: mensagens de erro/ignorado podem ser longas (ex. "Moeda não suportada: CHF" vs. um motivo de campo em falta mais descritivo). Truncar com `truncate max-w-[220px]` e usar `title={row.reason}` para tooltip nativo no hover — evita que uma linha rebente o layout da tabela.
