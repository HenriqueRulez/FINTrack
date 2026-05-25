"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Position } from "@/components/portfolio/position-table";

export interface PositionFormData {
  ticker: string;
  asset_type: "stock" | "etf" | "fii" | "crypto";
  quantity: number;
  avg_price: number;
  currency: "EUR" | "BRL" | "USD";
}

interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: PositionFormData & { id: string };
  // Opção A: o formulário gere o fetch internamente; onSuccess é chamado apenas quando o POST retorna 201
  onSuccess: (position: Position) => void;
  // Mantido como prop opcional para compatibilidade com o modo de edição (position-table.tsx)
  onSubmit?: (data: PositionFormData) => void;
  isLoading?: boolean;
}

const ASSET_TYPES: { value: "stock" | "etf" | "fii" | "crypto"; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "fii", label: "FII" },
  { value: "crypto", label: "Crypto" },
];

const CURRENCIES: { value: "EUR" | "BRL" | "USD"; label: string }[] = [
  { value: "EUR", label: "EUR" },
  { value: "BRL", label: "BRL" },
  { value: "USD", label: "USD" },
];

type AssetType = "stock" | "etf" | "fii" | "crypto";
const VALID_ASSET_TYPES: readonly AssetType[] = ["stock", "etf", "fii", "crypto"];

function resolveAssetType(value: string | undefined): AssetType {
  return (VALID_ASSET_TYPES as readonly string[]).includes(value ?? "")
    ? (value as AssetType)
    : "stock";
}

