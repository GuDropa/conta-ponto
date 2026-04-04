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
 * Agrupa os resultados por funcionário em linhas tabulares para exportação.
 */
export function buildHrBatchReport(
  results: HrBatchEmployeeResult[],
  skippedImageCount: number,
): HrBatchReport {
  return { employees: results, skippedImageCount };
}

/**
 * Gera CSV (UTF-8 com BOM) compatível com Excel em PT-BR.
 */
export function buildHrReportCsv(report: HrBatchReport): string {
  const sep = ";";
  const lines: string[] = [CSV_HEADER.join(sep)];

  for (const emp of report.employees) {
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

  if (report.skippedImageCount > 0) {
    lines.push("");
    lines.push(
      [
        "",
        escapeCsvField(
          `AVISO: ${report.skippedImageCount} imagem(ns) sem par (não processadas).`,
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
