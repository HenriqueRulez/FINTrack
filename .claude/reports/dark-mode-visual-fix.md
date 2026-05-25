# Relatório de Auditoria — Identidade Visual Dark Mode

**Data:** 2026-05-23
**Engineer:** Claude Sonnet 4.6
**Working Item:** `.claude/working-items/dark-mode-visual-fix.md`
**Plano de Tarefas:** `.claude/tasks/dark-mode-visual-fix.md`

---

## Ficheiros Verificados e Status

| Ficheiro | Status | Observações |
|---|---|---|
| `src/app/layout.tsx` | APROVADO | IBM Plex Mono com pesos 300–700, `className="dark"` no `<html>`, `ibmPlexMono.variable` no `<body>`. Correcto. |
| `src/app/globals.css` | APROVADO | Todos os tokens `.dark` definidos (`--background`, `--card`, `--sidebar`, `--gain`, `--loss`, `--glow-*`, `--chart-1` a `--chart-5`, etc.). Classes `.neon-*` em `@layer utilities`. Mapeamento de fontes em `@theme inline`. Correcto. |
| `src/components/layout/sidebar.tsx` | APROVADO | `bg-sidebar`, `border-sidebar-border`, logo `text-primary neon-primary-text`, item activo `border-l-2 border-primary`. Sem hardcoding. |
| `src/components/layout/navbar.tsx` | APROVADO | `bg-sidebar`, `border-sidebar-border`, botão "Sair" `text-muted-foreground hover:text-foreground`. Sem hardcoding. |
| `src/app/(auth)/passphrase/page.tsx` | APROVADO | `bg-background`, card `bg-card neon-border-primary`, logo `text-primary neon-primary-text`, input `border-input focus:ring-primary/60`, botão `neon-primary` (permanente, não só hover), erro `text-[var(--loss)]`. |
| `src/app/(dashboard)/dashboard/page.tsx` | APROVADO | Heading `text-2xl font-bold text-foreground`, card patrimônio `neon-border-primary`, valor `neon-primary-text tabular-nums`, `<hr>` com `neon-divider`. |
| `src/app/(dashboard)/settings/page.tsx` | APROVADO | Heading `text-2xl font-bold text-foreground`, card `bg-card border-border/50`, `<hr>` `neon-divider`, labels `text-muted-foreground uppercase tracking-wide`, valores `text-foreground`. |
| `src/components/portfolio/portfolio-client.tsx` | APROVADO | Heading `text-2xl font-bold text-foreground`, subtítulo `text-muted-foreground text-sm`, botão `bg-primary text-primary-foreground neon-primary`, espaçamento `mb-6`. |
| `src/components/portfolio/position-table.tsx` | APROVADO (com correcção) | Badges corretos por tipo, tickers `text-primary`, botão "Remover" `text-[var(--loss)] hover:bg-[var(--loss)]/10`. Bug de cast corrigido (ver abaixo). |

---

## Correcções Aplicadas

### 1. Bug — Cast de `asset_type` no Edit Dialog (TAREFA 9)

**Problema identificado pelo SM:** O cast `position.asset_type === "etf" ? "etf" : "stock"` tratava `fii` e `crypto` como `stock`, perdendo o tipo original ao abrir o diálogo de edição.

**Ficheiros corrigidos:**

#### `src/components/portfolio/position-table.tsx`
```typescript
// ANTES (bugado):
asset_type: position.asset_type === "etf" ? "etf" : "stock",

// DEPOIS (correcto):
asset_type: (["stock", "etf", "fii", "crypto"].includes(position.asset_type)
  ? position.asset_type
  : "stock") as PositionFormData["asset_type"],
```

#### `src/components/portfolio/position-form-dialog.tsx`
- `PositionFormData["asset_type"]` alargado de `"stock" | "etf"` para `"stock" | "etf" | "fii" | "crypto"`
- `ASSET_TYPES` array alargado com entradas `fii` e `crypto`
- Estado `assetType` usa função auxiliar `resolveAssetType()` definida fora do componente — elimina o cast binário em dois locais (`useState` + `useEffect`)
- `VALID_ASSET_TYPES` e `AssetType` movidos para fora do componente (escopo de módulo)
- `onValueChange` do Select tipado para `AssetType`

#### `src/lib/validations/portfolio.ts`
- Schema Zod `PositionSchema.asset_type` alargado de `z.enum(["stock", "etf"])` para `z.enum(["stock", "etf", "fii", "crypto"])` para consistência com o frontend e aceitação correcta no servidor

---

## Varredura de Hardcoding (TAREFA 10)

Padrões pesquisados nos 7 ficheiros:
- `bg-white`, `bg-gray-*`, `bg-slate-*`, `text-white`, `text-gray-*`, `text-slate-*`
- `border-gray-*`, `border-slate-*`
- `text-blue-*`, `text-green-*`, `text-red-*`, `bg-blue-*`, `bg-green-*`, `bg-red-*`
- Hexadecimais inline

**Resultado: zero ocorrências.** Todos os ficheiros usam exclusivamente tokens CSS do design system.

---

## Output do TypeCheck

```
> fintrack@0.1.0 typecheck
> tsc --noEmit

(sem output de erros)
```

**Resultado: 0 erros.**

---

## Output do Lint

```
> fintrack@0.1.0 lint
> eslint src

(sem output de erros)
```

**Resultado: 0 erros, 0 avisos.**

---

## Critérios de Aceite — Checklist Final

- [x] CA-01: Fundos e camadas de superfície — `bg-background`, `bg-sidebar`, `bg-card`, `bg-muted/40`
- [x] CA-02: Texto e hierarquia tipográfica — `text-foreground`, `text-muted-foreground`, `tabular-nums`
- [x] CA-03: Acento teal — `text-primary`, `neon-primary-text`, `border-l-2 border-primary`, `bg-primary text-primary-foreground`
- [x] CA-04: Bordas e inputs — `border-sidebar-border`, `border-border/50`, `border-input`, `focus:ring-primary/60`
- [x] CA-05: Efeitos neon — `neon-border-primary`, `neon-primary-text`, `neon-primary`, `neon-divider` (máx. 3 por página)
- [x] CA-06: Badges de tipo de ativo — stock/etf/fii/crypto com `--chart-5/2/3/4`, fallback `bg-muted text-muted-foreground`
- [x] CA-07: Semântica financeira — `text-[var(--gain)]`/`text-[var(--loss)]`, botão "Remover" `text-[var(--loss)]`
- [x] CA-08: Zero hardcoding — nenhum hexadecimal ou classe fora do design system
- [x] CA-09: Tipografia IBM Plex Mono — pesos 300–700, variável CSS, `@apply font-sans`
- [x] CA-10: Dark mode forçado — `className="dark"` no `<html>`, sem toggle
- [x] CA-11: Consistência visual — heading `text-2xl font-bold text-foreground mb-1` + `text-muted-foreground text-sm mb-6` nas 3 páginas
- [x] CA-12: Sem regressões funcionais — lógica de auth, navegação, tabela e diálogos intacta

---

## Definição de Pronto — Concluído

Todos os 12 critérios de aceite verificados. `npm run typecheck` e `npm run lint` passam com zero erros. O bug de cast de `asset_type` foi corrigido em 3 ficheiros interdependentes (`position-table.tsx`, `position-form-dialog.tsx`, `portfolio.ts`). Nenhuma regressão introduzida.
