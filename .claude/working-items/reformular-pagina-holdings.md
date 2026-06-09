---
feature: Reformular página de Holdings — Fase 1 (visual/mock)
status: ready
phase: Fase 1 — Redesign visual da /holdings (sem wiring real, sem persistência)
created: 2026-06-09
source: TODO.md linhas 28-36
---

### Reformular página de Holdings (Fase 1 — visual/mock)

> **NOTA DE FASE — LER PRIMEIRO**
> Esta é a **Fase 1: redesign puramente visual** da página `/holdings`, que **já é mockada**.
> NÃO há wiring com API, NÃO há persistência em base de dados, NÃO há cálculo ponderado real.
> Toda a lógica de dados continua a usar `src/components/holdings/mock-data.ts`.
> A página antiga `/portfolio` (Supabase/CRUD) foi apagada em 2026-06-09 — tudo vive agora em `/holdings`.
> **Idioma do produto: INGLÊS.** Todos os labels de UI devem ser escritos em inglês, ainda que a spec original (TODO.md) esteja em português.

**User Story**
Como utilizador do FINTrack, quero ver as minhas posições numa tabela de holdings mais clara e completa (com ícone da empresa, mercado, tipo de ativo e total investido) para que eu identifique rapidamente cada posição e a sua composição, mesmo enquanto os dados ainda são de demonstração.

**Contexto**
A página `/holdings` já existe e é mockada, mas a coluna Company mostra apenas as duas primeiras letras do ticker num quadrado colorido e faltam informações úteis (mercado/exchange e tipo de ativo). Esta iteração reorganiza visualmente a tabela e adiciona um modal visual de "Add position" para validar o layout antes de qualquer ligação a dados reais. O objetivo é fechar a aparência da página nesta fase, deixando o wiring real (preços, persistência, cálculo ponderado) para fases seguintes.

**Objetivo**
Entregar o layout final da tabela de holdings e do modal de adicionar posição, em inglês, operando 100% sobre dados mock, sem persistência.

---

**Critérios de Aceite**

_Coluna Company_

- [ ] CA1: Na coluna **Company**, o quadrado colorido que hoje mostra as 2 primeiras letras do ticker é substituído por um **ícone/placeholder local da empresa** (mock — sem buscar logos externos nesta fase).
- [ ] CA2: Ao lado do ticker, o utilizador vê o **mercado/exchange** no formato `TICKER | EXCHANGE`. Exemplos de teste: `WEBN.DE | XETRA`, `AAPL | NASDAQ`.
- [ ] CA3: Cada holding no mock passa a ter um campo `exchange` (o campo não existe hoje e deve ser adicionado ao mock). Cada linha visível mostra o exchange correspondente; nenhuma linha mostra exchange vazio ou "undefined".

_Coluna Type (nova)_

- [ ] CA4: Existe uma **coluna nova "Type"** que deriva o seu valor do campo `assetClass` já presente no mock.
- [ ] CA5: Os valores são apresentados com labels em inglês no singular: `Stocks → Stock`, `ETFs → ETF`, `Crypto → Crypto`, `Other → Other`, renderizados como texto ou badge.

_Renomeação e colunas mantidas_

- [ ] CA6: A coluna hoje rotulada **"Cost Basis"** passa a chamar-se **"Total Invested"** (apenas o label muda; o valor mostrado permanece o mesmo, vindo de `costBasis` no mock).
- [ ] CA7: A coluna **"Market Value"** é **mantida** como coluna extra (9ª coluna), com o mesmo valor que mostra hoje.
- [ ] CA8: As colunas **Portfolio%**, **Shares**, **Avg Cost**, **Current Price** e **Gain/Loss** mantêm-se com o comportamento e valores atuais.
- [ ] CA9: O valor de **Avg Cost** (preço médio) permanece o valor mock fixo atual — não há cálculo ponderado nesta fase (o cálculo dependia da 2ª tabela de histórico, que está fora de escopo).

_Botão e modal "Add position"_

- [ ] CA10: Existe um botão **"+ Add position"** visível na página de holdings (este botão não existe hoje e deve ser adicionado).
- [ ] CA11: Ao clicar em **"+ Add position"**, abre um **modal visual** com campos de input. O modal **não persiste** nada — é puramente visual nesta fase.
- [ ] CA12: O modal contém os campos de input: **ticker**, **market/exchange**, **type**, **shares**, **price paid** e **currency**.
- [ ] CA13: O campo **currency** vem pré-preenchido com **EUR** por padrão ao abrir o modal.
- [ ] CA14: Os campos **calculados** (Portfolio%, Gain/Loss, Total Invested, Current Price, Market Value) **NÃO** aparecem como campos de input no modal.
- [ ] CA15: Fechar o modal (cancelar ou submeter) não altera os dados da tabela — confirma que não há persistência (comportamento mock).

_Elementos mantidos sem alteração_

- [ ] CA16: Os **7 KPIs do topo** mantêm-se exatamente como estão hoje (sem alterações de conteúdo nem layout).
- [ ] CA17: O **currency selector de visualização** (EUR / USD / Native) mantém-se e funciona como hoje. É independente do campo "currency" do modal de Add position — alterar um não afeta o outro.

_Idioma_

- [ ] CA18: Todos os labels de UI novos ou alterados estão em **inglês** (ex.: "Type", "Avg Cost", "Gain/Loss", "Total Invested", "+ Add position", "Market", "Shares", "Price paid", "Currency").

---

**Requisitos Não-Funcionais**

- A tabela deve permanecer legível com a 9ª coluna adicionada (Market Value) sem quebrar o layout em ecrãs comuns; o scroll horizontal existente continua a ser aceitável.
- Os ícones/placeholders de empresa são locais — nenhuma imagem externa é carregada nesta fase (evita questões de CSP/segurança, que ficam para o wiring real).

---

**Dependências**

- Nenhuma dependência de novas tabelas ou API. Tudo assenta sobre o mock existente em `src/components/holdings/mock-data.ts` (necessita apenas de adicionar o campo `exchange` ao mock).

---

**Fora do Escopo**

- **2ª tabela (histórico de posições por broker)** — está marcada como `[TBD]` no TODO.md e NÃO faz parte desta iteração. Consequentemente, o cálculo ponderado do preço médio (que dependia dessa tabela) também fica fora — o Avg Cost permanece valor mock fixo.
- **Persistência de dados** — o modal "Add position" é apenas visual; nenhum dado é guardado.
- **Wiring com preços reais** (Yahoo Finance), ligação a Supabase e cálculos agregados reais.
- **Logos externos de empresas** — nesta fase usa-se placeholder/logo local apenas.
- Alterações aos 7 KPIs do topo e ao currency selector de visualização (mantêm-se como estão).
