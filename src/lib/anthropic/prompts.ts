// System prompt with cache_control so Anthropic caches it after the first call.
// Subsequent requests within the 5-minute TTL pay 0.1x the base input token price.
// Minimum 1024 tokens required for caching to activate.

export function buildInsightsSystemPrompt() {
  return [
    {
      type: "text" as const,
      text: `Você é o assistente financeiro pessoal do FINTrack, um app de controle financeiro brasileiro.

Sua missão é analisar os dados financeiros do usuário e fornecer insights claros, honestos e acionáveis.

## Como analisar

1. **Padrões de gastos**: Identifique as principais categorias de despesa, tendências e anomalias nos últimos 90 dias
2. **Fluxo de caixa**: Compare receitas vs despesas — saldo mensal líquido
3. **Portfólio de investimentos**: Analise P&L por posição, concentração (risco de diversificação), retorno total
4. **Recomendações**: Forneça 3-5 ações específicas e priorizadas que o usuário pode tomar agora

## Formato da resposta

- Use markdown com títulos claros (##)
- Comece com um resumo executivo de 2-3 frases
- Use listas para recomendações
- Seja específico com os números dos dados fornecidos
- Máximo 800 palavras no total
- Tom: profissional mas acessível, como um amigo que entende de finanças

## Limitações importantes

Você NÃO fornece:
- Recomendações de compra/venda de ações específicas
- Previsões de mercado
- Conselho fiscal ou tributário

Sempre lembre o usuário de consultar um assessor financeiro certificado (CFP) para decisões de investimento de maior porte.`,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

export function buildInsightsUserPrompt(data: {
  transactions: Array<{
    type: string;
    amount: number;
    category: string;
    date: string;
  }>;
  positions: Array<{
    ticker: string;
    quantity: number;
    avg_price: number;
    current_price: number | null;
    currency: string;
  }>;
  currency: string;
  period: string;
}): string {
  const totalIncome = data.transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = data.transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const portfolioValue = data.positions.reduce((sum, p) => {
    const price = p.current_price ?? p.avg_price;
    return sum + price * p.quantity;
  }, 0);

  return `Analise meus dados financeiros dos últimos ${data.period}.

## Resumo do Período
- Receita total: ${data.currency} ${totalIncome.toFixed(2)}
- Despesa total: ${data.currency} ${totalExpense.toFixed(2)}
- Saldo líquido: ${data.currency} ${(totalIncome - totalExpense).toFixed(2)}
- Valor do portfólio: ${portfolioValue.toFixed(2)} (moedas mistas)

## Transações (${data.transactions.length} lançamentos)
${JSON.stringify(data.transactions, null, 2)}

## Portfólio de Investimentos (${data.positions.length} posições)
${JSON.stringify(data.positions, null, 2)}

Por favor, forneça uma análise completa com recomendações específicas.`;
}
