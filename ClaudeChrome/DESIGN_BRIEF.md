# FINTrack — Design Brief para Designer

---

## Identidade Visual (já definida — não alterar)

**Paleta (dark mode exclusivo)**
| Token | Hex | Uso |
|-------|-----|-----|
| `--background` | `#0B0D18` | Fundo de toda a página |
| `--sidebar` | `#0E111C` | Sidebar |
| `--card` | `#101421` | Cards, painéis, modais |
| `--muted` | `#161A28` | Superfícies secundárias, hover |
| `--primary` | `#00B5A8` | Teal — botões, links, destaques |
| `--foreground` | `#E6E9F3` | Texto principal |
| `--muted-foreground` | `#717799` | Labels, metadados |
| `--gain` | `#1AB35A` | Verde — valores positivos |
| `--loss` | `#E05050` | Vermelho — valores negativos |
| `--chart-1` | `#00B5A8` | Stocks |
| `--chart-2` | `#8B5CF6` | ETFs |
| `--chart-3` | `#F59E0B` | FIIs |
| `--chart-4` | `#E879A0` | Crypto |
| `--chart-5` | `#38BDF8` | Outros |

**Tipografia:** IBM Plex Mono — fonte única (headings, corpo, números). Monospace garante
alinhamento perfeito em colunas numéricas.

**Efeitos Neon (usar com moderação — máx. 2-3 por página):**

- `neon-primary-text` → glow teal em texto de destaque
- `neon-border-primary` → borda com glow teal em cards de destaque
- `neon-gain` / `neon-loss` → glow verde/vermelho em valores financeiros críticos
- `neon-dot` → dot pulsante teal (indicador de status/live)

**Princípio:** Dados em primeiro lugar. Sem decoração vazia. Neon é destaque, não ruído.

---

## Layout Geral

┌─────────────────────────────────────────────────────────┐
│ SIDEBAR (220px fixo) │ CONTEÚDO PRINCIPAL │
│ │ │
│ [logo] FINTrack │ [Header da página] │
│ │ │
│ > Dashboard │ [Corpo da página] │
│ > Portfólio │ │
│ > Configurações │ │
│ │ │
└─────────────────────────────────────────────────────────┘

- Sidebar: fundo `--sidebar`, item ativo com fundo `--primary` (teal) e texto escuro
- Conteúdo: padding `p-6` (24px), gap entre blocos `gap-6`
- Cards: `bg-card`, `rounded-xl`, `border border-border/50`, padding interno `p-5`

---

## Página 1 — Dashboard

### Layout (wireframe descritivo)

┌──────────────────────────────────────────────────────────────┐
│ Visão Geral │
│ Bem-vindo ao FINTrack │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│ Patrimônio │ Total │ Ganho/Perda │ Nº Posições │
│ Total │ Investido │ Total │ │
│ │ │ │ │
│ € 12.430,00 │ € 10.200,00 │ +€2.230,00 │ 8 │
│ [neon teal] │ │ (+21,86%) │ │
│ │ │ [neon verde] │ │
└──────────────┴──────────────┴──────────────┴─────────────────┘
┌───────────────────────────┐ ┌────────────────────────────────┐
│ Distribuição por Tipo │ │ Ganho/Perda por Ativo │
│ │ │ │
│ [DONUT CHART] │ │ [HORIZONTAL BAR CHART] │
│ │ │ │
│ ● Stocks 45% €5.593 │ │ AAPL ██████████ +18,2% │
│ ● ETFs 32% €3.977 │ │ WEBN ████████ +12,5% │
│ ● FIIs 15% €1.864 │ │ BTC ████ +6,1% │
│ ● Crypto 8% €996 │ │ XEQT ██ +2,3% │
│ │ │ VALE ░░ -1,4% │
└───────────────────────────┘ └────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ Distribuição por Ativo (% do portfólio) │
│ │
│ AAPL ████████████████████████████████ 32% │
│ WEBN ████████████████████ 20% │
│ BTC ████████████ 14% │
│ XEQT ████████ 10% │
│ ... │
└──────────────────────────────────────────────────────────────┘

### Especificações dos Cards de Resumo

- 4 cards em linha, grid `grid-cols-4`, gap `gap-4`
- Card Patrimônio Total: `neon-border-primary` + valor com `neon-primary-text text-3xl`
- Card Ganho/Perda: valor em `--gain` (verde) se positivo, `--loss` (vermelho) se negativo, com `neon-gain` / `neon-loss`
- Label de cada card: `text-xs text-muted-foreground uppercase tracking-wide`

### Especificações dos Gráficos

**Gráfico Donut — Distribuição por Tipo**

