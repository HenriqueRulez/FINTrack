"use client";

// Gestão de assets do sandbox (página Settings): corrigir a classe de um
// ticker existente (afecta badges e alocação em todas as páginas derivadas)
// e remover assets órfãos (sem transacções).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { F5Asset, F5AssetType } from "@/lib/fable5/types";

export interface AssetWithCount extends F5Asset {
  txCount: number;
}

export function AssetsManager({ assets }: { assets: AssetWithCount[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null); // ticker em mutação
  const [error, setError] = useState<string | null>(null);

  async function changeType(ticker: string, asset_type: F5AssetType) {
    setBusy(ticker);
    setError(null);
    try {
      const res = await fetch(
        `/api/fable5/assets/${encodeURIComponent(ticker)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asset_type }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Erro ao actualizar o asset");
        return;
      }
      router.refresh();
    } catch {
      setError("Erro de rede");
    } finally {
      setBusy(null);
    }
  }

  async function removeOrphan(ticker: string) {
    setBusy(ticker);
    setError(null);
    try {
      const res = await fetch(
        `/api/fable5/assets/${encodeURIComponent(ticker)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Erro ao remover o asset");
        return;
      }
      router.refresh();
    } catch {
      setError("Erro de rede");
    } finally {
      setBusy(null);
    }
  }

  if (assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem assets — aparecem aqui ao criar transacções.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {assets.map((asset) => (
        <div
          key={asset.ticker}
          className="flex items-center gap-3 rounded-md border border-border/40 bg-background px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-wide">
              {asset.ticker}
              <span className="ml-2 text-[10px] font-normal text-muted-foreground tabular-nums">
                {asset.txCount} tx
              </span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {asset.name ?? "—"}
            </p>
          </div>

          <Select
            value={asset.asset_type}
            onValueChange={(v) => changeType(asset.ticker, v as F5AssetType)}
            disabled={busy === asset.ticker}
          >
            <SelectTrigger
              className="w-[110px] bg-background border-input text-xs"
              aria-label={`Classe de ${asset.ticker}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="etf">ETF</SelectItem>
              <SelectItem value="crypto">Cripto</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled={asset.txCount > 0 || busy === asset.ticker}
            onClick={() => void removeOrphan(asset.ticker)}
            aria-label={
              asset.txCount > 0
                ? `${asset.ticker} tem transacções — não pode ser removido`
                : `Remover asset órfão ${asset.ticker}`
            }
            title={
              asset.txCount > 0
                ? "Tem transacções — não pode ser removido"
                : "Remover asset órfão"
            }
          >
            <Trash2 className="size-3.5 text-[var(--loss)]" />
          </Button>
        </div>
      ))}

      {error && (
        <p className="text-sm text-[var(--loss)]" role="alert">
          {error}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground">
        A classe afecta badges e alocação em todas as páginas. Assets só podem
        ser removidos quando não têm transacções (órfãos).
      </p>
    </div>
  );
}
