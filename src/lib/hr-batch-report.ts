import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";
import type { TimeField } from "@/types/timecard";

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

const CSV_HEADER = [
  "Par",
  "Colaborador",
  "Dia",
  "Entrada Manhã",
  "Saída Manhã",
  "Entrada Tarde",
  "Saída Tarde",
  "Extra Entrada",
  "Extra Saída",
  "Observação",
] as const;

const TIME_FIELDS: TimeField[] = [
  "entry1",
  "exit1",
  "entry2",
  "exit2",
  "extraEntry",
  "extraExit",
];

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
};

/**
 * Gera CSV (UTF-8 com BOM) compatível com Excel em PT-BR.
 * O filtro `onlyDays` aplica-se só à exportação; não altera o `report` passado.
 */
export function buildHrReportCsv(
  report: HrBatchReport,
  options?: BuildHrReportCsvOptions,
): string {
  const working = filterReportDays(report, options?.onlyDays);
  const sep = ";";
  const lines: string[] = [CSV_HEADER.join(sep)];

  for (const emp of working.employees) {
    if (emp.error) {
      lines.push(
        [
          String(emp.pairIndex + 1),
          escapeCsvField(emp.employeeName || ""),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          escapeCsvField(emp.error),
        ].join(sep),
      );
      continue;
    }

    if (emp.detections.length === 0) {
      lines.push(
        [
          String(emp.pairIndex + 1),
          escapeCsvField(emp.employeeName || ""),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ].join(sep),
      );
      continue;
    }

    for (const row of emp.detections) {
      const cells = [
        String(emp.pairIndex + 1),
        escapeCsvField(emp.employeeName || ""),
        String(row.day),
        ...TIME_FIELDS.map((f) => escapeCsvField(row.values[f] ?? "")),
        "",
      ];
      lines.push(cells.join(sep));
    }
  }

  if (working.skippedImageCount > 0) {
    lines.push("");
    lines.push(
      [
        "",
        escapeCsvField(
          `AVISO: ${working.skippedImageCount} imagem(ns) sem par (não processadas).`,
        ),
        ...Array(8).fill(""),
      ].join(sep),
    );
  }

  return "\uFEFF" + lines.join("\r\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
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
