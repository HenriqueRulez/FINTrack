"use client";

// Form de definições do sandbox Fable 5 — moeda base + intervalo de refresh.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { F5Currency, F5Settings } from "@/lib/fable5/types";

const INTERVALS = [5, 15, 30, 60];

export function F5SettingsForm({ settings }: { settings: F5Settings }) {
  const router = useRouter();
  const [baseCurrency, setBaseCurrency] = useState<F5Currency>(
    settings.base_currency
  );
  const [interval, setIntervalMin] = useState(
    settings.refresh_interval_minutes
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fable5/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_currency: baseCurrency,
          refresh_interval_minutes: interval,
        }),
      });
      if (!res.ok) {
        setMessage({ kind: "error", text: "Erro ao gravar as definições" });
        return;
      }
      setMessage({ kind: "ok", text: "Definições gravadas" });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Erro de rede ao gravar" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-5 rounded-lg border border-border/40 bg-card p-5">
      <div className="flex flex-col gap-1">
        <Label
          htmlFor="f5-base-currency"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Moeda base
        </Label>
        <Select
          value={baseCurrency}
          onValueChange={(v) => setBaseCurrency(v as F5Currency)}
        >
          <SelectTrigger
            id="f5-base-currency"
            className="w-full bg-background border-input text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="BRL">BRL</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Todos os valores do dashboard e do portfólio são convertidos para
          esta moeda (FX via Yahoo Finance, com o mesmo cache).
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="f5-interval"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Intervalo de actualização de preços
        </Label>
        <Select
          value={String(interval)}
          onValueChange={(v) => setIntervalMin(Number(v))}
        >
          <SelectTrigger
            id="f5-interval"
            className="w-full bg-background border-input text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVALS.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m} minutos
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Janela de validade do cache de preços. Dentro da janela, nenhuma
          chamada externa é feita ao Yahoo Finance.
        </p>
      </div>

      {message && (
        <p
          className={
            message.kind === "ok"
              ? "text-sm text-[var(--gain)]"
              : "text-sm text-[var(--loss)]"
          }
          role="status"
        >
          {message.text}
        </p>
      )}

      <div>
        <Button
          onClick={() => void save()}
          disabled={saving}
          className="neon-primary"
        >
          {saving ? "A gravar…" : "Gravar definições"}
        </Button>
      </div>
    </div>
  );
}