- Biblioteca: Recharts (`PieChart` com `innerRadius`)
- Cores: `--chart-1` (Stocks), `--chart-2` (ETFs), `--chart-3` (FIIs), `--chart-4` (Crypto)
- Legenda: lista abaixo/lateral com cor + label + percentual + valor absoluto
- Tooltip: fundo `--popover`, borda `--border`, texto `--foreground`
- Sem labels dentro das fatias — usar legenda externa

**Gráfico Barras Horizontais — Ganho/Perda por Ativo**

- Biblioteca: Recharts (`BarChart layout="vertical"`)
- Barra verde se valor positivo (`--gain`), vermelha se negativo (`--loss`)
- Eixo Y: ticker + nome curto (truncar em 15 chars)
- Eixo X: percentual com sinal (`+18,2%`)
- Linha de referência em 0% (vertical, cor `--border`)

**Gráfico Barras Horizontais — Distribuição por Ativo**

- Biblioteca: Recharts (`BarChart layout="vertical"`)
- Cor única: `--primary` (teal)
- Eixo X: 0% a 100%
- Ordenado do maior para o menor %
- Máx. 10 barras (agrupar restantes em "Outros" se necessário)

---

## Página 2 — Portfólio

### Layout da Página

┌──────────────────────────────────────────────────────────────┐
│ Portfólio [🔄 Atualizar Preços] [+ Adicionar Posição] │
├──────────────────────────────────────────────────────────────┤
│ │
│ TABELA 1 — POSIÇÕES CONSOLIDADAS │
│ (somente leitura, agrupado por ticker) │
│ │
├──────────────────────────────────────────────────────────────┤
│ │
│ TABELA 2 — HISTÓRICO DE COMPRAS │
│ (entradas individuais, com editar/deletar) │
│ │
└──────────────────────────────────────────────────────────────┘

### Tabela 1 — Posições Consolidadas

**Header da tabela:**
Ticker | Nome | Tipo | Qtd. Total | Preço Médio | Valor Atual | G/P | Total Investido | 30d

**Detalhes visuais por coluna:**

| Coluna          | Alinhamento | Estilo                                                                                                                                      |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ticker          | Esquerda    | `font-mono font-semibold text-primary` + ícone do ativo (16×16) antes do símbolo. Linha 2 menor: mercado em `text-muted-foreground text-xs` |
| Nome            | Esquerda    | `text-foreground/80`, truncar com `…` em 20 chars                                                                                           |
| Tipo            | Centro      | Badge colorido (ver sistema de design)                                                                                                      |
| Qtd. Total      | Direita     | `tabular-nums`, até 5 decimais, omitir se inteiro                                                                                           |
| Preço Médio     | Direita     | `tabular-nums` com símbolo da moeda                                                                                                         |
| Valor Atual     | Direita     | `tabular-nums` + dot de frescura (🟢/🟡/🔴 via `neon-dot`)                                                                                  |
| G/P             | Direita     | Duas linhas: valor absoluto (linha 1) + percentual (linha 2). Cor `--gain` ou `--loss` + efeito neon                                        |
| Total Investido | Direita     | `tabular-nums`, cor `--foreground`                                                                                                          |
| Sparkline 30d   | Centro      | Mini linha (80px largura × 32px altura), sem eixos, sem tooltip. Verde se último > primeiro, vermelho caso contrário                        |

**Linha hover:** `hover:bg-muted/30 transition-colors`
**Divisor entre linhas:** `border-b border-border/40`
**Sem botões de ação nesta tabela** — é somente leitura.

**Estado vazio:**
┌─────────────────────────────────────────┐
│ [ícone neutro] │
│ Nenhuma posição cadastrada. │
│ Clique em "Adicionar Posição" │
│ para começar. │
└─────────────────────────────────────────┘

---

### Tabela 2 — Histórico de Compras

**Header da tabela:**
Ticker | Nome | Broker | Tipo | Quantidade | Preço Pago | Total da Entrada | Data de Compra | Ações

**Detalhes visuais por coluna:**

| Coluna           | Alinhamento | Estilo                                                |
| ---------------- | ----------- | ----------------------------------------------------- |
| Ticker           | Esquerda    | `font-mono font-semibold text-primary`                |
| Nome             | Esquerda    | `text-foreground/80`, truncar com `…`                 |
| Broker           | Esquerda    | Texto simples, `text-foreground/80`                   |
| Tipo             | Centro      | Badge colorido                                        |
| Quantidade       | Direita     | `tabular-nums`                                        |
| Preço Pago       | Direita     | `tabular-nums` com moeda                              |
| Total da Entrada | Direita     | `tabular-nums` em `font-medium`                       |
| Data de Compra   | Centro      | Formato `DD/MM/YYYY`, `text-muted-foreground`         |
| Ações            | Centro      | Dois botões `variant="ghost"`: ✏️ Editar + 🗑️ Deletar |

