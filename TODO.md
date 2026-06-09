# FINTrack — Tarefas

> **Regra:** Toda tarefa passa pelo pipeline completo `PO → Designer → SM → Engineer → QA → Security Review`.
> Claude executa diretamente apenas quando o utilizador pedir explicitamente.

## Redesigns Visuais (pipeline completa — iniciar com PO)

> Cada item abaixo requer o mesmo processo do Dashboard: PO cria working item com base nos protótipos em `.claude/design-handoff/project/`, depois segue pipeline completa. Primeira fase: apenas visual com dados mockados, sem funcionalidades.

- [x] **Holdings** — `Holdings.html` → nova página `/holdings` com 7 KPIs + tabela ordenável com alocação visual por ticker e logo colorido por classe de activo
- [x] **Performance** — `Performance.html` → nova página `/performance` com KPI strip com micro-visualizações (gauge, barra split, tick rows) + tabela de trade analysis com sparklines de 30 dias
- [x] **Transactions** — `Transactions.html` → nova página `/transactions` com filtros, tabs por tipo (BUY/SELL/CASH/DIV/etc.), tabela com badges coloridos e modo de edição
- [x] **Tax Calculator** — `Tax Calculator.html` → nova página `/tax-calculator` com 3 KPIs (Total Tax Liability, Capital Gains Tax, Dividend Tax) + painel Capital Gains + painel Dividend Tax

## Manutenção (manual — fazer EU, não pela pipeline)

- [x] **[EU]** Rever TODOS os agentes em `.claude/agents/*.md` e garantir que seguem o template correcto do `ola-sayer.md`
  - **Template de referência:** `.claude/agents/ola-sayer.md`
  - **O que verificar em cada agente** (`po`, `designer`, `frontend`, `sm`, `engineer`, `qa`, `security-reviewer`, `bug-reporter`, `db-schema-designer`):
    - Frontmatter completo: `name`, `description` (com blocos `<example>`/`<commentary>`), `model`, `color`, `memory: project`
    - Secção **Persistent Agent Memory** presente e a apontar para `.claude/agent-memory/<nome>/`
  - **Objectivo:** uniformizar todos os agentes ao formato do `ola-sayer` (o template validado como correcto)

## Features

- [x] Feedback de erro ao adicionar ticker inválido — mostrar mensagem clara quando o ticker não existe no Yahoo Finance (actualmente silencioso)
- [x] Validação/busca de ticker — mecanismo para verificar o ticker correcto antes de salvar (ex: botão "Verificar" que mostra nome + preço antes de confirmar)
- [ ] Reformular página de "Holdings", algumas coisas irão se manter, outras alterar ou remover por completo.
  - Deverá ter os campos **Company**, **Tipo**, **Portifolio%**, **Shares**, **Preço médio pago**, **current price**, **Ganho/perda**, **Total investido**
    - Descrição dos campos: - **Company**: mostrar o ticker do item, além disso deve ser adicionado o mercado do ticker em especifico e o ícone do ticker E.g.: "´[icone]´ WEBN.DE | XETRA", "´[icone]´AAPL | NASDAQ" , etc. Basicamente, o jeito que está agora está ótimo, será apenas adicionar o ícone da respectiva company no lugar da letra escrita - **Tipo**: ETF, Stock, Cripto, etc - **Portifolio%**: Do mesmo jeito que está agora, mostra a % total do que eu detenho, baseado na carteira inteira - **Total investido**: Valor mostrando o total investido - **Shares**: Quantidade total que possuo - **Preço médio**: O preço médio deve levar em consideração a soma de todas as entradas de mesmo ticker da segunda tabela, fazendo o calculo correto para definir o preço médio pago pelas posições. DO mesmo jeito que está atualmente - **current price**: valor atual do item - **Ganho/perda**: Valor mostrando o montante total e % (como está atualmente) com base no valor agregado da segunda tabela
    <!--[TBD] - Segunda tabela: **Ticker**, **Nome completo**, **Broker**, **Tipo**, **Quantidade total**, **Preço médio pago**, **valor atual**, **data de compra**
    - Descrição dos campos: (Os omitidos serão como os da tabela 1)
      - **Broker**: Dropdown contendo a lista de possiveis broker (Degiro, Trading212 e Mirae)
      - **data de compra**: Data no padrão DD/MM/YYYY -->
  - Ao clicar no botão "**+ Adicionar posição**", os campos devem corresponder ao necessário das tabelas, com excessão dos campos que serão preenchidos por calculos com base na entrada do utilizador.
  - O campo **MOEDA** deve estar preenchdo com EUR, por padrão
