# Especificação Visual — Logout na Página de Configurações

**Working Item:** `.claude/working-items/logout-settings-page.md`
**DESIGN.md:** consultado ✅

## Resumo Visual

A página de Configurações recebe uma secção de "Gestão de sessão" claramente separada do bloco de perfil do utilizador, contendo um botão de "Terminar sessão" com estilo destrutivo. A separação visual entre perfil e logout é conseguida através de um divisor `neon-divider` e espaçamento generoso, prevenindo acções acidentais. O botão comunica imediatamente a sua natureza de saída através da variante `destructive`, mantendo coerência com o design system existente.

## Componentes a Criar

### LogoutButton
- **Localização:** `src/components/settings/logout-button.tsx`
- **Tipo:** Client Component (`'use client'`)
- **Layout:** Bloco autónomo — flex row com ícone à esquerda e texto do botão, alinhado à esquerda dentro do card
- **Tokens CSS:** `bg-destructive/10`, `text-destructive`, `hover:bg-destructive/20`, `border-border/50`, `bg-card`
- **Classes neon:** nenhuma — botão destrutivo não recebe glow neon (princípio de uso: neon é destaque positivo)
- **shadcn/ui:** `Button` com `variant="destructive"` e `size="default"`
- **Estados visuais:**
  - **Idle:** botão com fundo `bg-destructive/10`, texto `text-destructive`, label "Terminar sessão"
  - **Loading/Pending:** botão `disabled`, opacidade reduzida (`disabled:opacity-50` já no CVA), label muda para "A terminar sessão…" com indicador textual (sem spinner externo para manter o minimalismo)
  - **Erro:** não aplicável — logout raramente falha; em caso de falha, redireciona da mesma forma
- **Comportamento:** click → `supabase.auth.signOut()` → `router.push("/login")` + `router.refresh()`. Durante a operação assíncrona, `isPending = true` desactiva o botão via `disabled={isPending}`

## Componentes a Modificar

### SettingsPage
- **Localização:** `src/app/(dashboard)/settings/page.tsx`
- **Alteração:** Adicionar uma segunda card (ou secção dentro da card existente) abaixo do bloco de perfil, separada por espaçamento `mt-4` e um `<hr className="neon-divider">` entre as duas áreas. A nova secção contém o título "Sessão" e o componente `<LogoutButton />`.
- **Impacto visual:** O utilizador vê claramente dois blocos distintos na página: "Perfil" (e-mail + ID) e "Sessão" (botão de logout). A separação espacial e o divisor neon tornam impossível confundir as duas áreas.

## Hierarquia Visual da Página

```
[Título de página] "Configurações"          ← text-2xl font-bold text-foreground
[Subtítulo]        "Perfil e preferências"   ← text-sm text-muted-foreground mb-6

[Card — max-w-lg bg-card border-border/50 rounded-xl p-6]
  ├── [neon-divider]
  ├── [Label] "E-MAIL"                       ← text-xs text-muted-foreground uppercase tracking-wide
  ├── [Valor] user.email                     ← text-sm font-medium text-foreground
  ├── [Espaço] mb-5
  ├── [Label] "ID DA CONTA"                  ← text-xs text-muted-foreground uppercase tracking-wide
  └── [Valor] user.id                        ← font-mono text-xs text-muted-foreground

[Card — max-w-lg bg-card border-border/50 rounded-xl p-6 mt-4]
  ├── [Label de secção] "SESSÃO"             ← text-xs text-muted-foreground uppercase tracking-wide mb-4
  ├── [Texto de suporte] "Termina a sessão…" ← text-sm text-muted-foreground mb-4 (opcional, mas recomendado para clareza)
  └── [LogoutButton]                         ← Button variant="destructive" size="default"
                                                label: "Terminar sessão"
                                                estado loading: "A terminar sessão…" + disabled
```

A separação em **dois cards distintos** (não secções dentro do mesmo card) é a forma mais segura de evitar cliques acidentais — há distância física e uma fronteira visual clara entre os dados de perfil e a acção destrutiva.

## Tokens e Classes Utilizados

| Elemento | Token/Classe | Motivo |
|----------|-------------|--------|
| Background dos cards | `bg-card` | Consistência com padrão existente |
| Borda dos cards | `border-border/50` | Padrão FINTrack para cards |
| Border radius dos cards | `rounded-xl` | Consistência com card de perfil existente |
| Padding interno | `p-6` | Padrão FINTrack para cards |
| Separação entre cards | `mt-4` | Grid base 4px × 4 = 16px de gap |
| Label de secção | `text-xs text-muted-foreground uppercase tracking-wide` | Padrão já em uso na página |
| Texto de suporte | `text-sm text-muted-foreground` | Hierarquia de texto secundário |
| Botão de logout (idle) | `variant="destructive"` → `bg-destructive/10 text-destructive hover:bg-destructive/20` | Acção destrutiva/de saída — comunicação clara de risco |
| Botão desactivado | `disabled:opacity-50 disabled:pointer-events-none` | Já incluído no CVA do Button |
| Divisor interno no card de perfil | `neon-divider` | Já presente na implementação actual |

## Estados e Feedback Visual

| Estado | Comportamento Visual |
|--------|---------------------|
| Idle | Botão `variant="destructive"` com label "Terminar sessão", fundo sutil vermelho `bg-destructive/10` |
| Loading (pending) | Botão com `disabled={true}`, label muda para "A terminar sessão…", opacidade 50% (`disabled:opacity-50` do CVA) — sem spinner para manter minimalismo |
| Sucesso | Não visível na página — redirect automático para `/login` |
| Erro (improvável) | Não há estado de erro dedicado — o redirect acontece de qualquer forma após `signOut()` |

## Notas para o Frontend

1. **Client Component obrigatório:** `LogoutButton` deve ser `'use client'` pois usa `useState` para `isPending` e hooks do router. A `SettingsPage` permanece Server Component — basta importar `<LogoutButton />` dentro dela.

2. **Padrão de logout idêntico ao Navbar:** usar `createClient()` de `@/lib/supabase/client`, chamar `supabase.auth.signOut()`, depois `router.push("/login")` e `router.refresh()`. Não criar nova lógica — reutilizar o padrão já validado em `navbar.tsx`.

3. **Estado `isPending`:** usar `useState<boolean>(false)`. No handler: `setIsPending(true)` → await signOut → push → (o componente desmonta, não é necessário `setIsPending(false)`).

4. **Dois cards separados, não secções no mesmo card:** a separação em cards distintos garante que o utilizador percebe visualmente que são áreas independentes. Usar `max-w-lg` nos dois para alinhamento consistente.

5. **Sem neon no botão destrutivo:** o glow neon teal é reservado para destaques positivos/informativos. O vermelho destrutivo comunica sozinho — adicionar glow seria ruído visual.

6. **Responsividade:** `max-w-lg w-full` nos dois cards — em mobile ocupam largura total, em desktop ficam limitados a `lg` (512px). Sem necessidade de breakpoints adicionais.

7. **Acessibilidade:** o botão deve ter `aria-label="Terminar sessão"` explícito, e quando `isPending=true` deve também ter `aria-busy="true"`.
