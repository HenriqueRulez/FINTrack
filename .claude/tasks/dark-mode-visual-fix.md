# Plano de Tarefas: Identidade Visual Dark Mode — Validação e Correcção

> **Instrução ao Engineer:** As alterações já foram feitas. O teu papel é VALIDAR cada critério e CORRIGIR o que estiver errado. Não implementar do zero — auditar e ajustar.

---

## Contexto de Auditoria Prévia

Antes de iniciar as tarefas, o SM analisou os 7 ficheiros e o estado do `globals.css`. Abaixo estão as observações que o Engineer deve confirmar/resolver durante a execução:

**Observações já identificadas:**
- `layout.tsx`: IBM Plex Mono carregado com pesos 300–700, `className="dark"` presente no `<html>`. `ibmPlexMono.variable` aplicado no `<body>` — correcto.
- `globals.css`: `.dark` tem todos os tokens definidos (incluindo `--gain`, `--loss`, `--glow-*`). `@layer utilities` define `.neon-primary`, `.neon-primary-text`, `.neon-border-primary`, `.neon-divider`, `.neon-gain`, `.neon-loss`, `.neon-dot`. Correcto.
- `sidebar.tsx`: Usa `bg-sidebar`, `border-sidebar-border`, `text-primary neon-primary-text` no logo, `border-l-2 border-primary` no item activo. Sem hardcoding aparente.
- `navbar.tsx`: Usa `bg-sidebar`, `border-sidebar-border`. Correcto.
- `passphrase/page.tsx`: Usa `bg-background`, `bg-card`, `neon-border-primary`, `text-primary neon-primary-text`, `border-input`, `focus:ring-primary/60`, `text-[var(--loss)]` no erro, `neon-primary` no botão. Correcto.
- `dashboard/page.tsx`: Usa `text-foreground`, `bg-card`, `border-border/50`, `neon-border-primary`, `neon-primary-text`, `tabular-nums`, `neon-divider`. Correcto.
- `settings/page.tsx`: Usa `text-foreground`, `bg-card`, `border-border/50`, `neon-divider`. Sem heading explícito de secção — apenas `<hr>` neon. Estrutura mínima mas válida.
- `portfolio-client.tsx`: Usa `text-foreground`, `text-muted-foreground`, `bg-primary text-primary-foreground`, `neon-primary` no botão. Correcto.
- `position-table.tsx`: Usa `bg-card`, `border-border/50`, `bg-muted/40` no header, `text-primary` nos tickers, badges via `var()`, `text-[var(--loss)]` no botão remover. Badges usam `--chart-5` (azul), `--chart-2` (violeta), `--chart-3` (âmbar), `--chart-4` (rosa). **Atenção:** `position.asset_type === "etf" ? "etf" : "stock"` no cast do edit — pode omitir `fii` e `crypto`. Verificar.
- `(dashboard)/layout.tsx`: Aplica `p-6` via `<main className="flex-1 overflow-y-auto p-6">`. Correcto.

---

## Tarefas Ordenadas

---

### TAREFA 1 — Verificar Configuração de Fonte e Dark Mode no `layout.tsx`

**Prioridade:** Crítica (fundação de todo o design system)
**Dependências:** Nenhuma

**O que fazer:**
Confirmar que o `layout.tsx` (raiz) está correcto. Abrir o ficheiro e verificar:

1. `IBM_Plex_Mono` importado de `next/font/google` com `weight: ["300", "400", "500", "600", "700"]`
2. `variable: "--font-ibm-plex-mono"` definido
3. `<html lang="pt-BR" className="dark">` — a classe `dark` está presente e não há toggle
4. `<body>` aplica `${ibmPlexMono.variable}` — a variável CSS é injectada
5. Não existe referência a `prefers-color-scheme` em nenhum lugar do ficheiro

**Ficheiros a tocar:** `src/app/layout.tsx`

