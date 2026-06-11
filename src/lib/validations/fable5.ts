import { z } from "zod";
import { localToday } from "@/lib/fable5/format";

// Sandbox Fable 5 — schemas das rotas /api/fable5/*

export const F5TransactionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)")
    .refine((d) => d <= localToday(), "Data não pode ser futura"),
  ticker: z
    .string()
    .trim()
    .min(1, "Ticker é obrigatório")
    .max(20, "Máximo 20 caracteres")
    .toUpperCase(),
  type: z.enum(["buy", "sell"]),
  // Obrigatório apenas quando o ticker é novo — validado na API.
  asset_type: z.enum(["stock", "etf", "crypto"]).optional(),
  qty: z
    .number({ invalid_type_error: "Quantidade deve ser um número" })
    .positive("Quantidade deve ser positiva"),
  price: z
    .number({ invalid_type_error: "Preço deve ser um número" })
    .nonnegative("Preço não pode ser negativo"),
  currency: z.enum(["EUR", "USD", "BRL"]).default("USD"),
  fee: z
    .number({ invalid_type_error: "Fee deve ser um número" })
    .nonnegative("Fee não pode ser negativa")
    .default(0),
  notes: z.string().max(2000).optional().nullable(),
});

export const F5TransactionUpdateSchema = F5TransactionSchema.partial();

export const F5AssetUpdateSchema = z.object({
  asset_type: z.enum(["stock", "etf", "crypto"]),
});

export const F5BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Pelo menos um id").max(200),
});

export const F5SettingsSchema = z.object({
  base_currency: z.enum(["EUR", "USD", "BRL"]),
  refresh_interval_minutes: z
    .number({ invalid_type_error: "Intervalo deve ser um número" })
    .int()
    .min(5, "Mínimo 5 minutos")
    .max(1440, "Máximo 1440 minutos"),
});

export const F5PortfolioQuerySchema = z.object({
  force: z
    .enum(["0", "1"])
    .optional()
    .default("0")
    .transform((v) => v === "1"),
});

export type F5TransactionInput = z.infer<typeof F5TransactionSchema>;
// Tipo de entrada do form (antes dos defaults do zod)
export type F5TransactionFormInput = z.input<typeof F5TransactionSchema>;
export type F5TransactionUpdate = z.infer<typeof F5TransactionUpdateSchema>;
export type F5SettingsInput = z.infer<typeof F5SettingsSchema>;
