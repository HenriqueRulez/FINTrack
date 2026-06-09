# Especificação Visual — Reformular página de Holdings (Fase 1)

**Working Item:** `.claude/working-items/reformular-pagina-holdings.md`
**DESIGN.md:** consultado ✅

---

## Resumo Visual

A página `/holdings` recebe um delta cirúrgico sobre o layout existente: a célula Company é expandida para acomodar um ícone placeholder local + linha `TICKER | EXCHANGE` em substituição ao quadrado de 2 letras; é inserida uma coluna "Type" com badge colorido por classe de ativo; o label "Cost Basis" passa a "Total Invested"; e o header do card recebe o botão "+ Add position" que abre um modal de input visual. Tudo o que funciona hoje — KPIs, currency selector, barra de alocação, GainLossCell — mantém-se intacto.

---

## Componentes a Criar

### CompanyCell

- **Localização:** `src/components/holdings/CompanyCell.tsx`
- **Tipo:** Client Component (usa props inline, sem estado próprio)
- **Layout:** `flex items-center gap-3 min-w-[280px]` — ícone à esquerda, pill à direita (igual ao `AllocPill` atual, mas pill interno reformulado)
- **Ícone placeholder:** `div` 32×32, `rounded-md`, `bg-muted border border-border/50`, texto centrado com a 1ª letra do ticker em `text-[11px] font-bold text-muted-foreground`. Não carrega imagem externa — é sempre este placeholder em Fase 1.
- **Pill interno (dentro da barra de alocação):** substitui o bloco ticker + name atual. Passa a ter duas linhas:
  - Linha 1: `<span className="text-sm font-semibold tracking-wide leading-none">{ticker}</span>` seguido de `<span className="text-[10px] text-muted-foreground ml-1.5">| {exchange}</span>` — tudo na mesma linha, separador `|` com `text-muted-foreground/60`
  - Linha 2: `<span className="text-xs text-muted-foreground truncate max-w-[200px]">{name}</span>`
- **Tokens CSS:** `bg-muted`, `border-border/50`, `text-muted-foreground`, `text-foreground`, variável `--bar-color` herdada do chartVar (igual ao AllocPill existente)
- **Classes neon:** nenhuma — esta célula não é acento visual
- **shadcn/ui:** nenhum
- **Estados visuais:**
  - Posição `sold`: célula inteira com `opacity-[0.55]` (já herdado da `<tr>` pai — sem necessidade de tratamento extra)
  - Hover: herdado da linha da tabela (`hover:bg-muted/40` na `<tr>`)
- **Comportamento:** estático; sem clique, sem tooltip nesta fase
- **Nota de substituição:** este componente substitui o `AllocPill` na coluna Company da `HoldingsTable`. O `AllocPill.tsx` existente pode ser mantido em disco mas deixa de ser referenciado pela tabela.

---

### TypeBadge

- **Localização:** `src/components/holdings/TypeBadge.tsx`
- **Tipo:** Client Component (função pura sem estado)
- **Layout:** `inline-flex items-center` — badge compacto alinhado ao centro da célula
- **Mapeamento de rótulo:** `Stocks → Stock`, `ETFs → ETF`, `Crypto → Crypto`, `Other → Other`
- **Mapeamento de cor (do DESIGN.md — Badges por tipo de ativo):**

  | assetClass | bg                  | text            |
  |------------|---------------------|-----------------|
  | Stocks     | `bg-chart-1/15`     | `text-chart-1`  |
  | ETFs       | `bg-chart-2/15`     | `text-chart-2`  |
  | Crypto     | `bg-chart-4/15`     | `text-chart-4`  |
  | Other      | `bg-chart-5/15`     | `text-chart-5`  |

  Nota: O DESIGN.md define `chart-1` para Stocks (teal), `chart-2` para ETFs (violeta), `chart-4` para Crypto (rosa), `chart-5` para Outros (azul céu). Alinhado exactamente.

- **Classe base do badge:** `text-[10px] font-medium px-2 py-0.5 rounded-sm uppercase tracking-wide whitespace-nowrap`
- **Tokens CSS:** variáveis `--chart-1` a `--chart-5` via classes Tailwind
- **Classes neon:** nenhuma
- **shadcn/ui:** nenhum
- **Estados visuais:** sem estados interactivos; herda opacidade da linha `sold`
- **Comportamento:** puramente declarativo

---

### AddPositionModal

