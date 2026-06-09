"use client";

import { useState } from "react";
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

// ---------------------------------------------------------------------------
// AddPositionModal — visual-only modal for adding a new position (Phase 1 mock)
// No persistence: closing the modal does not alter the holdings table.
// TODO: wire to POST /api/holdings when Engineer implements the API route.
// ---------------------------------------------------------------------------

interface AddPositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPositionModal({ open, onOpenChange }: AddPositionModalProps) {
  // Currency defaults to EUR on every open (controlled state)
  const [currency, setCurrency] = useState<string>("EUR");
  const [assetType, setAssetType] = useState<string>("");

  function handleClose() {
    // Reset fields and close
    setCurrency("EUR");
    setAssetType("");
    onOpenChange(false);
  }

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
          <DialogTitle className="text-lg font-medium">
            Add position
          </DialogTitle>
        </DialogHeader>

        {/* 6-field grid — 2 columns, 3 rows */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Row 1: Ticker | Exchange */}
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="modal-ticker"
              className="text-xs text-muted-foreground uppercase tracking-wide"
            >
              Ticker
            </Label>
            <Input
              id="modal-ticker"
              type="text"
              placeholder="e.g. AAPL"
              className="bg-background border-input text-sm uppercase"
              style={{ textTransform: "uppercase" }}
              aria-label="Ticker symbol"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="modal-exchange"
              className="text-xs text-muted-foreground uppercase tracking-wide"
            >
              Market / Exchange
            </Label>
            <Input
              id="modal-exchange"
              type="text"
              placeholder="e.g. NASDAQ"
              className="bg-background border-input text-sm"
              aria-label="Market or exchange"
            />
          </div>

          {/* Row 2: Type | Currency */}
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="modal-type-trigger"
              className="text-xs text-muted-foreground uppercase tracking-wide"
            >
              Type
            </Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v ?? "")}>
              <SelectTrigger
                id="modal-type-trigger"
                className="w-full bg-background border-input text-sm"
                aria-label="Asset type"
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Stock">Stock</SelectItem>
                <SelectItem value="ETF">ETF</SelectItem>
                <SelectItem value="Crypto">Crypto</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="modal-currency-trigger"
              className="text-xs text-muted-foreground uppercase tracking-wide"
            >
              Currency
            </Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v ?? "EUR")}>
              <SelectTrigger
                id="modal-currency-trigger"
                className="w-full bg-background border-input text-sm"
                aria-label="Currency"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Shares | Price paid */}
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="modal-shares"
              className="text-xs text-muted-foreground uppercase tracking-wide"
            >
              Shares
            </Label>
            <Input
              id="modal-shares"
              type="number"
              placeholder="0.00"
              step="any"
              min="0"
              className="bg-background border-input text-sm tabular-nums"
              aria-label="Number of shares"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="modal-price"
              className="text-xs text-muted-foreground uppercase tracking-wide"
            >
              Price paid
            </Label>
            <Input
              id="modal-price"
              type="number"
              placeholder="0.00"
              step="any"
              min="0"
              className="bg-background border-input text-sm tabular-nums"
              aria-label="Price paid per share"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          {/* Cancel */}
          <Button
            variant="ghost"
            onClick={handleClose}
            type="button"
          >
            Cancel
          </Button>

          {/* Add position (mock — closes modal without persisting) */}
          <Button
            variant="default"
            onClick={handleClose}
            type="button"
            className="neon-primary"
          >
            Add position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
