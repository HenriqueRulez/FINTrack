import { z } from "zod";

export const PositionSchema = z.object({
  ticker: z
    .string()
    .min(1, "Ticker é obrigatório")
    .max(10, "Máximo 10 caracteres")
    .toUpperCase()
    .trim(),
  asset_type: z.enum(["stock", "etf", "fii", "crypto"]),
  quantity: z
    .number({ invalid_type_error: "Quantidade deve ser um número" })
    .positive("Quantidade deve ser positiva"),
  avg_price: z
    .number({ invalid_type_error: "Preço médio deve ser um número" })
    .positive("Preço médio deve ser positivo"),
  currency: z.enum(["EUR", "BRL", "USD"]).default("BRL"),
  exchange: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const PositionUpdateSchema = PositionSchema.partial().extend({
  id: z.string().uuid(),
});

export type PositionInput = z.infer<typeof PositionSchema>;
export type PositionUpdate = z.infer<typeof PositionUpdateSchema>;
