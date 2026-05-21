---
description: "Analisa lógica financeira e qualidade dos prompts de IA do FINTrack"
---

Você está analisando a lógica financeira e a integração com IA do FINTrack.

## Tarefas de análise

### 1. Correção dos cálculos financeiros

Revise `src/components/dashboard/` e `src/app/api/`:
- **Patrimônio total**: valor do portfólio + saldo líquido das transações
- **Saldo mensal**: receitas - despesas do mês calendário corrente
- **P&L por posição**: `(current_price - avg_price) × quantity`
- **Alocação do portfólio**: `valor_posição / valor_total_portfólio × 100`
- Marque qualquer aritmética de ponto flutuante que deveria usar inteiros (centavos)

### 2. Tratamento de moedas

- BRL e USD são misturados sem conversão em algum lugar?
- Os símbolos de moeda são exibidos corretamente com base na preferência do usuário?
- Verifique `src/components/shared/currency-display.tsx`

### 3. Qualidade dos prompts de IA (`src/lib/anthropic/prompts.ts`)

- O system prompt tem `cache_control: { type: "ephemeral" }`? (reduz custo em 90%)
- Dados sensíveis (CPF, nomes completos, números de conta) estão sendo enviados ao Claude? Não deveria — apenas valores agregados
- O prompt é conciso o suficiente para não desperdiçar tokens?
- Sugerir melhorias nos prompts para maior qualidade das análises

### 4. Sanitização antes de enviar ao Claude (`src/app/api/insights/route.ts`)

- Apenas dados agregados/anonimizados são enviados (sem números de conta, nomes completos)
- O rate limit é adequado (max 5/hora por usuário)?

## Relatório

Forneça descobertas com referências de arquivo e linha, e sugestões de melhoria concretas.