- **Localização:** `src/components/holdings/AddPositionModal.tsx`
- **Tipo:** Client Component (`"use client"`, gerencia estado `open` internamente ou recebe `open`/`onOpenChange` via props)
- **Layout do modal:** `Dialog` do shadcn/ui — `DialogContent` com `max-w-md`, padding `p-6`, fundo `bg-card`, `border-border/50`. Título `DialogTitle` com "Add position" em `text-lg font-medium`.
- **Grid de campos:** `grid grid-cols-2 gap-4` para organizar os 6 campos em 3 linhas de 2 colunas:
  - Linha 1: Ticker (col 1) | Exchange / Market (col 2)
  - Linha 2: Type (col 1) | Currency (col 2)
  - Linha 3: Shares (col 1) | Price paid (col 2)
- **Especificação de cada campo:**

  | Campo    | Tipo de input | Label EN | Placeholder | Largura | Nota |
  |----------|---------------|----------|-------------|---------|------|
  | Ticker   | `Input` text  | "Ticker" | "e.g. AAPL" | col 1   | uppercase visual (CSS `text-transform: uppercase`) |
  | Exchange | `Input` text  | "Market / Exchange" | "e.g. NASDAQ" | col 2 | — |
  | Type     | `Select`      | "Type"   | "Select type" | col 1 | Opções: Stock / ETF / Crypto / Other |
  | Currency | `Select`      | "Currency" | —         | col 2   | Opções: EUR / USD; valor por defeito = EUR (pré-seleccionado ao abrir) |
  | Shares   | `Input` number | "Shares" | "0.00"     | col 1   | `tabular-nums`, step="any" |
  | Price paid | `Input` number | "Price paid" | "0.00" | col 2 | `tabular-nums`, step="any" |

- **Estilos dos campos:** `Label` em `text-xs text-muted-foreground uppercase tracking-wide mb-1`. `Input` com `bg-background border-input text-sm` (padrão shadcn). `Select` com mesmo estilo.
- **Tokens CSS:** `bg-card`, `bg-background`, `border-border/50`, `border-input`, `text-muted-foreground`, `text-primary` (ring de foco)
- **Classes neon:** `neon-border-primary` aplicado ao `DialogContent` — um glow teal muito sutil no contorno do modal (consistente com padrão de cards em destaque do DESIGN.md)
- **shadcn/ui:** `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `Input`, `Label`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Button`
- **Rodapé do modal (`DialogFooter`):** dois botões alinhados à direita:
  - "Cancel" — `variant="ghost"` — fecha o modal sem alterar nada
  - "Add position" — `variant="default"` (teal primário) — fecha o modal sem alterar nada (mock); sem spinner, sem feedback de sucesso nesta fase
- **Estados visuais:**
  - Campo em foco: `ring-1 ring-ring` (padrão shadcn — teal)
  - Nenhuma validação de erro visual nesta fase (campos são visuais/mock)
  - Modal fechado: sem overlay residual
- **Comportamento:** abrir via prop `open`; fechar por "Cancel", pelo "Add position" ou pelo X nativo do `DialogContent`. Nenhuma alteração na tabela ao fechar.

---

## Componentes a Modificar

### HoldingsTable

- **Localização:** `src/components/holdings/HoldingsTable.tsx`
- **Alterações:**
  1. Array `COLUMNS`: substituir `{ label: "Cost Basis", col: "cost", align: "right" }` por `{ label: "Total Invested", col: "cost", align: "right" }` — apenas o label muda.
  2. Inserir coluna "Type" na posição 2 (após Company, antes de Portfolio%): `{ label: "Type", col: "type", align: "left" }`. Como "type" não é sortable nesta fase, o botão de sort pode ser omitido ou renderizar `↕` sempre inactivo.
  3. Na célula Company: substituir `<AllocPill holding={row} pct={row.pct} variant="fill" />` por `<CompanyCell holding={row} pct={row.pct} />`.
  4. Adicionar célula `<td>` correspondente à coluna Type que renderiza `<TypeBadge assetClass={row.assetClass} />`.
  5. Actualizar `caption` de `"Posições do portfólio"` para `"Holdings positions"` (idioma EN).
- **Impacto visual:** a tabela passa de 8 para 9 colunas; a célula Company exibe ícone + ticker | exchange + name; nova coluna Type com badge colorido entre Company e Portfolio%.

### mock-data.ts

