"use client";

// Dialog de criar/editar transacção do sandbox Fable 5 (molde: o antigo
// position-form-dialog da Fase 1). react-hook-form + zodResolver com o mesmo
// schema da API; o asset_type só aparece quando o ticker é novo.
// Erros 422 da API (oversell, ticker inválido) são mostrados no dialog.

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  F5TransactionSchema,
  type F5TransactionFormInput,
  type F5TransactionInput,
} from "@/lib/validations/fable5";
import { localToday } from "@/lib/fable5/format";
import type { F5Asset, F5Transaction } from "@/lib/fable5/types";

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: F5Transaction | null; // null = criar
  assets: Record<string, F5Asset>;
  onSaved: () => void;
}

function emptyForm(): F5TransactionFormInput {
  return {
    date: localToday(),
    ticker: "",
    type: "buy",
    asset_type: "stock",
    qty: 0,
    price: 0,
    currency: "USD",
    fee: 0,
    notes: null,
  };
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  assets,
  onSaved,
}: TransactionFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<F5TransactionFormInput, unknown, F5TransactionInput>({
    resolver: zodResolver(F5TransactionSchema),
    defaultValues: emptyForm(),
  });

  useEffect(() => {
    if (open) {
      setApiError(null);
      reset(
        transaction
          ? {
              date: transaction.date,
              ticker: transaction.ticker,
              type: transaction.type,
              asset_type: undefined,
              qty: transaction.qty,
              price: transaction.price,
              currency: transaction.currency,
              fee: transaction.fee,
              notes: transaction.notes,
            }
          : emptyForm()
      );
    }
  }, [open, transaction, reset]);

  const watchedTicker = (watch("ticker") ?? "").trim().toUpperCase();
  const isNewTicker = watchedTicker.length > 0 && !assets[watchedTicker];

  async function onSubmit(values: F5TransactionInput) {
    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        ...values,
        // asset_type só interessa para tickers novos
        asset_type: isNewTicker ? (values.asset_type ?? "stock") : undefined,
      };
      const res = await fetch(
        transaction
          ? `/api/fable5/transactions/${transaction.id}`
          : "/api/fable5/transactions",
        {
          method: transaction ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setApiError(body?.error ?? "Erro ao gravar a transacção");
        return;
      }
      onOpenChange(false);
      onSaved();
    } catch {
      setApiError("Erro de rede ao gravar a transacção");
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "text-xs uppercase tracking-wide text-muted-foreground";
  const inputClass = "bg-background border-input text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border/50 p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">
            {transaction
              ? `Editar transacção ${transaction.ticker}`
              : "Nova transacção"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-2 flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="f5-tx-date" className={labelClass}>
                Data
              </Label>
              <Input
                id="f5-tx-date"
                type="date"
                className={inputClass + " tabular-nums"}
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs text-[var(--loss)]">{errors.date.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="f5-tx-type" className={labelClass}>
                Tipo
              </Label>
              <Select
                value={watch("type")}
                onValueChange={(v) =>
                  setValue("type", v as F5TransactionFormInput["type"])
                }
              >
                <SelectTrigger id="f5-tx-type" className={`w-full ${inputClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="f5-tx-ticker" className={labelClass}>
                Ticker
              </Label>
              <Input
                id="f5-tx-ticker"
                placeholder="ex.: AAPL, BTC-USD"
                className={inputClass + " uppercase"}
                {...register("ticker")}
              />
              {errors.ticker && (
                <p className="text-xs text-[var(--loss)]">
                  {errors.ticker.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="f5-tx-asset-type" className={labelClass}>
                Classe do activo
              </Label>
              {isNewTicker ? (
                <Select
                  value={watch("asset_type") ?? "stock"}
                  onValueChange={(v) =>
                    setValue(
                      "asset_type",
                      v as F5TransactionFormInput["asset_type"]
                    )
                  }
                >
                  <SelectTrigger
                    id="f5-tx-asset-type"
                    className={`w-full ${inputClass}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="crypto">Cripto</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="flex h-8 items-center text-sm text-muted-foreground">
                  {watchedTicker && assets[watchedTicker]
                    ? assets[watchedTicker].asset_type.toUpperCase()
                    : "—"}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="f5-tx-qty" className={labelClass}>
                Quantidade
              </Label>
              <Input
                id="f5-tx-qty"
                type="number"
                step="any"
                min="0"
                className={inputClass + " tabular-nums"}
                {...register("qty", { valueAsNumber: true })}
              />
              {errors.qty && (
                <p className="text-xs text-[var(--loss)]">{errors.qty.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="f5-tx-price" className={labelClass}>
                Preço unitário
              </Label>
              <Input
                id="f5-tx-price"
                type="number"
                step="any"
                min="0"
                className={inputClass + " tabular-nums"}
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-xs text-[var(--loss)]">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="f5-tx-currency" className={labelClass}>
                Moeda
              </Label>
              <Select
                value={watch("currency") ?? "USD"}
                onValueChange={(v) =>
                  setValue("currency", v as F5TransactionInput["currency"])
                }
              >
                <SelectTrigger
                  id="f5-tx-currency"
                  className={`w-full ${inputClass}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                FX → EUR capturado automaticamente à data
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="f5-tx-fee" className={labelClass}>
                Fee
              </Label>
              <Input
                id="f5-tx-fee"
                type="number"
                step="any"
                min="0"
                className={inputClass + " tabular-nums"}
                {...register("fee", { valueAsNumber: true })}
              />
              {errors.fee && (
                <p className="text-xs text-[var(--loss)]">{errors.fee.message}</p>
              )}
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <Label htmlFor="f5-tx-notes" className={labelClass}>
                Notas
              </Label>
              <Input
                id="f5-tx-notes"
                placeholder="opcional"
                className={inputClass}
                {...register("notes")}
              />
            </div>
          </div>

          {apiError && (
            <p className="text-sm text-[var(--loss)]" role="alert">
              {apiError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="neon-primary">
              {submitting
                ? "A gravar…"
                : transaction
                  ? "Gravar alterações"
                  : "Adicionar transacção"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
