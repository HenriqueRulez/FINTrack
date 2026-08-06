import { z } from "zod";

// Validação do corpo do endpoint POST /api/transactions/import.
// O CSV chega como texto (o cliente lê o ficheiro e envia o conteúdo). O cap de
// tamanho protege contra DoS por payload (Route Handlers não têm limite do
// framework — o tecto fica aqui). dryRun distingue pré-visualização (default,
// nunca grava sem confirmação) de gravação efectiva.

const MAX_CSV_CHARS = 2 * 1024 * 1024; // ~2MB

export const ImportRequestSchema = z.object({
  csv: z
    .string({ invalid_type_error: "CSV deve ser texto" })
    .min(1, "Ficheiro CSV vazio")
    .max(MAX_CSV_CHARS, "Ficheiro excede o limite de ~2MB"),
  dryRun: z.boolean().default(true),
});

export type ImportRequestInput = z.infer<typeof ImportRequestSchema>;
