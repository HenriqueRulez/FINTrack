"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TypeBadge } from "./TypeBadge";
import { fmt, fmtDate } from "./mock-data";

// ---------------------------------------------------------------------------
// ImportModal — CSV import (Trading212) into the transactions ledger.
//
// Flow: choose .csv file → dryRun preview (classified rows + counters) →
// confirm → commit → close + refetch (TransactionsPage.loadTransactions()).
//
// Contract (fixed — Engineer implements exactly this against
// src/app/api/transactions/import/route.ts):
//   POST /api/transactions/import  body: { csv: string, dryRun: boolean }
//   dryRun response:  { summary: ImportSummary, rows: ImportRow[] }
//   commit response:  { inserted: number, duplicate: number, summary: ImportSummary }
//
// TODO: ligar ao API — o endpoint pode ainda não existir em runtime durante
// o desenvolvimento em paralelo do Engineer; este componente só assume o
// contrato acima (tipos abaixo espelham-no 1:1).
// ---------------------------------------------------------------------------

export type ImportRowStatus = "new" | "duplicate" | "ignored" | "error";
export type ImportRowType = "buy" | "sell" | "cash" | "div" | null;

export interface ImportRow {
  status: ImportRowStatus;
  reason?: string;
  date: string;
  type: ImportRowType;
  ticker: string | null;
  label: string | null;
  qty: number | null;
  price: number | null;
  currency: string | null;
  total: number | null;
}

export interface ImportSummary {
  total: number;
  new: number;
  duplicate: number;
  ignored: number;
  error: number;
}

interface ImportDryRunResponse {
  summary: ImportSummary;
  rows: ImportRow[];
}

interface ImportCommitResponse {
  inserted: number;
  duplicate: number;
  summary: ImportSummary;
}

type Phase = "select" | "analyzing" | "preview";

// NFR: ficheiros acima de ~2MB são rejeitados client-side, sem round-trip.
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
    };
    const fieldErrors = json.details?.fieldErrors;
    if (fieldErrors) {
      const first = Object.values(fieldErrors).flat()[0];
      if (first) return first;
    }
    return json.error ?? `Pedido falhou (${res.status})`;
  } catch {
    return `Pedido falhou (${res.status})`;
  }
}

const STATUS_BADGE_CONFIG: Record<
  ImportRowStatus,
  { label: string; className: string }
> = {
  new: {
    label: "NOVA",
    className:
      "bg-[var(--gain)]/12 text-[var(--gain)] border border-[var(--gain)]/40",
  },
  duplicate: {
    label: "DUPLICADA",
    className: "bg-muted text-muted-foreground border border-border/70",
  },
  ignored: {
    label: "IGNORADA",
    className: "bg-muted/50 text-muted-foreground/70 border border-border/40",
  },
  error: {
    label: "ERRO",
    className:
      "bg-[var(--loss)]/12 text-[var(--loss)] border border-[var(--loss)]/40",
  },
};

function StatusBadge({ status }: { status: ImportRowStatus }) {
  const cfg = STATUS_BADGE_CONFIG[status];
  return (
    <span
      className={[
        "inline-flex px-2 py-[3px] rounded-sm text-[10px] font-semibold tracking-wider uppercase tabular-nums",
        cfg.className,
      ].join(" ")}
    >
      {cfg.label}
    </span>
  );
}

function Spinner() {
  return (
    <div
      className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"
      aria-hidden="true"
    />
  );
}

interface CounterConfig {
  key: keyof Pick<ImportSummary, "new" | "duplicate" | "ignored" | "error">;
  label: string;
  valueClassName: string;
}

const COUNTERS: CounterConfig[] = [
  { key: "new", label: "Novas", valueClassName: "text-[var(--gain)]" },
  {
    key: "duplicate",
    label: "Duplicadas",
    valueClassName: "text-muted-foreground",
  },
  {
    key: "ignored",
    label: "Ignoradas",
    valueClassName: "text-muted-foreground/70",
  },
  { key: "error", label: "Erros", valueClassName: "text-[var(--loss)]" },
];

const PREVIEW_TH =
  "px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground border-b border-border/40 whitespace-nowrap";

