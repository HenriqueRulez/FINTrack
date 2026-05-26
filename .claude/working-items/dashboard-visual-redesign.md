# Working Item — Dashboard Visual Redesign

**ID:** dashboard-visual-redesign
**Data:** 2026-05-25
**Estado:** Pronto para Design
**Prioridade:** Alta

---

## Contexto

O dashboard actual não reflecte a identidade visual definida em `DESIGN.md` (dark mode, IBM Plex Mono, acento Teal, efeitos neon). Este working item cobre o redesenho visual completo do dashboard e da sidebar de navegação, com suporte a animações controláveis pelo utilizador.

---

## Objectivo

Alinhar o dashboard (e toda a shell de navegação) com o design system do FINTrack, produzindo uma interface coesa, com glow neon, tipografia mono e métricas financeiras bem hierarquizadas.

---

## Clarificações Resolvidas

| # | Tema | Decisão |
|---|------|---------|
| D1 | Sidebar | Criar com todos os links do protótipo; os sem página ficam com `href="#"` (placeholder) e estado visual de inactivo |
| D2 | Logout | Remover botão "Sair" do topbar; funcionalidade de logout move-se para a página de Configurações (Settings) |
| D3 | Moeda | EUR (€) — manter como no protótipo |
| D4 | Chart | Recharts (perder animação `draw` é aceitável) |
| D5 | Animações | Toggle em Configurações para activar/desactivar animações de entrada; estado persistido em `localStorage` |

---

## Scope

### In-scope
- Sidebar de navegação global com links (activos e placeholders)
- Topbar sem botão de logout
- Cards de métricas (Patrimônio Total, Rentabilidade, Alocação, nº de posições)
- Chart de evolução de portfólio com Recharts
- Animações de entrada (fade-in / slide-up) controláveis por toggle em Settings
- Toggle de animações persistido em `localStorage`
- Logout movido para a página de Configurações

### Out-of-scope
- Implementação das páginas Holdings, Transactions, Performance, Tax Calculator
- Lógica de dados reais para o chart (pode usar dados mock/placeholder)

---

## Itens de Navegação da Sidebar

| Label | Rota | Estado |
|-------|------|--------|
| Dashboard | `/dashboard` | Activo |
| Holdings | `#` | Placeholder (inactivo) |
| Transactions | `#` | Placeholder (inactivo) |
| Performance | `#` | Placeholder (inactivo) |
| Tax Calculator | `#` | Placeholder (inactivo) |
| Settings | `/settings` | Activo |

---

## Critérios de Aceite

### CA-01 — Sidebar
- [ ] Sidebar renderiza todos os 6 itens de navegação listados acima
- [ ] Items placeholder têm `href="#"` e estilo visual distinto (ex: opacidade reduzida, cursor `not-allowed`)
- [ ] Item activo tem indicador visual (acento teal + neon border ou background highlight)
- [ ] Sidebar é responsiva (colapsa ou drawer em mobile)

### CA-02 — Topbar
- [ ] Topbar não contém botão "Sair" / logout
- [ ] Topbar mostra nome/logo do projecto e eventual avatar ou indicador de sessão

### CA-03 — Cards de métricas
- [ ] Mínimo 4 cards: Patrimônio Total, Rentabilidade, Alocação, Nº de Posições
- [ ] Valores monetários exibidos em EUR (€)
- [ ] Variações positivas usam `--gain` (verde); negativas usam `--loss` (vermelho)
- [ ] Cards usam efeitos neon (`.neon-border-primary` ou equivalente)

### CA-04 — Chart
- [ ] Chart de evolução do portfólio implementado com Recharts
- [ ] Dados podem ser mock/placeholder enquanto a integração real não existe
- [ ] Chart é responsivo (adapta à largura do container)
- [ ] Tema do chart alinhado com dark mode (cores da paleta `globals.css`)

### CA-05 — Animações de entrada
- [ ] Componentes do dashboard têm animações de entrada (fade-in ou slide-up) por defeito
- [ ] Página de Configurações tem toggle "Animações de entrada" (on/off)
- [ ] Estado do toggle é persistido em `localStorage` com chave `fintrack_animations_enabled`
- [ ] Quando toggle está OFF, animações de entrada não são aplicadas (classe ou variável CSS removida)
- [ ] Toggle funciona sem reload de página

### CA-06 — Logout em Settings
- [ ] Botão de logout existe e funciona na página `/settings`
- [ ] Acção de logout invalida a sessão Supabase e redireciona para `/login` (ou rota de auth)

### CA-07 — Design System
- [ ] Fonte IBM Plex Mono aplicada em headings, body e valores numéricos
- [ ] Acento Teal (`oklch(0.72 0.17 185)`) em botões, links e rings
- [ ] Dark mode exclusivo — classe `dark` forçada no `<html>`
- [ ] Zero warnings de acessibilidade de contraste nos elementos críticos

---

## Notas Técnicas

- Animações de entrada: usar hook `useAnimations()` que lê `localStorage` e retorna classes condicionalmente, ou aplicar uma classe global `animations-enabled` no `<body>`.
- Chart: componente `PortfolioChart` em `src/components/dashboard/` — server-safe (dados passados como props).
- Logout em Settings: reutilizar lógica já existente de `supabase.auth.signOut()` — ver working item `logout-settings-page.md` para contexto adicional.
- Sidebar: componente em `src/components/layout/Sidebar.tsx` (criar ou refactorizar o existente).

---

## Artefactos Esperados

| Agente | Output |
|--------|--------|
| Designer | `.claude/reports/design-dashboard-visual-redesign.md` |
| Frontend | `.claude/reports/frontend-dashboard-visual-redesign.md` |
| SM | `.claude/tasks/dashboard-visual-redesign.md` |
| Engineer | `.claude/reports/engineer-dashboard-visual-redesign.md` |
| QA | `.claude/reports/qa-dashboard-visual-redesign.md` |
| Security | `.claude/reports/security-dashboard-visual-redesign.md` |