- **Localização:** `src/components/holdings/mock-data.ts`
- **Alteração:** adicionar campo `exchange: string` à interface `HoldingItem` e populá-lo em cada entrada do array `HOLDINGS`:

  | ticker | exchange sugerido |
  |--------|-------------------|
  | AMAT   | NASDAQ            |
  | VWCE   | XETRA             |
  | CSPX   | LSE               |
  | AAPL   | NASDAQ            |
  | MSFT   | NASDAQ            |
  | BTC    | CRYPTO            |
  | TSLA   | NASDAQ            |
  | GLD    | NYSE ARCA         |

- **Impacto visual:** cada linha da tabela passa a mostrar o exchange correcto na célula Company; nenhuma linha exibe "undefined".

### HoldingsCard

- **Localização:** `src/components/holdings/HoldingsCard.tsx`
- **Alteração:** adicionar o botão "+ Add position" no header do card, à direita dos controlos existentes (após o CurrencySelector), e montar o `<AddPositionModal>` condicionado a estado local `addOpen` / `setAddOpen`.
- **Especificação do botão:**
  - `<Button variant="default" size="sm" className="h-7 text-xs gap-1.5">` com ícone `+` (caractere literal ou SVG 12×12 simples) seguido do label "+ Add position"
  - Posição: último item no `flex items-center gap-3` do header, após o CurrencySelector
  - No hover: efeito `neon-primary` sutil (conforme DESIGN.md — botão primário no hover)
- **Impacto visual:** o header do card passa a ter um botão teal destacado à direita dos controlos; ao clicar abre o modal.

---

## Hierarquia Visual da Página

Do topo para baixo:

1. **PageHead** (sem alteração): título "Holdings" em `text-2xl font-medium` + meta row com neon-dot + contagem activa/fechada. Mantém-se exactamente como está.

2. **KpiStrip** (sem alteração): 7 células em grid único `bg-card`. O maior destaque visual da secção de métricas. Sem qualquer modificação.

3. **HoldingsCard** — área de maior densidade de informação:
   - Header: título "Holdings" à esquerda; à direita, da esquerda para a direita: ícone Refresh (ghost), toggle "Show sold", selector EUR/USD/Native, botão "+ Add position" (primário teal — único elemento com peso visual forte no header).
   - Tabela: 9 colunas, scroll horizontal quando necessário. Ordem das colunas:

     | # | Coluna         | Alinhamento | Ordenável |
     |---|----------------|-------------|-----------|
     | 1 | Company        | esquerda    | sim (ticker) |
     | 2 | Type           | esquerda    | não (fase 1) |
     | 3 | Portfolio%     | direita     | sim       |
     | 4 | Shares         | direita     | sim       |
     | 5 | Avg Cost       | direita     | sim       |
     | 6 | Total Invested | direita     | sim       |
     | 7 | Current Price  | direita     | sim       |
     | 8 | Market Value   | direita     | sim       |
     | 9 | Total Gain/Loss| direita     | sim       |

   - Hierarquia dentro de cada linha: Company (largura dominante, ~280px min) é o elemento de ancoragem; Type badge (compacto, ~56px) indica categoria imediatamente a seguir; os valores numéricos seguem alinhados à direita; Gain/Loss (última coluna, `pr-5`) recebe destaque semântico via cores `--gain`/`--loss`.
   - Linhas `sold`: `opacity-[0.55]` — indicador passivo, sem badge "SOLD" adicional (mantido como hoje).

---

## Tokens e Classes Utilizados

| Elemento                   | Token/Classe                             | Motivo                                                    |
|----------------------------|------------------------------------------|-----------------------------------------------------------|
| Ícone placeholder Company  | `bg-muted border-border/50 text-muted-foreground` | Neutro — não compete com a barra de alocação colorida |
| Separador ticker/exchange  | `text-muted-foreground/60`               | Exchange é metadado, não dado primário                    |
| Badge Type — Stock         | `bg-chart-1/15 text-chart-1`             | Mapeamento do DESIGN.md (teal)                            |
| Badge Type — ETF           | `bg-chart-2/15 text-chart-2`             | Mapeamento do DESIGN.md (violeta)                         |
| Badge Type — Crypto        | `bg-chart-4/15 text-chart-4`             | Mapeamento do DESIGN.md (rosa)                            |
| Badge Type — Other         | `bg-chart-5/15 text-chart-5`             | Mapeamento do DESIGN.md (azul céu)                        |
| Botão "+ Add position"     | `variant="default"` + hover `neon-primary` | Acção primária da página — único acento teal forte no header |
| Modal DialogContent        | `bg-card border-border/50 neon-border-primary` | Modal como superfície `--card`; glow teal sutil para contextualizar |
| Labels de campos do modal  | `text-xs text-muted-foreground uppercase tracking-wide` | Padrão de labels do DESIGN.md                          |
| Campos Input/Select        | `bg-background border-input text-sm`     | Padrão shadcn — fundo `--background` mais escuro que card |
| Foco nos campos            | `ring-1 ring-ring`                       | `--ring` = teal; acessibilidade + consistência            |
| Valores numéricos na tabela| `tabular-nums`                           | Alinhamento de colunas financeiras (DESIGN.md obrigatório)|
| Header de coluna           | `text-[10px] font-medium uppercase tracking-wider text-muted-foreground` | Padrão existente — mantido       |
| Linha hover                | `hover:bg-muted/40`                      | Padrão existente — mantido                                |
| Linha sold                 | `opacity-[0.55]`                         | Padrão existente — mantido                                |

