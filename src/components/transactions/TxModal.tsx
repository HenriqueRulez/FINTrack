"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import type { z } from "zod";
import {
  TransactionCreateSchema,
  TRANSACTION_CURRENCIES,
} from "@/lib/validations/transactions";
import type { Transaction } from "./mock-data";

// Input type (pre-parse) — `fee` has a Zod `.default(0)`, so it's optional as
// *input* even though the parsed *output* always has a number. zodResolver's
// generic must match the input shape, not z.infer's (output) shape.
type TxFormValues = z.input<typeof TransactionCreateSchema>;

// ---------------------------------------------------------------------------
// TxModal — create/edit a buy/sell transaction in the ledger.
//
// Create: POST /api/transactions
// Edit:   PATCH /api/transactions/[id]
//
// Client-side validation mirrors TransactionCreateSchema (same file the API
// route uses) — the server remains the source of truth (oversell / fx errors
// only surface at request time and are shown verbatim, in PT, from the API).
// fx/total are never part of the payload — computed server-side (A-01).
// ---------------------------------------------------------------------------

interface TxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  transaction?: Transaction | null;
  onSuccess: () => void;
}

const EMPTY_VALUES: TxFormValues = {
  date: "",
  ticker: "",
  type: "buy",
  qty: 0,
  price: 0,
  currency: "EUR",
  fee: 0,
  label: "",
};

function toFormValues(tx: Transaction): TxFormValues {
  return {
    date: tx.date,
    ticker: tx.ticker,
    type: tx.type === "sell" ? "sell" : "buy",
    qty: tx.qty ?? 0,
    price: tx.price ?? 0,
    currency: (TRANSACTION_CURRENCIES as readonly string[]).includes(tx.cur)
      ? (tx.cur as TxFormValues["currency"])
      : "EUR",
    fee: tx.fee,
    label: tx.label ?? "",
  };
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
    };
    const fieldErrors = json.details?.fieldErrors;
    if (fieldErrors) {
      const first = Object.values(fieldErrors).flat()[0];
      if (first) return first;
    }
    return json.error ?? `Pedido falhou (${res.status})`;
  } catch {
    return `Pedido falhou (${res.status})`;
  }
}

export function TxModal({
  open,
  onOpenChange,
  mode,
  transaction,
  onSuccess,
}: TxModalProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TxFormValues>({
    resolver: zodResolver(TransactionCreateSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Reset form contents every time the modal opens: blank for create, prefilled
  // for edit. Keeps stale state from a previous open out of the fields.
  useEffect(() => {
    if (open) {
      setApiError(null);
      reset(
        mode === "edit" && transaction ? toFormValues(transaction) : EMPTY_VALUES
      );
    }
  }, [open, mode, transaction, reset]);

  function handleClose() {
    onOpenChange(false);
  }

  async function onSubmit(values: TxFormValues) {
    setApiError(null);
    setSubmitting(true);
    try {
      const trimmedLabel = values.label?.trim();
      const payload = {
        ...values,
        label: trimmedLabel ? trimmedLabel : undefined,
      };
      const url =
        mode === "edit" && transaction
          ? `/api/transactions/${transaction.id}`
          : "/api/transactions";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setApiError(await parseApiError(res));
        return;
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      setApiError("Falha de rede. Tenta novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "edit" ? "Edit transaction" : "New transaction";
  const submitLabel = mode === "edit" ? "Save changes" : "Add transaction";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        className="max-w-md bg-card border-border/50 neon-border-primary p-6"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 mt-2"
          noValidate
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="tx-date"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Date
              </Label>
              <Input
                id="tx-date"
                type="date"
                className="bg-background border-input text-sm"
                aria-label="Transaction date"
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              {errors.date && (
                <span className="text-xs text-[var(--loss)]">
                  {errors.date.message}
                </span>
              )}
            </div>

            {/* Ticker */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="tx-ticker"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Ticker
              </Label>
              <Input
                id="tx-ticker"
                type="text"
                placeholder="e.g. AAPL"
                className="bg-background border-input text-sm"
                style={{ textTransform: "uppercase" }}
                aria-label="Ticker symbol"
                aria-invalid={!!errors.ticker}
                {...register("ticker")}
              />
              {errors.ticker && (
                <span className="text-xs text-[var(--loss)]">
                  {errors.ticker.message}
                </span>
              )}
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="tx-type-trigger"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Type
              </Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "buy")}
                  >
                    <SelectTrigger
                      id="tx-type-trigger"
                      className="w-full bg-background border-input text-sm"
                      aria-label="Transaction type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Currency */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="tx-currency-trigger"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Currency
              </Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? "EUR")}
                  >
                    <SelectTrigger
                      id="tx-currency-trigger"
                      className="w-full bg-background border-input text-sm"
                      aria-label="Currency"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="tx-qty"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Quantity
              </Label>
              <Input
                id="tx-qty"
                type="number"
                placeholder="0.00"
                step="any"
                min="0"
                className="bg-background border-input text-sm tabular-nums"
                aria-label="Quantity"
                aria-invalid={!!errors.qty}
                {...register("qty", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
              />
              {errors.qty && (
                <span className="text-xs text-[var(--loss)]">
                  {errors.qty.message}
                </span>
              )}
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="tx-price"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Price
              </Label>
              <Input
                id="tx-price"
                type="number"
                placeholder="0.00"
                step="any"
                min="0"
                className="bg-background border-input text-sm tabular-nums"
                aria-label="Price per unit"
                aria-invalid={!!errors.price}
                {...register("price", {
                  setValueAs: (v) => (v === "" ? undefined : Number(v)),
                })}
              />
              {errors.price && (
                <span className="text-xs text-[var(--loss)]">
                  {errors.price.message}
                </span>
              )}
            </div>

            {/* Fee */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="tx-fee"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Fee{" "}
                <span className="normal-case text-muted-foreground/70">
                  (optional)
                </span>
              </Label>
              <Input
                id="tx-fee"
                type="number"
                placeholder="0.00"
                step="any"
                min="0"
                className="bg-background border-input text-sm tabular-nums"
                aria-label="Fee"
                aria-invalid={!!errors.fee}
                {...register("fee", {
                  setValueAs: (v) => (v === "" ? 0 : Number(v)),
                })}
              />
              {errors.fee && (
                <span className="text-xs text-[var(--loss)]">
                  {errors.fee.message}
                </span>
              )}
            </div>

            {/* Label */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="tx-label"
                className="text-xs text-muted-foreground uppercase tracking-wide"
              >
                Label{" "}
                <span className="normal-case text-muted-foreground/70">
                  (optional)
                </span>
              </Label>
              <Input
                id="tx-label"
                type="text"
                placeholder="e.g. IBKR"
                className="bg-background border-input text-sm"
                aria-label="Label"
                aria-invalid={!!errors.label}
                {...register("label")}
              />
              {errors.label && (
                <span className="text-xs text-[var(--loss)]">
                  {errors.label.message}
                </span>
              )}
            </div>
          </div>

          {apiError && (
            <div
              role="alert"
              className="rounded-md border border-[var(--loss)]/40 bg-[var(--loss)]/10 px-3 py-2 text-sm text-[var(--loss)]"
            >
              {apiError}
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              className="neon-primary"
              disabled={submitting}
            >
              {submitting ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
