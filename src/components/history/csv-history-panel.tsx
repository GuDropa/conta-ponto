"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileDown, History, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  clearHistory,
  loadHistory,
  removeEntry,
  updateEntryPeriod,
  type CsvHistoryEntry,
} from "@/lib/csv-history-storage";
import { downloadHrReportXlsx } from "@/lib/gemini-ocr-client";
import { includedDaysArrayToSet } from "@/lib/hr-batch-report";
import {
  currentMonthPeriod,
  formatLocalIso,
  mapDetectionsToPeriod,
  referenceYearMonthFromPeriod,
  validatePeriod,
  type ReadingPeriod,
} from "@/lib/reading-period-map";

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function summarizeEntry(entry: CsvHistoryEntry) {
  const { report } = entry;
  const ok = report.employees.filter((e) => !e.error).length;
  const fail = report.employees.filter((e) => e.error).length;
  const parts = [`${ok} lido(s)`];
  if (fail > 0) parts.push(`${fail} erro(s)`);
  if (report.skippedImageCount > 0) {
    parts.push(`${report.skippedImageCount} foto(s) sem par`);
  }
  return parts.join(" · ");
}

function formatPeriodLine(entry: CsvHistoryEntry): string | null {
  if (!entry.readingPeriodStart || !entry.readingPeriodEnd) return null;
  const start = formatLocalIso(entry.readingPeriodStart);
  const end = formatLocalIso(entry.readingPeriodEnd);
  return start === end ? `Período: ${start}` : `Período: ${start} a ${end}`;
}

function filenameForEntry(entry: CsvHistoryEntry) {
  const d = new Date(entry.createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `relatorio-ponto-rh-${stamp}.xlsx`;
}

function periodFromEntry(entry: CsvHistoryEntry): ReadingPeriod {
  if (entry.readingPeriodStart && entry.readingPeriodEnd) {
    return { start: entry.readingPeriodStart, end: entry.readingPeriodEnd };
  }
  return currentMonthPeriod();
}

type CsvHistoryPanelProps = {
  /** Incrementar após novo relatório salvo para recarregar a lista. */
  historyVersion: number;
};

export function CsvHistoryPanel({ historyVersion }: CsvHistoryPanelProps) {
  const [entries, setEntries] = useState<CsvHistoryEntry[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editEntry, setEditEntry] = useState<CsvHistoryEntry | null>(null);
  const [editPeriod, setEditPeriod] = useState<ReadingPeriod>(currentMonthPeriod);

  const refresh = useCallback(() => {
    setEntries(loadHistory());
  }, []);

  useEffect(() => {
    refresh();
  }, [historyVersion, refresh]);

  function handleDownload(entry: CsvHistoryEntry) {
    let report = entry.report;
    const period = periodFromEntry(entry);

    if (entry.readingPeriodStart && entry.readingPeriodEnd) {
      const employees = report.employees.map((emp) => {
        if (emp.error) return emp;
        const { detections } = mapDetectionsToPeriod(emp.detections, period);
        return { ...emp, detections };
      });
      report = { ...report, employees };
    }

    downloadHrReportXlsx(
      report,
      filenameForEntry(entry),
      includedDaysArrayToSet(entry.csvIncludedDays ?? null),
      referenceYearMonthFromPeriod(period),
    );
  }

  function handleRemove(id: string) {
    removeEntry(id);
    refresh();
  }

  function handleClearAll() {
    if (entries.length === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Apagar todo o histórico de planilhas neste aparelho?")
    ) {
      return;
    }
    clearHistory();
    refresh();
  }

  function openEdit(entry: CsvHistoryEntry) {
    setEditEntry(entry);
    setEditPeriod(periodFromEntry(entry));
    queueMicrotask(() => dialogRef.current?.showModal());
  }

  function closeEdit() {
    dialogRef.current?.close();
    setEditEntry(null);
  }

  function saveEdit() {
    if (!editEntry) return;
    const err = validatePeriod(editPeriod);
    if (err) {
      window.alert(`Período inválido: ${err}`);
      return;
    }
    updateEntryPeriod(editEntry.id, editPeriod);
    refresh();
    closeEdit();
  }

  return (
    <section className="space-y-4" aria-labelledby="csv-history-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3
            id="csv-history-heading"
            className="text-base font-semibold text-foreground"
          >
            Histórico de relatórios
          </h3>
          <p className="text-sm text-muted-foreground">
            Cada leitura bem-sucedida fica salva neste dispositivo. Você pode
            baixar o arquivo de novo sem reprocessar as fotos. Editar permite
            corrigir o período de leitura associado à entrada.
          </p>
        </div>
        {entries.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="shrink-0"
          >
            <Trash2 className="size-3.5" />
            Limpar histórico
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <History className="size-5" />
              <CardTitle className="text-sm font-medium">
                Nenhum relatório ainda
              </CardTitle>
            </div>
            <CardDescription>
              Na aba «Importar cartões», processe as fotos. A planilha Excel
              (.xlsx) será baixada e aparecerá aqui para download posterior.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card size="sm">
                <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summarizeEntry(entry)}
                    </p>
                    {formatPeriodLine(entry) ? (
                      <p className="text-xs text-muted-foreground">
                        {formatPeriodLine(entry)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">
                        Sem período registrado
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(entry)}
                    >
                      <FileDown className="size-3.5" />
                      Baixar planilha
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(entry)}
                      aria-label="Editar período de leitura"
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemove(entry.id)}
                      aria-label="Remover entrada do histórico"
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 z-50 w-[min(100%,24rem)] max-h-[min(90dvh,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50"
        onClose={() => setEditEntry(null)}
      >
        {editEntry && (
          <div className="p-4">
            <h4 className="text-base font-semibold">Período de leitura</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Corrija as datas do primeiro e último dia desta leitura. O conteúdo
              do relatório já lido permanece guardado.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-period-start">
                  De
                </label>
                <input
                  id="edit-period-start"
                  type="date"
                  value={editPeriod.start}
                  max={editPeriod.end}
                  onChange={(e) =>
                    setEditPeriod((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="edit-period-end">
                  Até
                </label>
                <input
                  id="edit-period-end"
                  type="date"
                  value={editPeriod.end}
                  min={editPeriod.start}
                  onChange={(e) =>
                    setEditPeriod((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {validatePeriod(editPeriod) && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                {validatePeriod(editPeriod)}
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" onClick={closeEdit}>
                Cancelar
              </Button>
              <Button type="button" onClick={saveEdit} disabled={!!validatePeriod(editPeriod)}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