**Correcções esperadas:** Nenhuma identificada na auditoria prévia. Se algo estiver errado, corrigir conforme os pontos acima.

**Verificação:** Após leitura, confirmar que `<html>` tem `className="dark"` e que o `body` tem `ibmPlexMono.variable` aplicado.

---

### TAREFA 2 — Verificar Tokens CSS e Classes Neon no `globals.css`

**Prioridade:** Crítica (todos os tokens derivam daqui)
**Dependências:** Nenhuma

**O que fazer:**
Auditar `src/app/globals.css` para confirmar:

1. Bloco `.dark` define: `--background`, `--card`, `--popover`, `--muted`, `--secondary`, `--foreground`, `--card-foreground`, `--popover-foreground`, `--muted-foreground`, `--primary`, `--primary-foreground`, `--border`, `--input`, `--ring`, `--gain`, `--loss`, `--destructive`, `--glow-primary`, `--glow-gain`, `--glow-loss`, `--chart-1` a `--chart-5`, `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`
2. `@layer utilities` define: `.neon-primary`, `.neon-primary-text`, `.neon-border-primary`, `.neon-gain`, `.neon-loss`, `.neon-divider`, `.neon-dot`
3. `@layer base` mapeia `html { @apply font-sans; }` e `body { @apply bg-background text-foreground; }`
4. `@theme inline` mapeia `--font-sans`, `--font-mono`, `--font-heading` para `var(--font-ibm-plex-mono)`

**Ficheiros a tocar:** `src/app/globals.css`

**Correcções esperadas:** Nenhuma identificada. Se algum token ou classe utilitária estiver em falta, adicionar ao bloco correcto.

**Verificação:** Confirmar que todos os tokens listados existem no bloco `.dark` com valores oklch correctos.

---

### TAREFA 3 — Auditar `sidebar.tsx` contra CA-01, CA-02, CA-03, CA-04

**Prioridade:** Alta
**Dependências:** TAREFA 2 (tokens devem existir)

**O que fazer:**
Abrir `src/components/layout/sidebar.tsx` e verificar linha a linha:

1. **CA-01** — `<aside>` usa `bg-sidebar` (não `bg-card`, não `bg-background`, não hexadecimal)
2. **CA-04** — Bordas usam `border-sidebar-border` (não `border-gray-*`, não hardcoded)
3. **CA-03** — Logo "FINTrack" usa `text-primary neon-primary-text`
4. **CA-03** — Item activo usa `text-primary border-l-2 border-primary`
5. **CA-02** — Itens inactivos usam `text-sidebar-foreground/60` (ou `text-muted-foreground`) — nunca `text-gray-*`
6. **CA-08** — Nenhum valor hexadecimal ou classe Tailwind fora do design system

**Ficheiros a tocar:** `src/components/layout/sidebar.tsx`

**Correcções esperadas:** Nenhuma identificada na auditoria prévia. Se alguma classe estiver errada, substituir pelo token correcto.

**Verificação:** Executar busca por `bg-white|bg-gray|bg-slate|text-white|text-gray|text-slate|border-gray|border-slate` no ficheiro — deve retornar zero resultados.

---

### TAREFA 4 — Auditar `navbar.tsx` contra CA-01, CA-02, CA-04

**Prioridade:** Alta
**Dependências:** TAREFA 2

**O que fazer:**
Abrir `src/components/layout/navbar.tsx` e verificar:

1. **CA-01** — `<header>` usa `bg-sidebar` (mesma camada da sidebar, não `bg-background`)
2. **CA-04** — Borda inferior usa `border-sidebar-border`
3. **CA-02** — Botão "Sair" usa `text-muted-foreground hover:text-foreground` — sem cores hardcoded
4. **CA-08** — Nenhum valor hexadecimal ou classe fora do design system

**Ficheiros a tocar:** `src/components/layout/navbar.tsx`

**Correcções esperadas:** Nenhuma identificada. Ficheiro é simples (27 linhas) — verificação rápida.

