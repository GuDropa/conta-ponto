import { summarizeWorkedTime, calculateNightWorkedMinutes, minutesToTimeString } from "@/lib/time-utils";
import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import { formatLocalIso } from "@/lib/reading-period-map";

export type HrBatchEmployeeResult = {
  pairIndex: number;
  employeeName: string;
  detections: DetectedDayTimes[];
  raw: string;
  error?: string;
};

export type HrBatchReport = {
  employees: HrBatchEmployeeResult[];
  /** Fotos descartadas por número ímpar (sem par). */
  skippedImageCount: number;
};

/** Dias 1–31 válidos para filtro de CSV (conferência). */
export const ALL_CSV_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export const HR_REPORT_HEADER = [
  "Data",
  "Nome",
  "Setor",
  "Entrada",
  "Saida",
  "Retorno",
  "Saida2",
  "Total",
  "Valor Hora",
  "Total a Receber",
  "Total Hora Adc Noturno",
  "Valor Prêmio Produção",
  "Valor Extra",
  "Dia",
  "Mês",
  "Ano",
] as const;

const CSV_HEADER = HR_REPORT_HEADER;

/**
 * Valida e deduplica dias (1–31); retorna array ordenado.
 */
export function parseIncludedDaysList(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  const set = new Set<number>();
  for (const d of days) {
    const n = typeof d === "number" ? d : Number(d);
    if (Number.isInteger(n) && n >= 1 && n <= 31) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * `null` ou `undefined` = exportar todos os dias presentes nas leituras.
 * `Set` vazio = nenhuma linha de dia (exceto erros).
 */
export function includedDaysArrayToSet(
  days: number[] | null | undefined,
): Set<number> | null {
  if (days == null || days.length === 0) return null;
  const parsed = parseIncludedDaysList(days);
  if (parsed.length === 0) return null;
  return new Set(parsed);
}

export function includedDaysSetToSortedArray(
  set: Set<number> | null,
): number[] | null {
  if (set == null || set.size === 0) return null;
  return [...set].sort((a, b) => a - b);
}

/**
 * Clona o relatório com `detections` filtradas por dia (não altera o original).
 */
export function filterReportDays(
  report: HrBatchReport,
  onlyDays: Set<number> | null | undefined,
): HrBatchReport {
  if (onlyDays == null) {
    return report;
  }
  if (onlyDays.size === 0) {
    return {
      ...report,
      employees: report.employees.map((e) => ({
        ...e,
        detections: e.error ? e.detections : [],
      })),
    };
  }
  return {
    ...report,
    employees: report.employees.map((e) => ({
      ...e,
      detections: e.error
        ? e.detections
        : e.detections.filter((d) => onlyDays.has(d.day)),
    })),
  };
}

/**
 * Agrupa os resultados por funcionário em linhas tabulares para exportação.
 */
export function buildHrBatchReport(
  results: HrBatchEmployeeResult[],
  skippedImageCount: number,
): HrBatchReport {
  return { employees: results, skippedImageCount };
}

export type BuildHrReportCsvOptions = {
  /** `null`/`undefined` = todos os dias; `Set` vazio = sem linhas de calendário */
  onlyDays?: Set<number> | null;
  /**
   * Mês (1–12) para linhas sem `calendarDate` no detection.
   * Em geral derivado do primeiro dia do período de leitura; se ausente, mês atual.
   */
  referenceMonth?: number;
  /**
   * Ano para linhas sem `calendarDate`. Em geral derivado do período; se ausente, ano atual.
   */
  referenceYear?: number;
};

/**
 * Linhas cruas (mesma ordem que CSV/XLSX). `onlyDays` só filtra exportação.
 * Colunas Setor, Valor Hora, Total a Receber vazias p/ fórmulas no destino.
 */
export function buildHrReportRows(
  report: HrBatchReport,
  options?: BuildHrReportCsvOptions,
): string[][] {
  const working = filterReportDays(report, options?.onlyDays);

  const now = new Date();
  const refMonth =
    options?.referenceMonth != null &&
    options.referenceMonth >= 1 &&
    options.referenceMonth <= 12
      ? options.referenceMonth
      : now.getMonth() + 1;
  const refYear =
    options?.referenceYear != null && options.referenceYear > 2000
      ? options.referenceYear
      : now.getFullYear();

  const EMPTY_ROW = Array<string>(CSV_HEADER.length).fill("");

  const rows: string[][] = [[...CSV_HEADER]];

  for (const emp of working.employees) {
    if (emp.error) {
      const row = [...EMPTY_ROW];
      row[1] = `${emp.employeeName || "?"} — ERRO: ${emp.error}`;
      rows.push(row);
      continue;
    }

    if (emp.detections.length === 0) {
      const row = [...EMPTY_ROW];
      row[1] = emp.employeeName || "";
      rows.push(row);
      continue;
    }

    const sortedDetections = [...emp.detections].sort((a, b) => {
      const keyA =
        a.calendarDate ?? `0000-00-${String(a.day).padStart(2, "0")}`;
      const keyB =
        b.calendarDate ?? `0000-00-${String(b.day).padStart(2, "0")}`;
      return keyA.localeCompare(keyB);
    });

    for (const detection of sortedDetections) {
      const v = detection.values;
      const workedFields = {
        entry1: v.entry1 ?? "",
        exit1: v.exit1 ?? "",
        entry2: v.entry2 ?? "",
        exit2: v.exit2 ?? "",
        extraEntry: v.extraEntry ?? "",
        extraExit: v.extraExit ?? "",
      };
      const total = summarizeWorkedTime(workedFields).hhmm;
      const nightTotal = minutesToTimeString(calculateNightWorkedMinutes(workedFields));
      const data = detection.calendarDate
        ? formatLocalIso(detection.calendarDate)
        : `${detection.day}/${refMonth}/${refYear}`;

      const row: string[] = [
        data,
        emp.employeeName || "",
        "",
        v.entry1 ?? "",
        v.exit1 ?? "",
        v.entry2 ?? "",
        v.exit2 ?? "",
        total,
        "",
        "",
        nightTotal,
        "",
        "",
        String(detection.day),
        detection.calendarDate
          ? String(Number(detection.calendarDate.split("-")[1]))
          : String(refMonth),
        detection.calendarDate
          ? detection.calendarDate.split("-")[0]
          : String(refYear),
      ];
      rows.push(row);
    }
  }

  if (working.skippedImageCount > 0) {
    rows.push(Array(CSV_HEADER.length).fill(""));
    const aviso = [...EMPTY_ROW];
    aviso[1] = `AVISO: ${working.skippedImageCount} imagem(ns) sem par (não processadas).`;
    rows.push(aviso);
  }

  return rows;
}

/**
 * Gera CSV (UTF-8 com BOM) — legado; export principal agora é XLSX.
 */
export function buildHrReportCsv(
  report: HrBatchReport,
  options?: BuildHrReportCsvOptions,
): string {
  const sep = ",";
  const rows = buildHrReportRows(report, options);
  return (
    "\uFEFF" +
    rows.map((r) => r.map((c) => escapeCsvField(c)).join(sep)).join("\r\n")
  );
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Estrutura JSON serializável do relatório consolidado (útil para inspeção ou integração).
 */
export function batchReportToJson(report: HrBatchReport): string {
  return JSON.stringify(report, null, 2);
}
