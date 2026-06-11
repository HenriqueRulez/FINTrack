"use client";

// Refresh de preços do sandbox Fable 5:
// - polling alinhado com a janela de cache do servidor (intervalos mais curtos
//   só receberiam cache — desperdício);
// - pausa quando a tab está oculta (visibilitychange) — zero custo em background;
// - botão manual com ?force=1 (o servidor impõe um piso de 60s por ticker).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function relativeLabel(iso: string | null, now: number): string {
  if (!iso) return "sem preços";
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (mins === 0) return "actualizado agora";
  if (mins < 60) return `actualizado há ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `actualizado há ${hours} h`;
}

export function F5RefreshButton({
  fetchedAt,
  intervalMinutes,
}: {
  fetchedAt: string | null;
  intervalMinutes: number;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number | null>(null); // null até montar — evita mismatch de hidratação

  const refresh = useCallback(
    async (force: boolean) => {
      setRefreshing(true);
      try {
        await fetch(`/api/fable5/portfolio${force ? "?force=1" : ""}`);
        router.refresh();
      } finally {
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const ms = intervalMinutes * 60_000;
    const id = setInterval(() => {
      if (!document.hidden) void refresh(false);
    }, ms);
    return () => clearInterval(id);
  }, [intervalMinutes, refresh]);

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="neon-dot" aria-hidden="true" />
        {now === null ? "…" : relativeLabel(fetchedAt, now)}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void refresh(true)}
        disabled={refreshing}
        aria-label="Forçar actualização de preços"
      >
        <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
        Atualizar
      </Button>
    </div>
  );
}