**Verificação:** Confirmar visualmente que `<header className="h-14 bg-sidebar border-b border-sidebar-border ...">` está presente.

---

### TAREFA 5 — Auditar `passphrase/page.tsx` contra CA-01 a CA-05, CA-07, CA-08, CA-10

**Prioridade:** Alta
**Dependências:** TAREFA 2

**O que fazer:**
Abrir `src/app/(auth)/passphrase/page.tsx` e verificar:

1. **CA-01** — Wrapper externo usa `bg-background`; card usa `bg-card`
2. **CA-03** — Logo "FINTrack" usa `text-primary neon-primary-text`
3. **CA-04** — Card usa `border border-input` (ou `border-border`) — sem `border-gray-*`
4. **CA-04** — Input usa `border border-input focus:ring-2 focus:ring-primary/60`
5. **CA-05** — Card usa classe `neon-border-primary`
6. **CA-05** — Botão "Entrar" usa classe `neon-primary` (não apenas no hover — permanente)
7. **CA-07** — Mensagem de erro usa `text-[var(--loss)]`
8. **CA-08** — Nenhum hexadecimal ou classe fora do design system
9. Botão usa `bg-primary text-primary-foreground` (CA-03)

**Ficheiros a tocar:** `src/app/(auth)/passphrase/page.tsx`

**Correcções esperadas:** Nenhuma identificada. Verificar em especial que `neon-primary` está no botão sem condicional (deve aplicar sempre, não só no hover).

**Verificação:** Confirmar `className="... neon-primary"` no botão submit sem prefixo `hover:`.

---

### TAREFA 6 — Auditar `dashboard/page.tsx` contra CA-01, CA-02, CA-05, CA-08, CA-11

**Prioridade:** Alta
**Dependências:** TAREFA 2

**O que fazer:**
Abrir `src/app/(dashboard)/dashboard/page.tsx` e verificar:

1. **CA-11** — Heading usa `text-2xl font-bold text-foreground`; subtítulo usa `text-muted-foreground text-sm`
2. **CA-01** — Cards usam `bg-card`; sem `bg-white` ou `bg-gray-*`
3. **CA-04** — Bordas usam `border-border/50`
4. **CA-05** — Card "Patrimônio Total" tem classe `neon-border-primary`
5. **CA-05** — Valor "R$ 0,00" tem classe `neon-primary-text`
6. **CA-02** — Valor usa `tabular-nums`
7. **CA-05** — `<hr>` usa classe `neon-divider`
8. **CA-08** — Nenhum hexadecimal ou classe fora do design system

**Ficheiros a tocar:** `src/app/(dashboard)/dashboard/page.tsx`

**Correcções esperadas:** Nenhuma identificada. Ficheiro tem estrutura clara de 32 linhas.

**Verificação:** Confirmar `neon-border-primary` no primeiro card e `neon-primary-text` no parágrafo do valor.

---

### TAREFA 7 — Auditar `settings/page.tsx` contra CA-01, CA-02, CA-05, CA-08, CA-11

**Prioridade:** Alta
**Dependências:** TAREFA 2

**O que fazer:**
Abrir `src/app/(dashboard)/settings/page.tsx` e verificar:

1. **CA-11** — Heading usa `text-2xl font-bold text-foreground`; subtítulo usa `text-muted-foreground text-sm`
2. **CA-01** — Card usa `bg-card`; sem `bg-white` ou `bg-gray-*`
3. **CA-04** — Borda do card usa `border-border/50`
4. **CA-05** — `<hr>` usa `neon-divider`
5. **CA-02** — Labels usam `text-muted-foreground uppercase tracking-wide`; valores usam `text-foreground`
6. **CA-08** — Nenhum hexadecimal ou classe fora do design system

**Ficheiros a tocar:** `src/app/(dashboard)/settings/page.tsx`

**Correcções esperadas:** Nenhuma identificada. Ficheiro simples (24 linhas).

