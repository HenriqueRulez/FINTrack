import { z } from "zod";

export const UserSettingsSchema = z.object({
  full_name: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .optional()
    .nullable(),
  currency: z.enum(["BRL", "USD"]),
});

export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
