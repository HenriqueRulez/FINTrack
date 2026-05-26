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

// ---------------------------------------------------------------------------
// Dashboard / Chart query schemas
// ---------------------------------------------------------------------------

export const ChartQuerySchema = z.object({
  tf: z
    .enum(["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"])
    .default("3M"),
});

export type TimeFrame = z.infer<typeof ChartQuerySchema>["tf"];

// ---------------------------------------------------------------------------
// Holdings query schema — para futura GET /api/portfolio/holdings (Fase 2)
// ---------------------------------------------------------------------------

export const HoldingsQuerySchema = z.object({
  currency: z.enum(["EUR", "USD"]).optional().default("EUR"),
  showSold: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  sortCol: z
    .enum(["ticker", "pct", "shares", "avg", "cost", "price", "value", "gain"])
    .optional()
    .default("value"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type HoldingsQuery = z.infer<typeof HoldingsQuerySchema>;
