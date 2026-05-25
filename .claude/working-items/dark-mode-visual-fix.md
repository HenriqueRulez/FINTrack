# Working Item: Identidade Visual Dark Mode — Validação e Consistência

## Descrição

O FINTrack adoptou um design system dark-mode completo definido em `DESIGN.md`, com paleta teal, tipografia IBM Plex Mono e efeitos neon subtis. Os tokens CSS foram declarados no bloco `.dark` de `src/app/globals.css` e a classe `dark` foi forçada no elemento `<html>` em `src/app/layout.tsx`.

Sete ficheiros de componentes e páginas foram modificados para substituir classes light-mode hardcoded pelos tokens do design system. Esta working item cobre a **validação** de que essas alterações estão correctas, consistentes com o DESIGN.md e sem regressões funcionais.

### Ficheiros alterados

| Ficheiro | Papel |
|---|---|
| `src/components/layout/sidebar.tsx` | Sidebar de navegação principal |
| `src/components/layout/navbar.tsx` | Barra de topo com botão de logout |
| `src/app/(auth)/passphrase/page.tsx` | Página de login por passphrase |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard — visão geral do patrimônio |
| `src/app/(dashboard)/settings/page.tsx` | Página de configurações |
| `src/components/portfolio/portfolio-client.tsx` | Wrapper client-side do portfólio |
| `src/components/portfolio/position-table.tsx` | Tabela de posições do portfólio |

---

## Critérios de Aceite

### CA-01 — Fundos e Camadas de Superfície