**Verificação:** Confirmar que `<hr className="neon-divider ...">` está presente e que nenhum texto usa `text-white` ou `text-gray-*`.

---

### TAREFA 8 — Auditar `portfolio-client.tsx` contra CA-02, CA-03, CA-05, CA-08, CA-11

**Prioridade:** Alta
**Dependências:** TAREFA 2

**O que fazer:**
Abrir `src/components/portfolio/portfolio-client.tsx` e verificar:

1. **CA-11** — Heading usa `text-2xl font-bold text-foreground`; subtítulo usa `text-muted-foreground text-sm`
2. **CA-03** — Botão "Adicionar Posição" usa `bg-primary text-primary-foreground`
3. **CA-05** — Botão "Adicionar Posição" tem classe `neon-primary`
4. **CA-08** — Nenhum hexadecimal ou classe fora do design system
5. Estrutura do cabeçalho: `<div className="flex items-center justify-between mb-6">` — verificar se `mb-6` está presente para consistência de espaçamento (CA-11)

**Ficheiros a tocar:** `src/components/portfolio/portfolio-client.tsx`

**Correcções esperadas:** Nenhuma identificada.

**Verificação:** Confirmar `neon-primary` no botão e `text-2xl font-bold text-foreground` no `<h1>`.

---

### TAREFA 9 — Auditar `position-table.tsx` contra CA-01, CA-02, CA-03, CA-04, CA-06, CA-07, CA-08

**Prioridade:** Alta (ficheiro mais complexo — maior risco de regressão)
**Dependências:** TAREFA 2

**O que fazer:**
Abrir `src/components/portfolio/position-table.tsx` e verificar:

1. **CA-01** — `bg-card` no container da tabela e no estado vazio; `bg-muted/40` no header
2. **CA-04** — `border-border/50` no container; `border-border/60` no separador do header; `border-border/40` nas linhas
3. **CA-03** — `text-primary` nos tickers (`<td className="... text-primary ...">`)
4. **CA-06** — Verificar mapeamento de badges:
   - `stock` → `bg-[var(--chart-5)]/15 text-[var(--chart-5)]` (azul céu, `--chart-5`)
   - `etf` → `bg-[var(--chart-2)]/15 text-[var(--chart-2)]` (violeta, `--chart-2`)
   - `fii` → `bg-[var(--chart-3)]/15 text-[var(--chart-3)]` (âmbar, `--chart-3`)
   - `crypto` → `bg-[var(--chart-4)]/15 text-[var(--chart-4)]` (rosa, `--chart-4`)
   - fallback → `bg-muted text-muted-foreground`
5. **CA-07** — Botão "Remover" usa `text-[var(--loss)] hover:bg-[var(--loss)]/10`
6. **CA-02** — Headers da tabela usam `text-muted-foreground uppercase tracking-wide`; nome da posição usa `text-foreground/80`; moeda usa `text-muted-foreground`
7. **CA-02** — Valores numéricos usam `tabular-nums`
8. **CA-08** — Nenhum hexadecimal ou classe fora do design system
9. **ATENÇÃO — possível bug:** No `handleEditSubmit`, o cast de `asset_type` é `position.asset_type === "etf" ? "etf" : "stock"` — isto trata `fii` e `crypto` como `stock`. Verificar se o tipo `PositionFormData` aceita `fii` e `crypto`. Se sim, corrigir o cast para preservar todos os tipos suportados.

**Ficheiros a tocar:** `src/components/portfolio/position-table.tsx`, possivelmente `src/components/portfolio/position-form-dialog.tsx` (se o tipo for restrito aí)

**Correcções esperadas:**
- Se o cast de `asset_type` no edit for defeituoso, corrigir para: `asset_type: (["stock", "etf", "fii", "crypto"].includes(position.asset_type) ? position.asset_type : "stock") as PositionFormData["asset_type"]`
- Todas as outras verificações parecem corretas na auditoria prévia.

