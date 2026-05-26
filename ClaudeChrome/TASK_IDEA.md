# FINTrack — 5 Tasks Prioritárias

> Contexto: O FINTrack já possui autenticação, CRUD de posições, busca de preços via Yahoo Finance
> e identidade visual implementada. As tasks abaixo são a próxima camada crítica de valor.
> Restrições: sem integrações com corretoras (Degiro, Trading212), sem dividendos,
> sem performance histórica, sem stock analysis e sem watchlist.

---

## TASK 1 — Reformulação da Página de Portfólio (2 tabelas separadas)

**Prioridade:** Crítica — é o coração do produto.

### Contexto

A tabela atual (`AggregatedPositionTable`) mistura posições consolidadas com a lógica de
edição de entradas individuais. Precisa ser separada em duas tabelas distintas na mesma página.

### Tabela 1 — Posições Consolidadas (somente leitura)

Exibe a posição agregada por ticker. Não tem ações de edição diretamente.

Colunas:
| # | Campo | Descrição |
|---|-------|-----------|
| 1 | Ticker | Ícone do ativo + símbolo + mercado. Ex: `[ícone] WEBN.DE \| XETRA` |
| 2 | Nome Completo | Nome completo retornado pelo Yahoo Finance |
| 3 | Tipo | Badge colorido: Stock, ETF, FII, Crypto |
| 4 | Qtd. Total | Soma de todas as entradas do mesmo ticker. Até 5 casas decimais; omitir decimais se número inteiro |
| 5 | Preço Médio | Média ponderada de todas as entradas do mesmo ticker |
| 6 | Valor Atual | Preço atual × Qtd. Total |
| 7 | Ganho/Perda | Valor absoluto + percentual. Ex: `+€ 120,50 (3,2%)`. Verde se positivo, vermelho se negativo |
| 8 | Total Investido | Soma de (preço_médio × qtd) de todas as entradas |
| 9 | Sparkline 30d | Mini gráfico de linha dos últimos 30 dias do ativo |

### Tabela 2 — Histórico de Compras (entradas individuais, com CRUD)

Cada linha é uma entrada individual salva pelo utilizador. Aqui ficam os botões de editar e deletar.

Colunas:
| # | Campo | Descrição |
|---|-------|-----------|
| 1 | Ticker | Símbolo do ativo |
| 2 | Nome Completo | Nome completo do ativo |
| 3 | Broker | Dropdown: Degiro, Trading 212, Mirae, Outro |
| 4 | Tipo | Badge: Stock, ETF, FII, Crypto |
| 5 | Quantidade | Quantidade desta entrada específica |
| 6 | Preço Pago | Preço unitário pago nesta entrada |
| 7 | Total da Entrada | Preço Pago × Quantidade |
| 8 | Data de Compra | Formato DD/MM/YYYY |
| 9 | Ações | Botões Editar / Deletar |

### Formulário "Adicionar Posição"

Campos do modal:

- Ticker (com botão "Verificar" que valida e preenche o nome automaticamente)
- Tipo (Stock / ETF / FII / Crypto)
- Broker (Degiro / Trading 212 / Mirae / Outro)
- Quantidade
- Preço Pago por unidade
- Moeda (padrão: EUR, opções: EUR, BRL, USD)
- Data de Compra (DD/MM/YYYY)

### Regras de Negócio

- A Tabela 1 é sempre derivada da Tabela 2 — nunca editada diretamente.
- Ao adicionar/editar/deletar na Tabela 2, a Tabela 1 recalcula automaticamente.
- Preço médio ponderado: `Σ(qtd_i × preco_i) / Σ(qtd_i)` para entradas do mesmo ticker.
- Valor Atual = `current_price × totalQty`.
- Ganho/Perda = `(Valor Atual - Total Investido) / Total Investido × 100`.

---

## TASK 2 — Dashboard com Dados Reais

**Prioridade:** Alta — é a primeira tela que o utilizador vê; atualmente mostra `R$ 0,00` estático.

### Cards de Resumo (linha superior)

| Card              | Cálculo                                             |
| ----------------- | --------------------------------------------------- |
| Patrimônio Total  | `Σ (current_price × totalQty)` de todas as posições |
| Total Investido   | `Σ (avg_price × totalQty)` de todas as posições     |
| Ganho/Perda Total | `Patrimônio Total - Total Investido` (valor + %)    |
| Nº de Posições    | Contagem de tickers únicos                          |

### Gráficos (seção abaixo dos cards)

**Gráfico 1 — Distribuição por Tipo de Ativo (Pie/Donut Chart)**

