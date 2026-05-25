# FINTrack — Identidade Visual

> Fonte única de verdade para design. O agente Designer lê este documento antes de especificar qualquer feature.
> Para alterar a paleta, edite os tokens em `src/app/globals.css` (seção `.dark`) e atualize as referências abaixo.

---

## Princípios

- **Minimalismo denso** — sem decoração vazia, mas com informação suficiente para leitura rápida
- **Hierarquia clara** — tamanho e peso da fonte guiam o olho; cor destaca apenas o que importa
- **Dados em primeiro lugar** — layout serve os números, não o contrário
- **Consistência** — mesmos tokens, mesmos espaçamentos, mesmos padrões em todas as páginas

---

## Paleta de Cores

Todas as cores são definidas como variáveis CSS em `src/app/globals.css` (bloco `.dark`).
Para testar uma cor diferente, altere o valor oklch da variável e o browser atualiza instantaneamente.

### Fundos (camadas)

| Token CSS          | Hex aprox.  | Uso                                          |
|--------------------|-------------|----------------------------------------------|
| `--background`     | `#0B0D18`   | Fundo de toda a página                       |
| `--sidebar`        | `#0E111C`   | Fundo da sidebar                             |
| `--card`           | `#101421`   | Cards, painéis, modais                       |
| `--popover`        | `#101421`   | Dropdowns, tooltips, popovers                |
| `--muted`          | `#161A28`   | Superfícies secundárias, hover sutil         |
| `--secondary`      | `#161A28`   | Botões secundários, badges neutros           |

### Texto

| Token CSS              | Hex aprox.  | Uso                                      |
|------------------------|-------------|------------------------------------------|
| `--foreground`         | `#E6E9F3`   | Texto principal                          |
| `--muted-foreground`   | `#717799`   | Labels, metadados, texto de suporte      |
| `--card-foreground`    | `#E6E9F3`   | Texto dentro de cards                    |

### Acento principal (Teal)

| Token CSS               | Hex aprox.  | Uso                                     |
|-------------------------|-------------|-----------------------------------------|
| `--primary`             | `#00B5A8`   | Botões primários, links, foco, ring     |
| `--primary-foreground`  | `#0B0D18`   | Texto sobre fundo primário              |
| `--ring`                | `#00B5A8`   | Outline de foco (acessibilidade)        |

### Bordas e inputs

| Token CSS  | Hex aprox.          | Uso                              |
|------------|---------------------|----------------------------------|
| `--border` | `#FFFFFF14` (8%)    | Bordas sutis de cards e seções   |
| `--input`  | `#FFFFFF1F` (12%)   | Borda de campos de formulário    |

### Semântica financeira

| Token CSS          | Hex aprox.  | Uso                                           |
|--------------------|-------------|-----------------------------------------------|
| `--gain`           | `#1AB35A`   | Ganho positivo — texto, badges, ícones        |
| `--loss`           | `#E05050`   | Perda negativa — texto, badges, ícones        |
| `--destructive`    | `#E05050`   | Ações destrutivas (delete, erro)              |
| `--neutral-value`  | `#717799`   | Variação zero ou dado sem polaridade          |

### Gráficos (5 cores para pie/bar charts)

| Token CSS    | Hex aprox.  | Uso sugerido                   |
|--------------|-------------|--------------------------------|
| `--chart-1`  | `#00B5A8`   | Stocks — acento principal teal |
| `--chart-2`  | `#8B5CF6`   | ETFs — violeta                 |
| `--chart-3`  | `#F59E0B`   | FIIs — âmbar                   |
| `--chart-4`  | `#E879A0`   | Crypto — rosa                  |
| `--chart-5`  | `#38BDF8`   | Outros — azul céu              |

---

## Tipografia

**Fonte única:** IBM Plex Mono — aplicada em todo o site (headings, corpo, números, código).

IBM Plex Mono é monospace, o que garante alinhamento perfeito em colunas de dados numéricos.

### Escala

| Uso                      | Classe Tailwind         | Peso  |
|--------------------------|-------------------------|-------|
| Título de página         | `text-2xl`              | 600   |
| Título de seção / card   | `text-lg`               | 500   |
| Corpo / texto padrão     | `text-sm`               | 400   |
| Labels, metadados        | `text-xs`               | 400   |
| Valores monetários grandes | `text-3xl` / `text-4xl` | 600 |

### Números monetários

- Sempre usar `tabular-nums` para alinhamento em tabelas: `font-variant-numeric: tabular-nums`
- Classe utilitária a aplicar: `font-mono tabular-nums`
- Valores negativos: cor `--loss` (vermelho)
- Valores positivos: cor `--gain` (verde)
- Valores neutros: cor `--foreground` (padrão)

---

## Espaçamento e Layout

