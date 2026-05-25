"use client";

import * as React from "react";
import { AggregatedPositionTable } from "./position-table";
import { PositionFormDialog, type PositionFormData } from "./position-form-dialog";
import { aggregatePositions } from "@/types/portfolio";
import type { Position } from "./position-table";

interface PortfolioClientProps {
  initialPositions: Position[];
}

export function PortfolioClient({ initialPositions }: PortfolioClientProps) {
  const [positions, setPositions] = React.useState<Position[]>(initialPositions);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Refresh prices from backend on mount (gets latest current_price for all positions)
  React.useEffect(() => {
    fetch("/api/portfolio")
      .then((res) => {
        if (!res.ok) return;
        return res.json() as Promise<{ data: Position[] }>;
      })
      .then((body) => {
        if (body?.data) {
          setPositions(body.data);
        }
      })
      .catch((err) => {
        console.error("Erro ao refrescar preços do portfólio:", err);
      });
  }, []);

  // CA-01: aggregate by ticker — useMemo to avoid re-aggregation on every render
  // CA-11: after handleDelete/handleEdit, positions changes → useMemo re-runs → table updates without new fetch
  const aggregatedPositions = React.useMemo(
    () => aggregatePositions(positions),
    [positions]
  );

  function handleAdd(newPosition: Position) {
    setPositions((prev) => [newPosition, ...prev]);
    setIsAddOpen(false);
  }

  async function handleEdit(id: string, data: PositionFormData) {
    const res = await fetch(`/api/portfolio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      console.error("Erro ao editar posição:", body.error);
      return;
    }

    const body = await res.json() as { data: Position };
    setPositions((prev) =>
      prev.map((p) => (p.id === id ? body.data : p))
    );
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/portfolio/${id}`, {
      method: "DELETE",
    });

    if (!res.ok && res.status !== 204) {
      console.error("Erro ao remover posição");
      return;
    }

    // CA-11: filter out the deleted entry — useMemo re-aggregates automatically
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfólio</h1>
          <p className="text-muted-foreground text-sm">Stocks, ETFs e outros ativos</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:opacity-90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-all neon-primary"
        >
          + Adicionar Posição
        </button>
      </div>

      <AggregatedPositionTable
        positions={aggregatedPositions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PositionFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleAdd}
      />
    </div>
  );
}
