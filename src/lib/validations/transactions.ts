import { z } from "zod";

// ---------------------------------------------------------------------------
// Transactions — investment ledger
// Molde: validations/portfolio.ts
// Fase 0 só precisa de leitura; o schema de input fica pronto para a Fase 1.
// ---------------------------------------------------------------------------

export const TRANSACTION_TYPES = [
  "buy",
  "sell",
  "cash",
  "conv",
  "div",
  "int",
] as const;

export const TRANSACTION_CURRENCIES = ["EUR", "USD", "GBP"] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const TransactionSchema = z.object({
  date: z
    .string()
    .regex(ISO_DATE, "Data deve estar no formato YYYY-MM-DD"),
  ticker: z
    .string()
    .min(1, "Ticker é obrigatório")
    .max(20, "Máximo 20 caracteres")
    .trim()
    .optional()
    .nullable(),
  type: z.enum(TRANSACTION_TYPES),
  qty: z
    .number({ invalid_type_error: "Quantidade deve ser um número" })
    .positive("Quantidade deve ser positiva")
    .optional()
    .nullable(),
  price: z
    .number({ invalid_type_error: "Preço deve ser um número" })
    .positive("Preço deve ser positivo")
    .optional()
    .nullable(),
  currency: z.enum(TRANSACTION_CURRENCIES),
  fx: z
    .number({ invalid_type_error: "FX deve ser um número" })
    .positive("FX deve ser positivo")
    .default(1),
  fee: z
    .number({ invalid_type_error: "Taxa deve ser um número" })
    .min(0, "Taxa não pode ser negativa")
    .default(0),
  total: z.number({ invalid_type_error: "Total deve ser um número" }),
  label: z
    .string()
    .max(200, "Máximo 200 caracteres")
    .trim()
    .optional()
    .nullable(),
});

export const TransactionUpdateSchema = TransactionSchema.partial().extend({
  id: z.string().uuid(),
});

export type TransactionInput = z.infer<typeof TransactionSchema>;
export type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>;