- **Grid base:** 4px (múltiplos de 4 — `p-1`, `p-2`, `p-4`, `p-6`, `p-8`)
- **Padding de página:** `p-6` (24px)
- **Gap entre cards:** `gap-4` ou `gap-6`
- **Padding interno de card:** `p-4` ou `p-6`
- **Border radius:** `rounded-lg` (`--radius: 0.5rem`) para cards; `rounded-md` para botões e inputs

---

## Componentes e Padrões

### Cards

```tsx
<Card className="border-border/50 bg-card">
  <CardHeader className="pb-3">
    <CardTitle className="text-sm font-medium text-muted-foreground">Label</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-semibold tabular-nums">R$ 0,00</p>
  </CardContent>
</Card>
```

### Badges por tipo de ativo

| Tipo    | Cor de fundo                | Cor de texto        |
|---------|-----------------------------|---------------------|
| Stock   | `bg-chart-5/15`             | `text-chart-5`      |
| ETF     | `bg-chart-2/15`             | `text-chart-2`      |
| FII     | `bg-chart-3/15`             | `text-chart-3`      |
| Crypto  | `bg-chart-4/15`             | `text-chart-4`      |

### Ganho / Perda inline

```tsx
// Positivo
<span className="text-[var(--gain)] font-medium">+R$ 120,50 (3,2%)</span>

// Negativo
<span className="text-[var(--loss)] font-medium">-R$ 45,00 (-1,8%)</span>
```

### Tabelas

- Header: `text-xs text-muted-foreground uppercase tracking-wide`
- Linhas: `border-b border-border/40` com hover `hover:bg-muted/40`
- Colunas numéricas: sempre `text-right tabular-nums`

### Botões

- **Primário:** `variant="default"` — fundo teal, texto escuro
- **Secundário:** `variant="outline"` — borda sutil, fundo transparente
- **Destrutivo:** `variant="destructive"` — apenas para delete/confirmações críticas
- **Ghost:** `variant="ghost"` — ações secundárias em tabelas (edit, delete inline)

---

## Sidebar

- Fundo: `--sidebar` (#0E111C) — ligeiramente diferente do background
- Item ativo: fundo `--sidebar-primary` (teal) com texto escuro
- Item hover: `--sidebar-accent` (superfície levemente mais clara)
- Ícones: 16px, alinhados com texto via `gap-2`

---

## Gráficos (Recharts)

- Fundo do gráfico: transparente (herda `--card`)
- Grid lines: `stroke="var(--border)"` com opacidade 40%
- Tooltip: fundo `--popover`, borda `--border`, texto `--foreground`
- Legendas: `text-xs text-muted-foreground`
- Cores: usar `--chart-1` a `--chart-5` em ordem (nunca hardcoded)

---

## Estado de Loading / Vazio

- Loading: `<Skeleton>` com `bg-muted animate-pulse`
- Estado vazio: ícone + texto `text-muted-foreground text-sm` centralizado no card
- Erro: badge/toast `variant="destructive"` — nunca apenas silencioso

---

## Efeitos Neon

O FINTrack usa glows neon sutis para destacar dados críticos — inspirado no Ghostfolio. O objetivo é chamar atenção para o que importa sem exagero.

### Tokens de glow (definidos em `globals.css`)

| Variável CSS      | Uso                                        |
|-------------------|--------------------------------------------|
| `--glow-primary`  | Glow teal — botões, bordas, dots           |
| `--glow-gain`     | Glow verde — valores positivos             |
| `--glow-loss`     | Glow vermelho — valores negativos          |

### Classes utilitárias

| Classe               | Efeito                                              |
|----------------------|-----------------------------------------------------|
| `neon-primary`       | `box-shadow` teal no elemento                       |
| `neon-primary-text`  | `text-shadow` teal no texto                         |
| `neon-border-primary`| Borda com glow teal sutil + fundo interno brilhante |
| `neon-gain`          | `text-shadow` verde em valores positivos            |
| `neon-loss`          | `text-shadow` vermelho em valores negativos         |
| `neon-divider`       | Linha divisória com gradiente teal                  |
| `neon-dot`           | Dot pulsante teal (status de atualização)           |

### Onde aplicar

- **Números de patrimônio total** no Dashboard → `neon-primary-text`
- **Ganhos positivos** → `neon-gain` + `text-[var(--gain)]`
- **Perdas negativas** → `neon-loss` + `text-[var(--loss)]`
- **Card em destaque** → `neon-border-primary`
- **Botão primário** → `neon-primary` no hover
- **Dot de "preço atualizado"** → `neon-dot`
- **Divisores de seção** → `neon-divider`

### Princípio de uso

> Neon é destaque — não decoração. Usar em no máximo 2-3 elementos por página. Se tudo brilha, nada se destaca.

---

## Como Alterar a Paleta

1. Abra `src/app/globals.css`
2. Localize o bloco `.dark { ... }`
3. Altere o valor oklch da variável desejada
4. O browser atualiza via hot reload — nenhum rebuild necessário
5. Ao confirmar a cor, atualize o hex de referência neste documento

Ferramenta para converter oklch ↔ hex: https://oklch.com