**Botão Deletar:** cor `--destructive`, com modal de confirmação antes de executar.

---

### Modal "Adicionar / Editar Posição"

┌──────────────────────────────────────┐
│ Adicionar Posição [✕] │
├──────────────────────────────────────┤
│ │
│ Ticker _ [AAPL ] [Verificar]│
│ ✓ Apple Inc. │ ← aparece após verificação
│ │
│ Tipo _ [Stock ▼] │
│ │
│ Broker [Degiro ▼] │
│ │
│ Quantidade _ [15 ] │
│ │
│ Preço Pago _ [150,00 ] │
│ │
│ Moeda [EUR ▼] │
│ │
│ Data de Compra \* [01/05/2026] │
│ │
├──────────────────────────────────────┤
│ [Cancelar] [Guardar] │
└──────────────────────────────────────┘

**Estados do campo Ticker + botão Verificar:**

- `idle`: campo branco, botão "Verificar" ativo (outline teal)
- `loading`: spinner no botão, campo bloqueado
- `valid`: borda verde no campo, texto `✓ [Nome do ativo]` abaixo em `--gain`
- `invalid`: borda vermelha, texto `✗ Ticker não encontrado` em `--loss`
- `dirty` (editou após verificar): borda volta ao normal, nome limpo, botão "Guardar" desabilitado

**Botão "Guardar":** desabilitado até ticker verificado com sucesso.

---

## Página 3 — Configurações

### Layout

┌──────────────────────────────────────────────────────────────┐
│ Configurações │
├──────────────────────────────────────────────────────────────┤
│ │
│ ── Conta ──────────────────────────────────────────────── │
│ │
│ (informações básicas — somente leitura por enquanto) │
│ │
│ ── Preferências ────────────────────────────────────────── │
│ │
│ Moeda padrão: [EUR ▼] │
│ Formato de data: [DD/MM/YYYY ▼] │
│ │
│ ── Zona de Perigo ──────────────────────────────────────── │
│ │
│ [🚪 Sair da conta] ← botão variant="destructive" (outline)│
│ │
└──────────────────────────────────────────────────────────────┘

**Separação visual entre secções:** `<hr className="neon-divider" />` + label da secção em
`text-xs text-muted-foreground uppercase tracking-wide`.

**Botão "Sair":**

- Estilo: `variant="outline"` com borda `--destructive` e texto `--destructive`
- Hover: fundo `--destructive/10`
- Ao clicar: modal de confirmação com botão confirmar em `variant="destructive"` sólido

---

## Indicadores de Frescura de Preço (componente reutilizável)

Utilizado na coluna "Valor Atual" da Tabela 1 do Portfólio:

| Estado   | Dot                         | Condição                    |
| -------- | --------------------------- | --------------------------- |
| Fresco   | 🟢 `neon-dot` pulsante teal | `price_updated_at` < 15 min |
| Antigo   | 🟡 dot âmbar estático       | entre 15 min e 1h           |
| Expirado | 🔴 dot vermelho estático    | > 1h                        |

Tooltip no hover: "Atualizado há X min" ou "Atualizado às HH:MM".

---

## Componentes Reutilizáveis a Criar

| Componente        | Uso                                                             |
| ----------------- | --------------------------------------------------------------- |
| `<StatCard>`      | Cards de resumo do Dashboard (label + valor grande + sub-label) |
| `<AssetBadge>`    | Badge colorido por tipo (já existe, manter)                     |
| `<PriceDot>`      | Dot de frescura de preço (verde/âmbar/vermelho + tooltip)       |
| `<GainLossCell>`  | Célula com valor + % colorido + neon                            |
| `<SparklineCell>` | Mini gráfico 30d (já existe `PriceSparkline`, ajustar tamanho)  |
| `<ConfirmDialog>` | Modal de confirmação genérico (logout, delete)                  |
| `<TickerInput>`   | Input de ticker com botão Verificar e estados visuais           |

---

## Referências Visuais

O FINTrack tem inspiração direta em:

- **Ghostfolio** (efeitos neon, densidade de informação)
- **Oitava.app** (estrutura de tabelas financeiras, cards de resumo)
- **Linear** (minimalismo, hierarquia tipográfica clara)

O feeling geral é: **terminal financeiro elegante** — dados densos, fundo escuro profundo,
acentos neon discretos, tipografia monospace. Não é um dashboard colorido e alegre —
é uma ferramenta séria para quem quer ver números com clareza.
