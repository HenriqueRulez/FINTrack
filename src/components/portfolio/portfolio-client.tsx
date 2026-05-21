"use client";

import * as React from "react";
import { PositionTable, type Position } from "./position-table";
import { PositionFormDialog, type PositionFormData } from "./position-form-dialog";

interface PortfolioClientProps {
  initialPositions: Position[];
}

export function PortfolioClient({ initialPositions }: PortfolioClientProps) {
  const [positions, setPositions] = React.useState<Position[]>(initialPositions);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isAddLoading, setIsAddLoading] = React.useState(false);

  // Actualiza preços em background no mount — o GET /api/portfolio aplica a lógica
  // de cache de 15 minutos (detecta stale, chama yahoo-finance em lote, actualiza o banco)
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

  async function handleAdd(data: PositionFormData) {
    setIsAddLoading(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        console.error("Erro ao adicionar posição:", body.error);
        return;
      }

      const body = await res.json() as { data: Position };
      setPositions((prev) => [...prev, body.data]);
      setIsAddOpen(false);
    } finally {
      setIsAddLoading(false);
    }
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

    setPositions((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfólio</h1>
          <p className="text-gray-500 text-sm">Stocks, ETFs e outros ativos</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Adicionar Posição
        </button>
      </div>

      <PositionTable
        positions={positions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PositionFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSubmit={handleAdd}
        isLoading={isAddLoading}
      />
    </div>
  );
}