**Verificação:** Confirmar que `ASSET_TYPE_STYLES` tem as 4 entradas + fallback e que o cast do edit preserva todos os tipos válidos.

---

### TAREFA 10 — Varredura Global de Hardcoding nos 7 Ficheiros

**Prioridade:** Média (verificação de segurança pós-auditoria individual)
**Dependências:** TAREFAS 3–9

**O que fazer:**
Executar uma busca por padrões de cor hardcoded em todos os 7 ficheiros alterados. Corrigir qualquer resultado encontrado, substituindo pela classe Tailwind ou token `var()` equivalente do design system.

**Padrões a procurar:**
- Classes Tailwind light-mode: `bg-white`, `bg-gray-`, `bg-slate-`, `text-white`, `text-gray-`, `text-slate-`, `border-gray-`, `border-slate-`
- Hexadecimais inline: `#[0-9a-fA-F]{3,6}` (excepto se dentro de comentários)
- Classes de cor não pertencentes ao design system: `text-blue-`, `text-green-`, `text-red-`, `bg-blue-`, `bg-green-`, `bg-red-`

**Ficheiros a verificar:**
```
src/components/layout/sidebar.tsx
src/components/layout/navbar.tsx
src/app/(auth)/passphrase/page.tsx
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/settings/page.tsx
src/components/portfolio/portfolio-client.tsx
src/components/portfolio/position-table.tsx
```

**Correcções esperadas:** Nenhuma identificada na auditoria prévia, mas esta tarefa serve como net de segurança.

**Verificação:** Grep retorna zero resultados para os padrões acima nos 7 ficheiros.

---

### TAREFA 11 — Verificar Consistência de Espaçamento e Padding (CA-11)

**Prioridade:** Média
**Dependências:** TAREFAS 6–9

**O que fazer:**
Confirmar que o padrão de layout é consistente entre as 3 páginas do dashboard:

1. **Padding de página** — o `<main>` em `src/app/(dashboard)/layout.tsx` aplica `p-6`. Confirmar que nenhuma página duplica ou sobrepõe este padding desnecessariamente com `p-6` adicional na raiz da página.
2. **Espaçamento de heading** — confirmar que as 3 páginas usam o padrão:
   ```
   <h1 className="text-2xl font-bold text-foreground mb-1">...</h1>
   <p className="text-muted-foreground text-sm mb-6">...</p>
   ```
3. **Espaçamento entre secções** — cards e grids precedidos de `mb-6` onde aplicável.

