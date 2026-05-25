# FINTrack — Security Findings

> Registo acumulado de todos os achados de segurança encontrados nas auditorias do pipeline.
> O Security Reviewer deve actualizar este ficheiro a cada ciclo de desenvolvimento.
> Relatórios completos em `.claude/reports/security-*.md`.

---

## Como usar este ficheiro

- **Aberto** — achado identificado, ainda não corrigido
- **Resolvido** — corrigido e verificado numa auditoria posterior
- **Aceite** — risco reconhecido e aceite conscientemente (ex: limitação de design, sem acção viável)

Ao fechar um achado, adicionar: `→ Resolvido em: [nome da feature] (YYYY-MM-DD)`

---

## Achados Abertos

### MÉDIO

| ID | Arquivo | Problema | Feature de origem | Data |
|----|---------|----------|-------------------|------|
| M-01 | `src/app/(auth)/passphrase/page.tsx:21` | Email `owner@fintrack.local` hardcoded no bundle do browser — reduz o ataque à só a password | Dark Mode Visual Fix | 2026-05-23 |
| M-02 | `src/components/portfolio/portfolio-client.tsx:45` | `body.error` da API logado em `console.error` — pode expor mensagens internas se API enriquecer erros | Ticker Validation | 2026-05-23 |
| M-03 | `src/components/portfolio/portfolio-client.tsx:37,56` | `id` de posição nas URLs de PATCH/DELETE sem `encodeURIComponent` — falta defesa em profundidade (mitigado pelo Zod UUID no backend) | Ticker Validation | 2026-05-23 |

### BAIXO / INFORMACIONAL

| ID | Arquivo | Problema | Feature de origem | Data |
|----|---------|----------|-------------------|------|
| B-01 | `next` (dependência transitiva) | `postcss@8.4.31` interno do Next.js — GHSA-qx2v-qp2m-jg93 (XSS build-time). Sem acção viável — aguardar patch do Next.js | Dark Mode Visual Fix | 2026-05-23 |
| B-02 | `src/components/portfolio/portfolio-client.tsx:27` | `console.error` expõe objecto de erro completo (stack trace) na consola do browser | Ticker Validation | 2026-05-23 |
| B-03 | `src/lib/rate-limit.ts:14` | Rate limiter em memória sem purge de entradas expiradas — potencial memory leak (negligível para app pessoal) | Ticker Validation | 2026-05-23 |
| B-04 | `src/lib/yahoo-finance/client.ts:27` | Cache do Yahoo Finance sem limite de tamanho de entradas (mitigado pelo rate limit de 20 req/min no verify-ticker) | Ticker Validation | 2026-05-23 |
| B-05 | `src/lib/yahoo-finance/client.ts:45` | `historyCache` (Map) para dados históricos sem limite de entradas — memory leak potencial idêntico ao B-04. Negligível para app pessoal com <100 tickers | Portfolio Aggregated View | 2026-05-23 |
| B-06 | `src/lib/yahoo-finance/client.ts:104` | `console.error` em `getHistory` loga ticker + objecto de erro completo do Yahoo Finance (stack trace) nos logs do servidor. Risco baixo: ticker é validado por Zod, log é server-side | Portfolio Aggregated View | 2026-05-23 |

---

## Achados Aceites (risco reconhecido, sem acção)

| ID | Arquivo | Problema | Motivo de aceite | Data |
|----|---------|----------|------------------|------|
| A-01 | `src/app/(auth)/passphrase/page.tsx:57` | Mensagem "Palavra-passe incorrecta" confirma existência do utilizador (user enumeration) | App single-user por design — risco desprezível | 2026-05-23 |

---

## Achados Resolvidos

_Nenhum ainda._

---

## Instruções para o Security Reviewer

A cada ciclo de desenvolvimento, após a auditoria:

1. **Adicionar novos achados** nas tabelas acima com o ID sequencial correcto (M-XX, B-XX, A-XX)
2. **Verificar se algum achado aberto foi resolvido** pela feature actual — se sim, mover para "Resolvidos" com a data e feature
3. **Não duplicar** — verificar se o achado já existe antes de adicionar
4. **Relatório completo** continua a ser guardado em `.claude/reports/security-[feature].md`

---

## Resumo de Estado

| Categoria | Abertos | Resolvidos | Aceites |
|-----------|---------|------------|---------|
| Crítico   | 0       | 0          | 0       |
| Alto      | 0       | 0          | 0       |
| Médio     | 3       | 0          | 0       |
| Baixo     | 6       | 0          | 1       |
| **Total** | **9**   | **0**      | **1**   |
