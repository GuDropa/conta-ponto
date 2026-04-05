import {
  ALL_CSV_DAYS,
  type HrBatchReport,
  parseIncludedDaysList,
} from "@/lib/hr-batch-report";

export const CSV_HISTORY_STORAGE_KEY = "conta-ponto:csv-history";

/** Limite de entradas para não estourar quota do localStorage. */
export const MAX_HISTORY_ENTRIES = 40;

export type CsvHistoryEntry = {
  id: string;
  createdAt: string;
  report: HrBatchReport;
  /** Dias 1–31 incluídos no CSV; ausente ou null = todos. */
  csvIncludedDays?: number[] | null;
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

function normalizeStoredDays(days: number[] | null | undefined): number[] | null {
  if (days == null || days.length === 0) return null;
  const parsed = parseIncludedDaysList(days);
  if (parsed.length === 0) return null;
  if (
    parsed.length === ALL_CSV_DAYS.length &&
    ALL_CSV_DAYS.every((d) => parsed.includes(d))
  ) {
    return null;
  }
  return parsed;
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
  csvIncludedDays?: number[] | null,
): CsvHistoryEntry {
  const entry: CsvHistoryEntry = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    report: sanitizeReportForStorage(report),
    csvIncludedDays: normalizeStoredDays(csvIncludedDays ?? null),
  };
  const list = loadHistory();
  const next = [entry, ...list].slice(0, MAX_HISTORY_ENTRIES);
  saveHistory(next);
  return entry;
}

export function updateEntryIncludedDays(id: string, csvIncludedDays: number[]) {
  const normalized = normalizeStoredDays(csvIncludedDays);
  const list = loadHistory().map((e) =>
    e.id === id ? { ...e, csvIncludedDays: normalized } : e,
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