---

## Estados e Feedback Visual

| Estado                          | Comportamento Visual                                                                 |
|---------------------------------|--------------------------------------------------------------------------------------|
| Tabela — carregamento           | Não aplicável nesta fase (dados são síncronos/mock)                                  |
| Tabela — sem linhas             | Não aplicável (mock sempre tem dados)                                                |
| Campo Input em foco             | `ring-1 ring-ring` (teal) via shadcn padrão                                         |
| Modal aberto                    | Overlay escuro padrão do `Dialog`; `DialogContent` com `bg-card neon-border-primary`|
| Botão "Add position" (modal)    | Fecha o modal; sem toast, sem alteração na tabela — comportamento mock explícito     |
| Botão "Cancel"                  | Fecha o modal; sem alteração na tabela                                               |
| Linha sold visível              | `opacity-[0.55]` na `<tr>`; badge TypeBadge e CompanyCell herdam a opacidade        |
| Botão "+ Add position" (header) | Hover: `neon-primary` (glow teal sutil) — único efeito neon do header               |
| Sort activo                     | Seta `▲`/`▼` em `text-primary` (teal) na coluna activa — comportamento existente mantido |

---

## Notas para o Frontend

**Ordem das colunas é definitiva para esta fase.** A coluna Type fica na posição 2 (após Company), não depois de Portfolio%, para que os metadados de identidade do ativo (tipo + exchange) fiquem agrupados visualmente no início da linha.

**CompanyCell substitui AllocPill apenas na tabela.** O `AllocPill.tsx` pode subsistir se for utilizado noutros contextos futuros; apenas a importação em `HoldingsTable.tsx` muda para `CompanyCell`.

**Ícone placeholder — implementação mínima.** Um `div` com a inicial do ticker é suficiente e correcto para Fase 1. Não usar `<img>` nem `next/image` com `src` externo. Quando os logos reais forem implementados (fase futura), apenas o interior deste `div` muda — a estrutura da célula permanece.

**Exchange na linha do ticker — typografia inline.** O separador `|` e o exchange ficam na mesma linha que o ticker (não numa linha separada), em `text-[10px]` com espaçamento `ml-1.5`. Isto diferencia visualmente ticker (dado primário, `text-sm font-semibold`) de exchange (metadado, `text-[10px] text-muted-foreground/60`).

**Modal — currency default EUR.** O `Select` de Currency deve ter o seu valor inicial controlado por estado local do `AddPositionModal`, inicializado como `"EUR"`. Ao fechar e reabrir o modal, o valor volta a "EUR" (reset no close ou na inicialização do estado).

**Coluna Type — sem sort nesta fase.** O header "TYPE" pode ter o `SortArrow` renderizando `↕` sempre inactivo (sem handler de click), ou o botão `<button>` pode ter `disabled` com `cursor-default`. A escolha mais simples é omitir o `<button>` e renderizar apenas o texto do label — sem quebrar o padrão de header.

**Scroll horizontal.** Com 9 colunas, o `overflow-x-auto` no wrapper da tabela já garante scroll em ecrãs estreitos. Nenhum ajuste adicional de responsividade é necessário — o comportamento existente é aceite pelo working item (CA8 / RNF).

**`SortCol` type.** O tipo `SortCol` em `HoldingsTable.tsx` não precisa de incluir `"type"` enquanto a coluna Type não for sortable — evitar alargar o union type sem necessidade.

**Neon no modal — aplicar com moderação.** O `neon-border-primary` no `DialogContent` é um `box-shadow` teal sutil. Não aplicar `neon-primary` (glow mais intenso) — o modal é uma superfície funcional, não um elemento de destaque de dados.
