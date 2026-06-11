"use client";

// Confirmação de remoção (1..N transacções) — usa o bulk delete da API,
// que revalida o ledger: remover compras com vendas dependentes devolve 422
// e a mensagem é mostrada aqui.

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteTransactionsDialogProps {
  ids: string[]; // [] = fechado
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteTransactionsDialog({
  ids,
  onOpenChange,
  onDeleted,
}: DeleteTransactionsDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (ids.length === 0) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/fable5/transactions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Erro ao remover as transacções");
        return;
      }
      onOpenChange(false);
      onDeleted();
    } catch {
      setError("Erro de rede ao remover");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={ids.length > 0}
      onOpenChange={(open) => {
        if (!open) setError(null);
        onOpenChange(open);
      }}
    >
      <AlertDialogContent className="bg-card border-border/50">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remover {ids.length} transacção(ões)?
          </AlertDialogTitle>
          <AlertDialogDescription>
            As transacções são removidas do ledger e todas as páginas derivadas
            (Holdings, Performance, Dashboard) são recalculadas. Esta acção não
            pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm text-[var(--loss)]" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-foreground hover:bg-destructive/90"
          >
            {deleting ? "A remover…" : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
