"use client";

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

interface PositionDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticker: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PositionDeleteDialog({
  open,
  onOpenChange,
  ticker,
  onConfirm,
  isLoading = false,
}: PositionDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover posição</AlertDialogTitle>
          <AlertDialogDescription>
            Tem a certeza que pretende remover a posição{" "}
            <strong>{ticker}</strong>? Esta acção não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "A remover..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
