import type { HrBatchReport } from "@/lib/hr-batch-report";
import type { ReadingPeriod } from "@/lib/reading-period-map";

export const CSV_HISTORY_STORAGE_KEY = "conta-ponto:csv-history";

/** Limite de entradas para não estourar quota do localStorage. */
export const MAX_HISTORY_ENTRIES = 40;

export type CsvHistoryEntry = {
  id: string;
  createdAt: string;
  report: HrBatchReport;
  /** @deprecated Substituído pelo período De/Até. Mantido para compatibilidade com entradas antigas. */
  csvIncludedDays?: number[] | null;
  /** Período de leitura informado no momento da captura (YYYY-MM-DD). */
  readingPeriodStart?: string;
  readingPeriodEnd?: string;
};

/**
 * Remove texto bruto da IA antes de persistir (economiza espaço no localStorage).
 */
export function sanitizeReportForStorage(report: HrBatchReport): HrBatchReport {
  return {
    skippedImageCount: report.skippedImageCount,
    employees: report.employees.map((e) => ({
      ...e,
      raw: "",
    })),
  };
}

function parseStored(raw: string | null): CsvHistoryEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is CsvHistoryEntry =>
        item !== null &&
        typeof item === "object" &&
        "id" in item &&
        "createdAt" in item &&
        "report" in item,
    );
  } catch {
    return [];
  }
}

export function loadHistory(): CsvHistoryEntry[] {
  if (typeof window === "undefined") return [];
  return parseStored(window.localStorage.getItem(CSV_HISTORY_STORAGE_KEY));
}

function saveHistory(entries: CsvHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CSV_HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

/**
 * Adiciona entrada no início da lista (mais recente primeiro) e aplica limite.
 */
export function appendEntry(
  report: HrBatchReport,
  readingPeriod?: ReadingPeriod,
  /** Subconjunto de dias do cartão (1–31) no CSV; `null` = todos. */
  csvIncludedDays?: number[] | null,
): CsvHistoryEntry {
  const entry: CsvHistoryEntry = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    report: sanitizeReportForStorage(report),
    ...(readingPeriod
      ? { readingPeriodStart: readingPeriod.start, readingPeriodEnd: readingPeriod.end }
      : {}),
    ...(csvIncludedDays != null && csvIncludedDays.length > 0
      ? { csvIncludedDays }
      : {}),
  };
  const list = loadHistory();
  const next = [entry, ...list].slice(0, MAX_HISTORY_ENTRIES);
  saveHistory(next);
  return entry;
}

export function updateEntryPeriod(id: string, period: ReadingPeriod) {
  const list = loadHistory().map((e) =>
    e.id === id
      ? { ...e, readingPeriodStart: period.start, readingPeriodEnd: period.end }
      : e,
  );
  saveHistory(list);
}

export function removeEntry(id: string) {
  const list = loadHistory().filter((e) => e.id !== id);
  saveHistory(list);
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CSV_HISTORY_STORAGE_KEY);
}