- Dados: `Σ valor_atual` agrupado por tipo (Stock, ETF, FII, Crypto)
- Mostrar: percentual e valor absoluto de cada fatia
- Cores: usar tokens `--chart-1` a `--chart-4` do sistema de design

**Gráfico 2 — Distribuição por Ativo (Bar Chart Horizontal)**

- Dados: `% do portfólio` por ticker (top 10 se houver mais de 10)
- Eixo X: percentual (0% a 100%)
- Eixo Y: ticker + nome curto
- Cor: `--primary` (teal) com variação de opacidade

**Gráfico 3 — Ganho/Perda por Ativo (Bar Chart)**

- Dados: `ganho_perda_%` de cada ticker
- Barras verdes para positivo (`--gain`), vermelhas para negativo (`--loss`)
- Ordenado do maior ganho para a maior perda

### Regras

- Dashboard carrega os dados server-side na abertura.
- Se não há posições: mostrar cards com `—` e estado vazio nos gráficos.
- Preços vêm do cache existente (Yahoo Finance, 15 min TTL).

---

## TASK 3 — Validação de Ticker com Feedback Visual

**Prioridade:** Alta — atualmente erros de ticker são silenciosos, gerando dados inválidos.

### Comportamento esperado

1. Utilizador digita o ticker no campo do formulário.
2. Clica no botão "Verificar" (ícone de lupa ao lado do campo).
3. Estado: loading (spinner no botão).
4. Sucesso: campo nome preenchido automaticamente + badge verde com "Ticker válido: [Nome]".
5. Erro: badge vermelho com "Ticker não encontrado. Verifique o símbolo." — campo não avança.
6. O botão "Guardar" fica desabilitado até que o ticker seja verificado com sucesso.

### Estados do campo Ticker

- `idle` → campo vazio, botão "Verificar" visível
- `loading` → spinner, campo bloqueado
- `valid` → borda verde, nome exibido abaixo, botão "Guardar" habilitado
- `invalid` → borda vermelha, mensagem de erro, botão "Guardar" desabilitado
- `dirty` → utilizador editou o ticker após verificação → volta para `idle`, nome limpo

---

## TASK 4 — Botão de Logout na Página de Configurações

**Prioridade:** Média — ausência atual é um bug de UX (utilizador fica preso na sessão).

### Comportamento

- Botão "Sair" visível na página `/settings`.
- Posicionamento: zona de perigo — separado das outras configurações com divisor visual.
- Ao clicar: modal de confirmação "Tem a certeza que quer sair?" com botões "Cancelar" e "Sair".
- Ao confirmar: limpa a sessão/passphrase e redireciona para `/passphrase`.

### Seção da Página de Configurações (estrutura completa da página)

A página de settings ainda precisa de estrutura. Proposta:

- **Secção: Conta** — exibir info básica (sem edição por enquanto)
- **Secção: Preferências** — moeda padrão (EUR/BRL/USD), formato de data
- **Secção: Zona de Perigo** — botão "Sair" com estilo `variant="destructive"`

---

## TASK 5 — Botão "Atualizar Preços" Manual no Portfólio

**Prioridade:** Média — o cache de 15 minutos pode deixar preços desatualizados durante uso ativo.

### Comportamento

- Botão "Atualizar Preços" no header da página de Portfólio (ao lado de "Adicionar Posição").
- Ícone de refresh com label.
- Ao clicar: invalida o cache do banco para todas as posições do utilizador e busca preços frescos.
- Estado: loading com spinner por ticker sendo atualizado.
- Ao concluir: toast de sucesso "Preços atualizados" + dot neon pulsante nos preços atualizados.
- Mostrar timestamp "Atualizado há X min" ao lado de cada preço na tabela.

### Indicador de Frescura do Preço

- Na Tabela 1, coluna "Valor Atual": mostrar ícone de dot ao lado.
  - 🟢 dot verde pulsante (`neon-dot`) se atualizado há < 15 min
  - 🟡 dot âmbar se entre 15 min e 1h
  - 🔴 dot vermelho se > 1h

---

## Ordem de Execução Sugerida

```
1. TASK 3 (Validação de Ticker) — desbloqueia dados limpos para as demais tasks
2. TASK 1 (Reformulação do Portfólio) — core do produto
3. TASK 2 (Dashboard com Dados Reais) — depende de dados corretos do portfólio
4. TASK 4 (Logout) — quick win, independente
5. TASK 5 (Atualizar Preços) — melhoria de UX sobre base estável
```