export function ImportModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportModalProps) {
  const [phase, setPhase] = useState<Phase>("select");
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [committing, setCommitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ImportRowStatus | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local state every time the modal opens — reabrir começa sempre na
  // fase 1 (CA: fechar em qualquer fase descarta o estado local).
  useEffect(() => {
    if (open) {
      setPhase("select");
      setCsvText(null);
      setFileError(null);
      setApiError(null);
      setSummary(null);
      setRows([]);
      setCommitting(false);
      setStatusFilter(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  function handleClose() {
    onOpenChange(false);
  }

  async function runDryRun(csv: string) {
    setPhase("analyzing");
    setApiError(null);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun: true }),
      });
      if (!res.ok) {
        setApiError(await parseApiError(res));
        setPhase("select");
        return;
      }
      const json = (await res.json()) as ImportDryRunResponse;
      setSummary(json.summary);
      setRows(json.rows);
      setStatusFilter(null);
      setPhase("preview");
    } catch {
      setApiError("Falha de rede. Tenta novamente.");
      setPhase("select");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setApiError(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Apenas ficheiros .csv são aceites.");
      setCsvText(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Ficheiro demasiado grande (máx. ~2MB).");
      setCsvText(null);
      return;
    }

    setFileError(null);
    const text = await file.text();
    setCsvText(text);
    await runDryRun(text);
  }

  function handleRetryDryRun() {
    if (csvText) void runDryRun(csvText);
  }

  async function handleConfirm() {
    if (!csvText || !summary || summary.new === 0) return;
    setCommitting(true);
    setApiError(null);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, dryRun: false }),
      });
      if (!res.ok) {
        setApiError(await parseApiError(res));
        return;
      }
      // Resposta commit: { inserted, duplicate, summary } — não é necessária
      // no cliente além de confirmar sucesso; a tabela recarrega via onSuccess.
      (await res.json()) as ImportCommitResponse;
      onSuccess();
      onOpenChange(false);
    } catch {
      setApiError("Falha de rede. Tenta novamente.");
    } finally {
      setCommitting(false);
    }
  }

  function toggleStatusFilter(status: ImportRowStatus) {
    setStatusFilter((prev) => (prev === status ? null : status));
  }

  const title =
    phase === "preview" ? "Pré-visualização" : "Importar transacções";
  const visibleRows = statusFilter
    ? rows.filter((r) => r.status === statusFilter)
    : rows;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        className="max-w-3xl bg-card border-border/50 neon-border-primary p-6"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
        </DialogHeader>

        {/* Fase 1 — seleção de ficheiro */}
        {phase === "select" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Label
              htmlFor="import-file"
              className="text-xs text-muted-foreground uppercase tracking-wide"
            >
              Ficheiro CSV
            </Label>
            <input
              ref={inputRef}
              id="import-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              aria-label="Ficheiro CSV"
              className="w-full max-w-sm bg-background border border-input rounded-md text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-muted/70 cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Apenas ficheiros .csv do Trading212
            </p>
            {fileError && (
              <span className="text-xs text-[var(--loss)]">{fileError}</span>
            )}
            {apiError && (
              <div
                role="alert"
                className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--loss)]/40 bg-[var(--loss)]/10 px-3 py-2 text-sm text-[var(--loss)]"
              >
                <span>{apiError}</span>
                {csvText && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRetryDryRun}
                  >
                    Tentar novamente
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fase 2 — loading do dryRun */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Spinner />
            <p className="text-sm text-muted-foreground">
              A analisar ficheiro…
            </p>
          </div>
        )}

        {/* Fase 3 — preview + footer */}
        {phase === "preview" && summary && (
          <>
            <div className="flex flex-col gap-4">
              {/* Contadores */}
              <div
                aria-live="polite"
                className="flex items-center gap-6 rounded-md border border-border/40 bg-background px-4 py-3"
              >
                {COUNTERS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleStatusFilter(c.key)}
                    className={[
                      "flex flex-col items-start gap-0.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/40",
                      statusFilter === c.key ? "bg-muted/60" : "",
                    ].join(" ")}
                    aria-pressed={statusFilter === c.key}
                    aria-label={`Filtrar por ${c.label}`}
                  >
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {c.label}
                    </span>
                    <span
                      className={`text-2xl font-semibold tabular-nums ${c.valueClassName}`}
                    >
                      {summary[c.key]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tabela de preview */}
              <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-md border border-border/40">
                <table className="w-full border-collapse">
                  <caption className="sr-only">
                    Pré-visualização da importação
                  </caption>
                  <thead>
                    <tr>
                      <th className={PREVIEW_TH}>Status</th>
                      <th className={PREVIEW_TH}>Data</th>
                      <th className={PREVIEW_TH}>Tipo</th>
                      <th className={PREVIEW_TH}>Ticker/Label</th>
                      <th className={`${PREVIEW_TH} text-right`}>Qtd</th>
                      <th className={`${PREVIEW_TH} text-right`}>Preço</th>
                      <th className={PREVIEW_TH}>Moeda</th>
                      <th className={`${PREVIEW_TH} text-right`}>Total</th>
                      <th className={PREVIEW_TH}>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, idx) => {
                      const dimmed =
                        row.status === "duplicate" || row.status === "ignored";
                      return (
                        <tr
                          key={`${row.date}-${row.ticker ?? row.label ?? "row"}-${idx}`}
                          className={[
                            "border-b border-border/40 text-xs transition-colors hover:bg-muted/40",
                            dimmed ? "opacity-70" : "",
                          ].join(" ")}
                        >
                          <td className="px-3 py-2 align-middle">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 align-middle">
                            {fmtDate(row.date)}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {row.type ? (
                              <TypeBadge type={row.type} />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-middle font-semibold tracking-wide">
                            {row.ticker ?? row.label ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums align-middle">
                            {row.qty !== null
                              ? row.qty.toLocaleString("en-GB")
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums align-middle">
                            {fmt(row.price, row.currency ?? "EUR")}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {row.currency ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums align-middle">
                            {fmt(row.total, row.currency ?? "EUR")}
                          </td>
                          <td
                            className={[
                              "max-w-[220px] truncate px-3 py-2 align-middle",
                              row.status === "error"
                                ? "text-[var(--loss)]"
                                : "text-muted-foreground",
                            ].join(" ")}
                            title={row.reason}
                          >
                            {row.reason ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {apiError && (
                <div
                  role="alert"
                  className="rounded-md border border-[var(--loss)]/40 bg-[var(--loss)]/10 px-3 py-2 text-sm text-[var(--loss)]"
                >
                  {apiError}
                </div>
              )}

              {summary.new === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nada para importar — todas as linhas são duplicadas,
                  ignoradas ou inválidas.
                </p>
              )}
            </div>

            <DialogFooter className="mt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={handleClose}
                disabled={committing}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                className="neon-primary"
                onClick={handleConfirm}
                disabled={committing || summary.new === 0}
                title={
                  summary.new === 0
                    ? "Nada para importar — todas as linhas são duplicadas, ignoradas ou inválidas"
                    : undefined
                }
              >
                {committing ? "A importar…" : `Importar ${summary.new} novas`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