export function PositionFormDialog({
  open,
  onOpenChange,
  position,
  onSuccess,
  onSubmit,
  isLoading = false,
}: PositionFormDialogProps) {
  const isEditing = Boolean(position);

  const [ticker, setTicker] = React.useState(position?.ticker ?? "");
  const [assetType, setAssetType] = React.useState<AssetType>(
    resolveAssetType(position?.asset_type)
  );
  const [quantity, setQuantity] = React.useState(
    position?.quantity?.toString() ?? ""
  );
  const [avgPrice, setAvgPrice] = React.useState(
    position?.avg_price?.toString() ?? ""
  );
  const [currency, setCurrency] = React.useState<"EUR" | "BRL" | "USD">(
    position?.currency ?? "BRL"
  );

  // Estados de verificação de ticker
  const [tickerError, setTickerError] = React.useState<string | null>(null);
  const [tickerVerifying, setTickerVerifying] = React.useState(false);
  const [tickerPreview, setTickerPreview] = React.useState<{
    name: string;
    price: number;
    currency: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset do formulário e dos estados de verificação quando o diálogo abre/fecha
  React.useEffect(() => {
    if (open) {
      setTicker(position?.ticker ?? "");
      setAssetType(resolveAssetType(position?.asset_type));
      setQuantity(position?.quantity?.toString() ?? "");
      setAvgPrice(position?.avg_price?.toString() ?? "");
      setCurrency(position?.currency ?? "BRL");
      // CA-07: limpar todos os estados de verificação
      setTickerError(null);
      setTickerVerifying(false);
      setTickerPreview(null);
      setIsSubmitting(false);
    }
  }, [open, position]);

  const isFormValid =
    ticker.trim().length > 0 &&
    quantity.trim().length > 0 &&
    avgPrice.trim().length > 0 &&
    Number(quantity) > 0 &&
    Number(avgPrice) > 0;

  // CA-03: Verificar ticker via API antes de submeter
  async function handleVerify() {
    const trimmed = ticker.trim().toUpperCase();
    if (!trimmed) return;

    setTickerVerifying(true);
    setTickerError(null);
    setTickerPreview(null);

    try {
      const res = await fetch(
        `/api/portfolio/verify-ticker?ticker=${encodeURIComponent(trimmed)}`
      );
      const body = (await res.json()) as {
        data?: { name: string; price: number; currency: string };
        error?: string;
      };

      if (res.ok && body.data) {
        // CA-04: exibir preview com nome e preço
        setTickerPreview(body.data);
      } else {
        // CA-05: exibir mensagem de erro da API
        setTickerError(body.error ?? "Erro ao verificar o ticker.");
      }
    } catch {
      // CA-09: erro de rede
      setTickerError("Erro ao comunicar com o servidor. Tente novamente.");
    } finally {
      setTickerVerifying(false);
    }
  }

  // Submissão com fetch interno (Opção A) — gere erros 422 sem fechar o diálogo
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || isSubmitting || tickerVerifying) return;

    // Modo edição: delegar ao onSubmit externo (position-table.tsx gere o PATCH)
    if (isEditing && onSubmit) {
      onSubmit({
        ticker: ticker.trim().toUpperCase(),
        asset_type: assetType,
        quantity: Number(quantity),
        avg_price: Number(avgPrice),
        currency,
      });
      return;
    }

    // Modo criação: fetch POST interno
    setIsSubmitting(true);
    setTickerError(null);

    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.trim().toUpperCase(),
          asset_type: assetType,
          quantity: Number(quantity),
          avg_price: Number(avgPrice),
          currency,
        }),
      });

      const body = (await res.json()) as { data?: Position; error?: string };

      if (!res.ok) {
        // CA-01: manter diálogo aberto e exibir erro inline
        if (res.status === 422 || res.status === 429) {
          setTickerError(body.error ?? "Erro ao adicionar posição.");
        } else {
          // CA-09: erro genérico de servidor
          setTickerError("Erro ao comunicar com o servidor. Tente novamente.");
        }
        return;
      }

      if (body.data) {
        onSuccess(body.data);
      }
    } catch {
      // CA-09: erro de rede (sem resposta)
      setTickerError("Erro ao comunicar com o servidor. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading efectivo: interno ou externo (modo edição)
  const effectiveLoading = isSubmitting || isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Posição" : "Adicionar Posição"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Ticker */}
          <div className="grid gap-1.5">
            <Label htmlFor="ticker">Ticker *</Label>
            <div className="flex gap-2">
              <Input
                id="ticker"
                placeholder="ex: AAPL"
                value={ticker}
                onChange={(e) => {
                  setTicker(e.target.value);
                  // CA-02: limpar erro e preview ao editar o ticker
                  setTickerError(null);
                  setTickerPreview(null);
                }}
                maxLength={20}
                required
                className="flex-1"
                aria-describedby={tickerError ? "ticker-error" : undefined}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleVerify}
                disabled={!ticker.trim() || tickerVerifying || effectiveLoading}
              >
                {tickerVerifying ? "A verificar..." : "Verificar"}
              </Button>
            </div>

            {/* CA-04: Preview de ticker válido */}
            {tickerPreview && (
              <div className="rounded-md border border-border/50 bg-muted px-3 py-2 text-sm">
                <p className="text-foreground font-medium">{tickerPreview.name}</p>
                <p className="text-[var(--primary)] tabular-nums">
                  {tickerPreview.currency} {tickerPreview.price.toFixed(2)}
                </p>
              </div>
            )}

            {/* CA-01, CA-05, CA-09, CA-10: Mensagem de erro acessível */}
            {tickerError && (
              <p id="ticker-error" role="alert" className="text-[var(--destructive)] text-sm">
                {tickerError}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div className="grid gap-1.5">
            <Label htmlFor="asset_type">Tipo *</Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
              <SelectTrigger id="asset_type" className="w-full">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div className="grid gap-1.5">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="ex: 10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0.00000001"
              step="any"
              required
            />
          </div>

          {/* Preço Médio */}
          <div className="grid gap-1.5">
            <Label htmlFor="avg_price">Preço Médio *</Label>
            <Input
              id="avg_price"
              type="number"
              placeholder="ex: 150.00"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              min="0.0001"
              step="any"
              required
            />
          </div>

          {/* Moeda */}
          <div className="grid gap-1.5">
            <Label htmlFor="currency">Moeda *</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as "EUR" | "BRL" | "USD")}>
              <SelectTrigger id="currency" className="w-full">
                <SelectValue placeholder="Seleccionar moeda" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CA-06: Botões desactivados durante submissão e verificação */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={effectiveLoading || tickerVerifying}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || effectiveLoading || tickerVerifying}
            >
              {effectiveLoading
                ? "A guardar..."
                : isEditing
                ? "Guardar"
                : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
