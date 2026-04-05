"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileDown, History, Pencil, Trash2 } from "lucide-react";

import { CsvDayPicker } from "@/components/csv/csv-day-picker";
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
  updateEntryIncludedDays,
  type CsvHistoryEntry,
} from "@/lib/csv-history-storage";
import { storedCsvDaysToSelection } from "@/lib/csv-included-days-prefs";
import { includedDaysArrayToSet } from "@/lib/hr-batch-report";
import { downloadHrReportCsv } from "@/lib/gemini-ocr-client";

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

function formatCsvDaysLine(entry: CsvHistoryEntry) {
  const d = entry.csvIncludedDays;
  if (!d?.length) return "CSV: todos os dias do cartão";
  if (d.length <= 10) return `CSV: dias ${d.join(", ")}`;
  return `CSV: ${d.length} dias selecionados`;
}

function filenameForEntry(entry: CsvHistoryEntry) {
  const d = new Date(entry.createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `relatorio-ponto-rh-${stamp}.csv`;
}

type CsvHistoryPanelProps = {
  /** Incrementar após novo relatório salvo para recarregar a lista. */
  historyVersion: number;
};

export function CsvHistoryPanel({ historyVersion }: CsvHistoryPanelProps) {
  const [entries, setEntries] = useState<CsvHistoryEntry[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editEntry, setEditEntry] = useState<CsvHistoryEntry | null>(null);
  const [editDays, setEditDays] = useState<Set<number>>(new Set());

  const refresh = useCallback(() => {
    setEntries(loadHistory());
  }, []);

  useEffect(() => {
    refresh();
  }, [historyVersion, refresh]);

  function handleDownload(entry: CsvHistoryEntry) {
    downloadHrReportCsv(
      entry.report,
      filenameForEntry(entry),
      includedDaysArrayToSet(entry.csvIncludedDays ?? null),
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
      !window.confirm("Apagar todo o histórico de CSV neste aparelho?")
    ) {
      return;
    }
    clearHistory();
    refresh();
  }

  function openEdit(entry: CsvHistoryEntry) {
    setEditEntry(entry);
    setEditDays(storedCsvDaysToSelection(entry.csvIncludedDays));
    queueMicrotask(() => dialogRef.current?.showModal());
  }

  function closeEdit() {
    dialogRef.current?.close();
    setEditEntry(null);
  }

  function saveEdit() {
    if (!editEntry) return;
    if (editDays.size === 0) {
      window.alert("Selecione pelo menos um dia do mês.");
      return;
    }
    updateEntryIncludedDays(
      editEntry.id,
      [...editDays].sort((a, b) => a - b),
    );
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
            Histórico de relatórios CSV
          </h3>
          <p className="text-sm text-muted-foreground">
            Cada leitura bem-sucedida fica salva neste dispositivo. Você pode
            baixar o arquivo de novo sem reprocessar as fotos. Editar só muda
            quais dias entram no CSV — a leitura completa permanece guardada.
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
              Na aba «Importar cartões», processe as fotos. O CSV será baixado e
              aparecerá aqui para download posterior.
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
                    <p className="text-xs text-muted-foreground">
                      {formatCsvDaysLine(entry)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(entry)}
                    >
                      <FileDown className="size-3.5" />
                      Baixar CSV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(entry)}
                      aria-label="Editar dias do CSV"
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
            <h4 className="text-base font-semibold">Dias no CSV</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina o intervalo de dias (1–31) que entra no CSV. A leitura
              completa do cartão permanece guardada.
            </p>
            <CsvDayPicker
              className="mt-4"
              selected={editDays}
              onSelectedChange={setEditDays}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
              <Button type="button" variant="outline" onClick={closeEdit}>
                Cancelar
              </Button>
              <Button type="button" onClick={saveEdit}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
