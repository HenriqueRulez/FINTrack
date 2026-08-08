import { z } from "zod";

export const LoginSchema = z.object({
  passphrase: z.string().min(1, "Palavra-passe obrigatória"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
