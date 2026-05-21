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

export interface PositionFormData {
  ticker: string;
  asset_type: "stock" | "etf";
  quantity: number;
  avg_price: number;
  currency: "EUR" | "BRL" | "USD";
}

interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: PositionFormData & { id: string };
  onSubmit: (data: PositionFormData) => void;
  isLoading?: boolean;
}

const ASSET_TYPES: { value: "stock" | "etf"; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
];

const CURRENCIES: { value: "EUR" | "BRL" | "USD"; label: string }[] = [
  { value: "EUR", label: "EUR" },
  { value: "BRL", label: "BRL" },
  { value: "USD", label: "USD" },
];

export function PositionFormDialog({
  open,
  onOpenChange,
  position,
  onSubmit,
  isLoading = false,
}: PositionFormDialogProps) {
  const isEditing = Boolean(position);

  const [ticker, setTicker] = React.useState(position?.ticker ?? "");
  const [assetType, setAssetType] = React.useState<"stock" | "etf">(
    position?.asset_type === "etf" ? "etf" : "stock"
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

  // Reset form when dialog opens with a new position (or clears)
  React.useEffect(() => {
    if (open) {
      setTicker(position?.ticker ?? "");
      setAssetType(position?.asset_type === "etf" ? "etf" : "stock");
      setQuantity(position?.quantity?.toString() ?? "");
      setAvgPrice(position?.avg_price?.toString() ?? "");
      setCurrency(position?.currency ?? "BRL");
    }
  }, [open, position]);

  const isFormValid =
    ticker.trim().length > 0 &&
    quantity.trim().length > 0 &&
    avgPrice.trim().length > 0 &&
    Number(quantity) > 0 &&
    Number(avgPrice) > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    onSubmit({
      ticker: ticker.trim().toUpperCase(),
      asset_type: assetType,
      quantity: Number(quantity),
      avg_price: Number(avgPrice),
      currency,
    });
  }

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
            <Input
              id="ticker"
              placeholder="ex: AAPL"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              maxLength={10}
              required
            />
          </div>

          {/* Tipo */}
          <div className="grid gap-1.5">
            <Label htmlFor="asset_type">Tipo *</Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as "stock" | "etf")}>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading ? "A guardar..." : isEditing ? "Guardar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
