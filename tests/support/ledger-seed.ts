import type { LedgerSeedRow } from "./ledger";

// Seed canónico de 13 transacções que os specs transactions-ledger.spec.ts e
// transactions-redesign.spec.ts esperam (All=13, Buy/Sell=7, Cash=2, Conv=1,
// Div=2, Int=1). Reproduz fielmente o dataset histórico (src/components/
// transactions/mock-data.ts) mapeado para as colunas reais do ledger:
//   - ticker é NULL para cash/conv/int (o label carrega o texto na UI);
//   - div/buy/sell têm ticker real (CA-04 exige ticker != "—" nos dividendos);
//   - símbolos de moeda testados: PPLT=USD ($), AMAT=GBP (£), VWCE buy=EUR (€);
//   - sort desc → 22/04/2026 (CSPX) primeiro; sort asc → 10/12/2025 (PPLT) primeiro.
// Cada spec que o usa semeia-o no seu beforeAll e limpa no afterAll, por isso a
// ordem entre specs deixa de importar.
export const LEDGER_SEED_13: LedgerSeedRow[] = [
  // Buy / Sell (7)
  { date: "2026-04-02", ticker: "VWCE", type: "buy", qty: 15, price: 12.0, currency: "EUR", fx: 1.0, fee: 0.0, total: 180.0, label: null },
  { date: "2026-02-05", ticker: "AMAT", type: "buy", qty: 12, price: 556.0, currency: "GBP", fx: 1.0, fee: 0.0, total: 6672.0, label: null },
  { date: "2025-12-10", ticker: "PPLT", type: "buy", qty: 123, price: 1233.0, currency: "USD", fx: 1.1628, fee: 0.0, total: 151659.0, label: null },
  { date: "2026-04-22", ticker: "CSPX", type: "buy", qty: 14, price: 480.2, currency: "EUR", fx: 1.0, fee: 1.2, total: 6723.8, label: null },
  { date: "2026-03-18", ticker: "MSFT", type: "buy", qty: 5, price: 320.0, currency: "USD", fx: 1.0871, fee: 0.5, total: 1740.86, label: null },
  { date: "2026-03-30", ticker: "TSLA", type: "sell", qty: 4, price: 245.0, currency: "USD", fx: 1.0871, fee: 0.5, total: 1065.86, label: null },
  { date: "2026-03-12", ticker: "GLD", type: "sell", qty: 6, price: 198.2, currency: "USD", fx: 1.0871, fee: 0.5, total: 1293.41, label: null },
  // Cash Movement (2) — ticker NULL, label carrega o texto
  { date: "2026-01-15", ticker: null, type: "cash", qty: null, price: null, currency: "EUR", fx: 1.0, fee: 0.0, total: 5000.0, label: "Deposit · IBKR" },
  { date: "2026-02-28", ticker: null, type: "cash", qty: null, price: null, currency: "EUR", fx: 1.0, fee: 0.0, total: -1200.0, label: "Withdrawal" },
  // Conversion (1)
  { date: "2026-02-04", ticker: null, type: "conv", qty: 1000, price: 1.087, currency: "USD", fx: 1.0871, fee: 1.5, total: 1087.0, label: "EUR → USD" },
  // Dividend (2) — ticker real
  { date: "2026-03-01", ticker: "CSPX", type: "div", qty: null, price: null, currency: "EUR", fx: 1.0, fee: 0.0, total: 24.4, label: null },
  { date: "2026-04-01", ticker: "VWCE", type: "div", qty: null, price: null, currency: "EUR", fx: 1.0, fee: 0.0, total: 12.8, label: null },
  // Interest (1) — ticker NULL, label "Cash interest"
  { date: "2026-03-31", ticker: null, type: "int", qty: null, price: null, currency: "EUR", fx: 1.0, fee: 0.0, total: 8.16, label: "Cash interest" },
];
