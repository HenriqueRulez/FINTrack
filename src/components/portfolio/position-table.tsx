"use client";

import * as React from "react";
import { PositionFormDialog, type PositionFormData } from "./position-form-dialog";
import { PositionDeleteDialog } from "./position-delete-dialog";

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

interface PositionTableProps {
  positions: Position[];
  onEdit: (id: string, data: PositionFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatAssetType(assetType: string): string {
  switch (assetType) {
    case "stock":
      return "Stock";
    case "etf":
      return "ETF";
    case "fii":
      return "FII";
    case "crypto":
      return "Crypto";
    default:
      return assetType;
  }
}

export function PositionTable({ positions, onEdit, onDelete }: PositionTableProps) {
  const [editPosition, setEditPosition] = React.useState<(Position & PositionFormData) | null>(null);
  const [deletePosition, setDeletePosition] = React.useState<Position | null>(null);
  const [isEditLoading, setIsEditLoading] = React.useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = React.useState(false);

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        Nenhuma posição cadastrada. Clique em &quot;Adicionar Posição&quot; para
        começar.
      </div>
    );
  }

  async function handleEditSubmit(data: PositionFormData) {
    if (!editPosition) return;
    setIsEditLoading(true);
    try {
      await onEdit(editPosition.id, data);
      setEditPosition(null);
    } finally {
      setIsEditLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletePosition) return;
    setIsDeleteLoading(true);
    try {
      await onDelete(deletePosition.id);
      setDeletePosition(null);
    } finally {
      setIsDeleteLoading(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Ticker</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Quantidade</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Preço Médio</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Preço Atual</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total Gasto</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Moeda</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Acções</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr
                key={position.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                  {position.ticker}
                </td>
                <td className="px-4 py-3 text-gray-700">{position.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {formatAssetType(position.asset_type)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                  {position.quantity.toLocaleString("pt-BR", {
                    maximumFractionDigits: 8,
                  })}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                  {position.avg_price.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                  {position.current_price != null
                    ? position.current_price.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                  {(position.quantity * position.avg_price).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 text-gray-600">{position.currency}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() =>
                        setEditPosition({
                          ...position,
                          asset_type:
                            position.asset_type === "etf" ? "etf" : "stock",
                          currency:
                            (["EUR", "BRL", "USD"].includes(position.currency)
                              ? position.currency
                              : "BRL") as "EUR" | "BRL" | "USD",
                        })
                      }
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      aria-label={`Editar ${position.ticker}`}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeletePosition(position)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      aria-label={`Remover ${position.ticker}`}
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <PositionFormDialog
        open={Boolean(editPosition)}
        onOpenChange={(open) => {
          if (!open) setEditPosition(null);
        }}
        position={editPosition ?? undefined}
        onSubmit={handleEditSubmit}
        isLoading={isEditLoading}
      />

      {/* Delete Dialog */}
      <PositionDeleteDialog
        open={Boolean(deletePosition)}
        onOpenChange={(open) => {
          if (!open) setDeletePosition(null);
        }}
        ticker={deletePosition?.ticker ?? ""}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleteLoading}
      />
    </>
  );
}
