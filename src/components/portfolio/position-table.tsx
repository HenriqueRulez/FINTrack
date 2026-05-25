"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from "next/dynamic";
import { PositionFormDialog, type PositionFormData } from "./position-form-dialog";
import { PositionDeleteDialog } from "./position-delete-dialog";
import type { AggregatedPosition } from "@/types/portfolio";

// ssr: false evita que o Recharts (LineChart) tente aceder window/ResizeObserver no servidor
const PriceSparkline = dynamic(
  () => import("./price-sparkline").then((m) => ({ default: m.PriceSparkline })),
  {
    ssr: false,
    loading: () => (
      <span className="inline-block h-8 w-20 rounded bg-muted animate-pulse" />
    ),
  }
);

// Position interface — exported for use by portfolio-client.tsx, position-form-dialog.tsx, and types/portfolio.ts
export interface Position {
  id: string;
  ticker: string;
  name: string;
  asset_type: string;
  quantity: number;
  avg_price: number;
  currency: string;
  current_price: number | null;
  price_updated_at: string | null;
}

interface AggregatedPositionTableProps {
  positions: AggregatedPosition[];
  onEdit: (id: string, data: PositionFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ASSET_TYPE_STYLES: Record<string, { label: string; classes: string }> = {
  stock:  { label: "Stock",  classes: "bg-[var(--chart-5)]/15 text-[var(--chart-5)]"  },
  etf:    { label: "ETF",    classes: "bg-[var(--chart-2)]/15 text-[var(--chart-2)]"  },
  fii:    { label: "FII",    classes: "bg-[var(--chart-3)]/15 text-[var(--chart-3)]"  },
  crypto: { label: "Crypto", classes: "bg-[var(--chart-4)]/15 text-[var(--chart-4)]"  },
};

function AssetBadge({ assetType }: { assetType: string }) {
  const style = ASSET_TYPE_STYLES[assetType] ?? { label: assetType, classes: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.classes}`}>
      {style.label}
    </span>
  );
}

function fmt2(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQty(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 8 });
}

function resolveAssetType(value: string): PositionFormData["asset_type"] {
  return (["stock", "etf", "fii", "crypto"] as const).includes(
    value as PositionFormData["asset_type"]
  )
    ? (value as PositionFormData["asset_type"])
    : "stock";
}

function resolveCurrency(value: string): "EUR" | "BRL" | "USD" {
  return (["EUR", "BRL", "USD"] as const).includes(value as "EUR" | "BRL" | "USD")
    ? (value as "EUR" | "BRL" | "USD")
    : "BRL";
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function AggregatedPositionTable({
  positions,
  onEdit,
  onDelete,
}: AggregatedPositionTableProps) {
  const [editEntry, setEditEntry] = React.useState<(Position & PositionFormData) | null>(null);
  const [deleteEntry, setDeleteEntry] = React.useState<Position | null>(null);
  const [isEditLoading, setIsEditLoading] = React.useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = React.useState(false);

  // CA-14 — estado vazio inalterado
  if (positions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-10 text-center text-muted-foreground text-sm">
        Nenhuma posição cadastrada. Clique em &quot;Adicionar Posição&quot; para começar.
      </div>
    );
  }

  async function handleEditSubmit(data: PositionFormData) {
    if (!editEntry) return;
    setIsEditLoading(true);
    try {
      await onEdit(editEntry.id, data);
      setEditEntry(null);
    } finally {
      setIsEditLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteEntry) return;
    setIsDeleteLoading(true);
    try {
      await onDelete(deleteEntry.id);
      setDeleteEntry(null);
    } finally {
      setIsDeleteLoading(false);
    }
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
        <table className="w-full text-sm">
          {/* CA-07 — colunas na ordem exacta */}
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Ticker</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Qtd. Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Preço Médio</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Preço Atual</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Investido</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor Atual</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Ganho/Perda</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico 30d</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((agg) => (
              <tr
                key={agg.ticker}
                className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
              >
                {/* Ticker */}
                <td className="px-4 py-3 font-mono font-semibold text-primary tracking-wide">
                  {agg.ticker}
                </td>

                {/* Nome */}
                <td className="px-4 py-3 text-foreground/80 max-w-[180px] truncate">
                  {agg.name}
                </td>

                {/* Tipo — CA-12: usa primeira entrada */}
                <td className="px-4 py-3">
                  <AssetBadge assetType={agg.asset_type} />
                </td>

                {/* Qtd. Total — CA-02 */}
                <td className="px-4 py-3 text-right text-foreground tabular-nums">
                  {fmtQty(agg.totalQty)}
                </td>

                {/* Preço Médio — CA-03 */}
                <td className="px-4 py-3 text-right text-foreground tabular-nums">
                  {fmt2(agg.weightedAvgPrice)}
                </td>

                {/* Preço Atual — CA-05 */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {agg.currentPrice != null ? (
                    <span className="text-foreground">{fmt2(agg.currentPrice)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Total Investido — CA-04 */}
                <td className="px-4 py-3 text-right text-foreground tabular-nums">
                  {fmt2(agg.totalInvested)}
                </td>

                {/* Valor Atual — CA-05 */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {agg.currentValue != null ? (
                    <span className="text-foreground">{fmt2(agg.currentValue)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Ganho/Perda — CA-06 */}
                <td className="px-4 py-3 text-right tabular-nums">
                  {agg.gainLoss != null && agg.gainLossPct != null ? (
                    <span
                      className={`font-medium tabular-nums ${
                        agg.gainLoss >= 0
                          ? "text-[var(--gain)] neon-gain"
                          : "text-[var(--loss)] neon-loss"
                      }`}
                    >
                      {agg.gainLoss >= 0 ? "+" : ""}
                      {fmt2(agg.gainLoss)}
                      {" "}
                      ({agg.gainLoss >= 0 ? "+" : ""}
                      {agg.gainLossPct.toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                {/* Histórico 30d — CA-08, CA-09 */}
                <td className="px-4 py-3">
                  <PriceSparkline
                    ticker={agg.ticker}
                    isGain={agg.gainLoss !== null ? agg.gainLoss >= 0 : null}
                  />
                </td>

                {/* Ações — CA-11: dropdown com entradas individuais */}
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="text-xs font-medium px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        aria-label={`Ações para ${agg.ticker}`}
                      >
                        Ações ▾
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[220px]">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          {agg.ticker} — {agg.entries.length} {agg.entries.length === 1 ? "entrada" : "entradas"}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {agg.entries.map((entry, idx) => (
                          <React.Fragment key={entry.id}>
                            {idx > 0 && <DropdownMenuSeparator />}
                            <div className="px-2 py-1.5">
                              <p className="text-xs text-muted-foreground">
                                {formatDate(entry.price_updated_at)} · {fmtQty(entry.quantity)} un. · {fmt2(entry.avg_price)}
                              </p>
                            </div>
                            <DropdownMenuItem
                              onSelect={() =>
                                setEditEntry({
                                  ...entry,
                                  asset_type: resolveAssetType(entry.asset_type),
                                  currency: resolveCurrency(entry.currency),
                                })
                              }
                              className="text-xs cursor-pointer"
                            >
                              Editar esta entrada
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setDeleteEntry(entry)}
                              className="text-xs cursor-pointer text-[var(--loss)] focus:text-[var(--loss)]"
                            >
                              Remover esta entrada
                            </DropdownMenuItem>
                          </React.Fragment>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      <PositionFormDialog
        open={Boolean(editEntry)}
        onOpenChange={(open) => { if (!open) setEditEntry(null); }}
        position={editEntry ?? undefined}
        onSuccess={() => { /* edit mode: onSubmit delegate handles success */ }}
        onSubmit={handleEditSubmit}
        isLoading={isEditLoading}
      />

      {/* Delete dialog */}
      <PositionDeleteDialog
        open={Boolean(deleteEntry)}
        onOpenChange={(open) => { if (!open) setDeleteEntry(null); }}
        ticker={deleteEntry?.ticker ?? ""}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleteLoading}
      />
    </>
  );
}