- [ ] O fundo de toda a página usa `bg-background` (token `--background`, ~#0B0D18) — sem `bg-white`, `bg-gray-*` ou valores hexadecimais hardcoded
- [ ] A sidebar usa `bg-sidebar` (token `--sidebar`, ~#0E111C), ligeiramente diferente do background
- [ ] A navbar usa `bg-sidebar` (mesmo token da sidebar — ambos partilham a mesma camada de superfície lateral)
- [ ] Cards e painéis usam `bg-card` (token `--card`, ~#101421)
- [ ] Superfícies secundárias (hover states, header da tabela) usam `bg-muted` ou `bg-muted/40` (token `--muted`, ~#161A28)

### CA-02 — Texto e Hierarquia Tipográfica

- [ ] Todo o texto principal usa `text-foreground` (token `--foreground`, ~#E6E9F3)
- [ ] Labels, metadados e textos de suporte usam `text-muted-foreground` (token `--muted-foreground`, ~#717799)
- [ ] Texto dentro de cards usa `text-card-foreground` ou `text-foreground` — nunca cores hardcoded como `text-gray-*` ou `text-white`
- [ ] Títulos de página seguem a escala: `text-2xl font-bold` para páginas, `text-lg` para secções
- [ ] Valores monetários usam `tabular-nums` para alinhamento correcto em colunas

### CA-03 — Acento Teal (Primário)

- [ ] O logotipo "FINTrack" na sidebar usa `text-primary` com efeito `neon-primary-text`
- [ ] O logotipo "FINTrack" na página de passphrase usa `text-primary` com efeito `neon-primary-text`
- [ ] Botões primários (Ex: "Adicionar Posição", "Entrar") usam `bg-primary text-primary-foreground`
- [ ] Tickers na tabela usam `text-primary` para destaque visual
- [ ] O item activo na sidebar usa `text-primary` com indicador visual de borda esquerda (`border-l-2 border-primary`)

### CA-04 — Bordas e Inputs

- [ ] Bordas de cards usam `border-border/50` ou `border-border/40` (token `--border`, branco 8% opacidade) — nunca `border-gray-*` hardcoded
- [ ] Bordas da sidebar e navbar usam `border-sidebar-border`
- [ ] O input de passphrase usa `border-input` (token `--input`, branco 12% opacidade) com `focus:ring-primary/60`
- [ ] Nenhum ficheiro contém bordas hardcoded como `border-gray-200`, `border-slate-*` ou valores hexadecimais

### CA-05 — Efeitos Neon

- [ ] O card de "Patrimônio Total" no dashboard aplica `neon-border-primary` (borda com glow teal)
- [ ] O valor de "Patrimônio Total" aplica `neon-primary-text` (text-shadow teal)
- [ ] O card de login (passphrase) aplica `neon-border-primary`
- [ ] O botão "Entrar" na passphrase aplica `neon-primary` no estado normal (box-shadow teal)
- [ ] O botão "Adicionar Posição" no portfólio aplica `neon-primary`
- [ ] Os divisores de secção (`<hr>`) nas páginas settings e dashboard usam a classe `neon-divider`
- [ ] O princípio de uso é respeitado: máximo 2-3 elementos neon por página — não há excesso de brilho

### CA-06 — Badges de Tipo de Ativo

- [ ] Stock: `bg-[var(--chart-5)]/15 text-[var(--chart-5)]` (azul céu)
- [ ] ETF: `bg-[var(--chart-2)]/15 text-[var(--chart-2)]` (violeta)
- [ ] FII: `bg-[var(--chart-3)]/15 text-[var(--chart-3)]` (âmbar)
- [ ] Crypto: `bg-[var(--chart-4)]/15 text-[var(--chart-4)]` (rosa)
- [ ] Tipo desconhecido: fallback `bg-muted text-muted-foreground`

### CA-07 — Semântica Financeira (Ganho/Perda)

- [ ] Valores positivos usam `text-[var(--gain)]` (~#1AB35A verde)
- [ ] Valores negativos usam `text-[var(--loss)]` (~#E05050 vermelho)
- [ ] O botão "Remover" na tabela usa `text-[var(--loss)]` com hover `hover:bg-[var(--loss)]/10`
- [ ] A mensagem de erro de passphrase incorrecta usa `text-[var(--loss)]`

### CA-08 — Tokens CSS — Zero Hardcoding

- [ ] Nenhum dos 7 ficheiros contém valores de cor hexadecimais hardcoded (ex: `#0B0D18`, `#00B5A8`)
- [ ] Nenhum dos 7 ficheiros contém classes Tailwind de cor fora do design system (ex: `text-gray-*`, `bg-slate-*`, `text-white`, `bg-black`)
- [ ] Cores especiais referenciadas via `var()` quando não há classe Tailwind equivalente (ex: `text-[var(--gain)]`, `text-[var(--loss)]`)

### CA-09 — Tipografia IBM Plex Mono

- [ ] O `layout.tsx` carrega `IBM_Plex_Mono` via `next/font/google` com os pesos 300, 400, 500, 600, 700
- [ ] A variável CSS `--font-ibm-plex-mono` está aplicada no `<body>` via `ibmPlexMono.variable`
- [ ] O `globals.css` mapeia `--font-sans`, `--font-mono` e `--font-heading` para `var(--font-ibm-plex-mono)`
- [ ] A fonte é aplicada globalmente via `@apply font-sans` no seletor `html` no `globals.css`

### CA-10 — Dark Mode Forçado

- [ ] O elemento `<html>` em `layout.tsx` tem a classe `dark` aplicada permanentemente
- [ ] Não existe nenhum toggle de tema nem referência a `prefers-color-scheme` no código
- [ ] O bloco `:root` do `globals.css` contém os defaults light (não usados, mas não removidos para compatibilidade com shadcn/ui)
- [ ] O bloco `.dark` do `globals.css` define todos os tokens do design system com valores oklch correctos

### CA-11 — Consistência Visual entre Páginas

- [ ] As 3 páginas do dashboard (Visão Geral, Portfólio, Configurações) partilham o mesmo padrão de heading: `text-2xl font-bold text-foreground` + subtítulo `text-muted-foreground text-sm`
- [ ] As 3 páginas usam `p-6` como padding de página (aplicado no layout wrapper — verificar `src/app/(dashboard)/layout.tsx` se existir)
- [ ] O espaçamento entre secções é consistente (`mb-6` antes de grids/cards)

### CA-12 — Sem Regressões Funcionais

- [ ] A página de passphrase faz login correctamente com as credenciais certas
- [ ] A página de passphrase mostra erro ao introduzir passphrase errada
- [ ] A sidebar navega correctamente entre as 3 rotas (/dashboard, /portfolio, /settings)
- [ ] O item activo na sidebar é destacado correctamente ao mudar de rota
- [ ] O botão "Sair" na navbar executa logout e redireciona para /login
- [ ] A tabela de posições renderiza correctamente com dados (se houver posições cadastradas)
- [ ] Os botões "Editar" e "Remover" na tabela abrem os respectivos diálogos
- [ ] O botão "Adicionar Posição" abre o formulário de nova posição

---

## Notas Técnicas

### Para o Engineer

**Verificar ausência de hardcoding:**
```bash
# Procurar cores hardcoded nos ficheiros alterados
grep -n "bg-white\|bg-gray\|bg-slate\|text-white\|text-gray\|text-slate\|border-gray\|border-slate" \
  src/components/layout/sidebar.tsx \
  src/components/layout/navbar.tsx \
  src/app/\(auth\)/passphrase/page.tsx \
  src/app/\(dashboard\)/dashboard/page.tsx \
  src/app/\(dashboard\)/settings/page.tsx \
  src/components/portfolio/portfolio-client.tsx \
  src/components/portfolio/position-table.tsx
```

**Verificar que os tokens neon existem no globals.css:**
Os tokens `--glow-primary`, `--glow-gain`, `--glow-loss` estão definidos apenas no bloco `.dark`. As classes utilitárias `.neon-primary`, `.neon-primary-text`, `.neon-border-primary`, `.neon-gain`, `.neon-loss`, `.neon-divider`, `.neon-dot` estão em `@layer utilities` sem restrição de dark — funcionam correctamente porque a classe `.dark` está sempre activa.

**Padrão de token via var() vs classe Tailwind:**
- Preferir classes Tailwind: `text-primary`, `bg-card`, `border-border/50`
- Usar `var()` apenas quando não há classe Tailwind equivalente: `text-[var(--gain)]`, `text-[var(--loss)]`, `bg-[var(--chart-5)]/15`
- Nunca misturar os dois padrões para o mesmo token

**Sidebar — token `--sidebar` vs `--card`:**
A sidebar usa `--sidebar` (~#0E111C), não `--card` (~#101421). São camadas distintas — a sidebar é ligeiramente mais escura que os cards. O `bg-sidebar` mapeia para `--color-sidebar` que por sua vez aponta para `var(--sidebar)`.

**Navbar partilha o token da sidebar:**
A navbar (`h-14`) usa `bg-sidebar` propositadamente — visualmente pertence ao mesmo nível da sidebar lateral.

**Botão "Entrar" na passphrase — neon-primary:**
A classe `neon-primary` aplica `box-shadow: var(--glow-primary)` permanentemente (não só no hover). Este comportamento está correcto para elementos de acção primária na página de login.

### Para o QA

**Ambiente de teste:**
- Usar browser com DevTools aberto para inspecionar computed styles
- Verificar que nenhum elemento tem fundo branco ou texto escuro (#000 / #111) que indique fallback para o tema light

**Checklist de inspeção visual rápida:**

1. `/passphrase` — fundo deve ser quase preto (#0B0D18), card deve ter borda teal com glow subtil, botão deve ter glow teal
2. `/dashboard` — card de "Patrimônio Total" deve ter borda teal neon, valor "R$ 0,00" deve ter text-shadow teal subtil, divisor deve ser gradiente teal
3. `/portfolio` — tabela deve ter header com fundo muted/40, tickers em teal, badges coloridos por tipo
4. `/settings` — divisor neon, textos correctamente em foreground/muted-foreground

**Comando typecheck — deve passar sem erros:**
```bash
npm run typecheck
```

**Comando lint — deve passar sem erros:**
```bash
npm run lint
```

**Inspecção de contraste (acessibilidade mínima):**
- Texto `--foreground` (#E6E9F3) sobre `--background` (#0B0D18): rácio ~13:1 (passa WCAG AAA)
- Texto `--muted-foreground` (#717799) sobre `--card` (#101421): rácio ~4.5:1 (passa WCAG AA)
- Texto `--primary-foreground` (#0B0D18) sobre `--primary` (#00B5A8): rácio ~7:1 (passa WCAG AA)

---

## Definição de Pronto (DoD)

- Todos os 12 critérios de aceite verificados e aprovados
- `npm run typecheck` passa sem erros
- `npm run lint` passa sem erros
- Nenhum elemento visível usa cores light-mode em nenhuma das 4 páginas
- Os efeitos neon são subtis (não excessivos) — máximo 2-3 por página
- QA confirma consistência visual entre as 3 páginas do dashboard
