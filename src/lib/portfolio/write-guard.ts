// Guard de integridade para o write path do ledger (F-05 / A-01): dado o
// conjunto de linhas que RESULTARIA de uma mutação (create/update/delete),
// verifica se algum sell passa a exceder a quantidade detida (oversell) — o que
// também apanha apagar uma compra que suporta uma venda posterior.
// Devolve a mensagem PT do primeiro erro, ou null se o ledger fica válido.

import { validateLedger, formatLedgerError } from "./ledger";
import { mapRowsToLedgerTx, type TransactionRow } from "./derive";

export function ledgerErrorFor(rows: TransactionRow[]): string | null {
  const errors = validateLedger(mapRowsToLedgerTx(rows));
  return errors.length > 0 ? formatLedgerError(errors[0]) : null;
}
