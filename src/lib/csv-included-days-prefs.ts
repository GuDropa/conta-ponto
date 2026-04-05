import {
  ALL_CSV_DAYS,
  parseIncludedDaysList,
} from "@/lib/hr-batch-report";

export const CSV_INCLUDED_DAYS_PREFS_KEY = "conta-ponto:csv-included-days";

export function defaultCsvDaySelection(): Set<number> {
  return new Set(ALL_CSV_DAYS);
}

/**
 * Preferência salva no aparelho (ordem crescente). Vazio ou inválido → todos os dias.
 */
export function loadCsvIncludedDaysPreference(): Set<number> {
  if (typeof window === "undefined") return defaultCsvDaySelection();
  try {
    const raw = window.localStorage.getItem(CSV_INCLUDED_DAYS_PREFS_KEY);
    if (!raw) return defaultCsvDaySelection();
    const parsed = parseIncludedDaysList(JSON.parse(raw) as unknown);
    if (parsed.length === 0) return defaultCsvDaySelection();
    return new Set(parsed);
  } catch {
    return defaultCsvDaySelection();
  }
}

export function saveCsvIncludedDaysPreference(selected: Set<number>) {
  if (typeof window === "undefined") return;
  if (selected.size === 0) return;
  const arr = [...selected].sort((a, b) => a - b);
  if (
    arr.length === ALL_CSV_DAYS.length &&
    ALL_CSV_DAYS.every((d) => selected.has(d))
  ) {
    window.localStorage.setItem(
      CSV_INCLUDED_DAYS_PREFS_KEY,
      JSON.stringify(ALL_CSV_DAYS),
    );
    return;
  }
  window.localStorage.setItem(CSV_INCLUDED_DAYS_PREFS_KEY, JSON.stringify(arr));
}

/**
 * Para gravar no histórico: null se equivaler a “todos os dias”.
 */
export function selectionToStoredCsvDays(selected: Set<number>): number[] | null {
  if (selected.size === 0) return null;
  if (
    selected.size === ALL_CSV_DAYS.length &&
    ALL_CSV_DAYS.every((d) => selected.has(d))
  ) {
    return null;
  }
  return [...selected].sort((a, b) => a - b);
}

/** Interpreta metadado do histórico: null/[] → conjunto completo. */
export function storedCsvDaysToSelection(
  stored: number[] | null | undefined,
): Set<number> {
  if (stored == null || stored.length === 0) return defaultCsvDaySelection();
  const parsed = parseIncludedDaysList(stored);
  if (parsed.length === 0) return defaultCsvDaySelection();
  return new Set(parsed);
}