- [ ] Botão de logout na página de Configurações
- [ ] Dashboard com dados reais — patrimônio total (`Σ current_price × quantity`), número de posições, ganho/perda geral, breakdown por tipo de ativo
- [ ] Gráficos no Dashboard — ~4-5 charts relevantes (patrimônio, distribuição por tipo, ganho/perda, evolução)
- [ ] Forçar refresh de preços — botão "Atualizar Preços" na página do portfólio que invalida o cache e busca preços frescos do Yahoo Finance

## Bugs

> Pipeline: Bug Reporter → Engineer → QA. Para comportamentos incorretos encontrados em testes manuais.
> Formato obrigatório de cada item:
>
> ```
> - [ ] **[BUG]** Descrição curta do problema
>   - **Expected:** o que deveria acontecer
>   - **Actual:** o que está acontecendo
>   - **Reproduce:** passos para reproduzir
>   - **Severity:** critical / high / medium / low
> ```

_Sem bugs abertos._

## Done

- [x] **[BUG resolvido]** Botão aninhado dentro de botão no "Select All" do modo de edição — transactions-redesign (CA-07)
  - **Causa:** `CheckBox.tsx` renderizava sempre `<button role="checkbox">` e o "Select All" em `FilterRow.tsx` (204-215) envolvia-o noutro `<button onClick={onToggleAll}>` → `<button>` dentro de `<button>`, 2 erros de hidratação React.
  - **Correcção:** prop `interactive` no `CheckBox` (com `interactive={false}` renderiza `<span aria-hidden>` visual-only); o `<button>` exterior do "Select All" assumiu `role="checkbox"` + `aria-checked` (off/on/mixed) + foco por teclado. Único elemento clicável e acessível, comportamento select/deselect-all preservado.
  - **Verificado:** QA APROVADO em 1 ciclo (2026-06-08) — 4/4 CAs em Chrome real + Playwright 9/9. Relatório: `.claude/reports/qa-fix-transactions-select-all-nested-button.md`. (Security Review por correr — pedido do utilizador.)

- [x] **[BUG resolvido]** Dev server HTTP 500 — `Module not found: Can't resolve 'chevron-svg'`
  - **Causa:** Tailwind v4 escaneava `.claude/reports/*.md` e apanhava uma classe arbitrária de exemplo com `background-image:url(...)` apontando para um ficheiro inexistente, que o Turbopack tentava resolver como módulo CSS. (NOTA: não reescrever aqui a sintaxe literal da classe — fica fora dos `@source not` e re-introduz o bug.)
  - **Correcção:** `@source not` para `.claude/`, `tests/`, `supabase/` em `globals.css` (linhas 5-7). Confirmado: server arranca e `/transactions` carrega (2026-05-29).
- [x] Passphrase login
- [x] CRUD de posições no portfólio (ticker, tipo, quantidade, preço médio, moeda)
- [x] Nome automático via Yahoo Finance ao adicionar posição
- [x] Preço atual com cache de 15 minutos (banco + memória)
- [x] Colunas "Preço Atual" e "Total Gasto" na tabela do portfólio
- [x] Refresh automático de preços stale ao abrir o portfólio
- [x] Identidade visual dark mode — paleta teal, IBM Plex Mono, efeitos neon, tokens CSS
- [x] Badges coloridos por tipo de ativo (Stock, ETF, FII, Crypto)
- [x] Ordenação da tabela — mais recente no topo
- [x] Suporte a FII e Crypto no formulário e schema Zod
