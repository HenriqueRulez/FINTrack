import { z } from "zod";

// Validação do write path do ledger (F-05) com os limites do A-01: qty/price/fee
// com tectos que evitam overflow/Infinity nos agregados JS; sinal correcto por
// tipo. `total` e `fx` NUNCA vêm do cliente — são calculados/capturados no
// servidor (recompute de total; captura de fx-on-date). Âmbito actual: buy/sell.

export const TRANSACTION_CURRENCIES = ["EUR", "USD", "GBP"] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 1e9;

// Data válida (round-trip exacto — barra 2026-02-30) e não-futura (não se compra
// no futuro); limite inferior sensato para apanhar erros grosseiros.
function isValidTradeDate(d: string): boolean {
  const dt = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return false;
  if (dt.toISOString().slice(0, 10) !== d) return false;
  const min = Date.UTC(2000, 0, 1);
  const maxFuture = Date.now() + 24 * 60 * 60 * 1000; // tolera "hoje" em qualquer fuso
  return dt.getTime() >= min && dt.getTime() <= maxFuture;
}

export const TransactionCreateSchema = z.object({
  date: z
    .string()
    .regex(DATE_RE, "Data deve estar em formato YYYY-MM-DD")
    .refine(isValidTradeDate, "Data inválida ou no futuro"),
  ticker: z
    .string()
    .min(1, "Ticker é obrigatório")
    .max(20, "Máximo 20 caracteres")
    .trim()
    .toUpperCase(),
  type: z.enum(["buy", "sell"]),
  qty: z
    .number({ invalid_type_error: "Quantidade deve ser um número" })
    .positive("Quantidade deve ser positiva")
    .max(MAX_AMOUNT, "Quantidade excede o limite"),
  price: z
    .number({ invalid_type_error: "Preço deve ser um número" })
    .min(0, "Preço não pode ser negativo")
    .max(MAX_AMOUNT, "Preço excede o limite"),
  currency: z.enum(TRANSACTION_CURRENCIES),
  fee: z
    .number({ invalid_type_error: "Fee deve ser um número" })
    .min(0, "Fee não pode ser negativa")
    .max(MAX_AMOUNT, "Fee excede o limite")
    .default(0),
  label: z.string().max(200, "Máximo 200 caracteres").trim().optional(),
});

// Update parcial — pelo menos um campo. id vem do path, não do body.
export const TransactionUpdateSchema = TransactionCreateSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  "Nenhum campo para actualizar"
);

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof TransactionUpdateSchema>;

// Recomputa o `total` no servidor — nunca aceite do cliente (A-01).
// buy: dinheiro que sai = qty·price + fee. sell: dinheiro que entra = qty·price − fee.
export function computeTotal(
  type: "buy" | "sell",
  qty: number,
  price: number,
  fee: number
): number {
  const gross = qty * price;
  const total = type === "buy" ? gross + fee : gross - fee;
  return Math.round(total * 10000) / 10000; // NUMERIC(15,4)
}