**Ficheiros a tocar:**
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/components/portfolio/portfolio-client.tsx` (heading do portfólio)
- `src/app/(dashboard)/layout.tsx` (apenas leitura — não alterar o `p-6` do main)

**Correcções esperadas:** Nenhuma identificada. Todas as páginas seguem o padrão conforme auditoria prévia.

**Verificação:** Comparar as 3 páginas lado a lado e confirmar que o padrão de heading é idêntico.

---

### TAREFA 12 — Executar TypeCheck

**Prioridade:** Alta (obrigatório antes de considerar concluído)
**Dependências:** TAREFAS 1–11 (todas as correcções devem estar aplicadas)

**O que fazer:**
Executar o type check do projecto e resolver todos os erros encontrados.

```bash
npm run typecheck
```

**Resultado esperado:** Zero erros. Se houver erros:
- Ler a mensagem de erro completa
- Identificar o ficheiro e linha
- Corrigir o tipo sem usar `as any` ou `@ts-ignore` — preferir tipos correctos ou asserções de tipo seguras
- Re-executar até zero erros

**Ficheiros a tocar:** Qualquer ficheiro reportado pelo TypeScript. Provável candidato: `position-table.tsx` se o cast de `asset_type` for corrigido.

**Verificação:** Output do comando sem linhas de erro. `Found 0 errors.`

---

### TAREFA 13 — Executar Lint

**Prioridade:** Alta (obrigatório antes de considerar concluído)
**Dependências:** TAREFA 12

**O que fazer:**
Executar o linter do projecto e resolver todos os avisos e erros encontrados.

```bash
npm run lint
```

**Resultado esperado:** Zero erros e zero avisos. Se houver problemas:
- Ler cada item reportado
- Corrigir seguindo as regras do ESLint configurado (Next.js + TypeScript)
- Evitar desactivar regras com `eslint-disable` — preferir corrigir o problema
- Re-executar até output limpo

**Ficheiros a tocar:** Qualquer ficheiro reportado pelo ESLint.

**Verificação:** Output do comando sem erros ou avisos.

---

## Checklist de Definição de Pronto (DoD)

O Engineer deve confirmar cada item antes de marcar a tarefa como concluída para o QA:

- [ ] TAREFA 1: `layout.tsx` tem `className="dark"` no `<html>` e IBM Plex Mono configurado com 5 pesos
- [ ] TAREFA 2: `globals.css` tem todos os tokens `.dark` e todas as classes `.neon-*` em `@layer utilities`
- [ ] TAREFA 3: `sidebar.tsx` sem hardcoding, logo com `neon-primary-text`, item activo com `border-l-2 border-primary`
- [ ] TAREFA 4: `navbar.tsx` usa `bg-sidebar border-sidebar-border`
- [ ] TAREFA 5: `passphrase/page.tsx` tem `neon-border-primary` no card, `neon-primary` no botão (permanente), `text-[var(--loss)]` no erro
- [ ] TAREFA 6: `dashboard/page.tsx` tem `neon-border-primary` no card de patrimônio, `neon-primary-text` no valor, `neon-divider` no `<hr>`
- [ ] TAREFA 7: `settings/page.tsx` tem `neon-divider` no `<hr>`, sem hardcoding
- [ ] TAREFA 8: `portfolio-client.tsx` tem `neon-primary` no botão "Adicionar Posição"
- [ ] TAREFA 9: `position-table.tsx` tem badges corretos por tipo, tickers em `text-primary`, botão "Remover" em `text-[var(--loss)]`, cast de `asset_type` correcto no edit
- [ ] TAREFA 10: Grep retorna zero resultados de hardcoding nos 7 ficheiros
- [ ] TAREFA 11: As 3 páginas seguem o padrão de heading `text-2xl font-bold text-foreground mb-1` + `text-muted-foreground text-sm mb-6`
- [ ] TAREFA 12: `npm run typecheck` — zero erros
- [ ] TAREFA 13: `npm run lint` — zero erros

---

## Notas de Implementação

### Regra de prioridade para tokens de cor
1. Classe Tailwind mapeada: `text-primary`, `bg-card`, `border-border/50` — preferência máxima
2. Classe utilitária custom: `.neon-primary`, `.neon-divider` — para efeitos sem equivalente Tailwind
3. `var()` inline: `text-[var(--gain)]`, `text-[var(--loss)]` — apenas quando não há classe Tailwind equivalente
4. Hexadecimais ou cores hardcoded: **proibido**

### Não confundir tokens semelhantes
- `--sidebar` (`#0E111C`) vs `--card` (`#101421`) vs `--background` (`#0B0D18`) — são camadas distintas
- `--border` (branco 8%) vs `--input` (branco 12%) vs `--sidebar-border` (branco 8% mas token separado)
- `--muted-foreground` para labels/metadados vs `--foreground` para texto principal

### Limite de elementos neon por página
- Passphrase: card com `neon-border-primary` + botão com `neon-primary` = 2 elementos (correcto)
- Dashboard: card de patrimônio com `neon-border-primary` + valor com `neon-primary-text` + `<hr>` com `neon-divider` = 3 elementos (máximo permitido)
- Portfolio: botão com `neon-primary` = 1 elemento (correcto)
- Settings: `<hr>` com `neon-divider` = 1 elemento (correcto)
