import { summarizeWorkedTime } from "@/lib/time-utils";
import type { DetectedDayTimes } from "@/lib/ocr-timecard-parser";

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
   * Mês de referência (1–12) para compor a coluna Data e Mês.
   * Quando ausente, usa o mês atual no momento da geração.
   */
  referenceMonth?: number;
  /**
   * Ano de referência (ex.: 2026) para compor a coluna Data e Ano.
   * Quando ausente, usa o ano atual no momento da geração.
   */
  referenceYear?: number;
};

/**
 * Gera CSV (UTF-8 com BOM) compatível com Excel em PT-BR, no padrão da
 * planilha central de ponto. Separador: vírgula.
 * O filtro `onlyDays` aplica-se só à exportação; não altera o `report` passado.
 * Colunas Setor, Valor Hora e Total a Receber são deixadas vazias para
 * preenchimento por fórmula na planilha de destino.
 */
export function buildHrReportCsv(
  report: HrBatchReport,
  options?: BuildHrReportCsvOptions,
): string {
  const working = filterReportDays(report, options?.onlyDays);
  const sep = ",";

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

  const lines: string[] = [CSV_HEADER.join(sep)];

  for (const emp of working.employees) {
    if (emp.error) {
      const row = [...EMPTY_ROW];
      row[1] = escapeCsvField(
        `${emp.employeeName || "?"} — ERRO: ${emp.error}`,
      );
      lines.push(row.join(sep));
      continue;
    }

    if (emp.detections.length === 0) {
      const row = [...EMPTY_ROW];
      row[1] = escapeCsvField(emp.employeeName || "");
      lines.push(row.join(sep));
      continue;
    }

    for (const detection of emp.detections) {
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
      const data = `${detection.day}/${refMonth}/${refYear}`;

      const row = [
        data,                                    // Data
        escapeCsvField(emp.employeeName || ""),  // Nome
        "",                                      // Setor (fórmula)
        escapeCsvField(v.entry1 ?? ""),          // Entrada
        escapeCsvField(v.exit1 ?? ""),           // Saida
        escapeCsvField(v.entry2 ?? ""),          // Retorno
        escapeCsvField(v.exit2 ?? ""),           // Saida2
        total,                                   // Total
        "",                                      // Valor Hora (fórmula)
        "",                                      // Total a Receber (fórmula)
        "",                                      // Total Hora Adc Noturno
        "",                                      // Valor Prêmio Produção
        "",                                      // Valor Extra
        String(detection.day),                   // Dia
        String(refMonth),                        // Mês
        String(refYear),                         // Ano
      ];
      lines.push(row.join(sep));
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
        ...Array(CSV_HEADER.length - 2).fill(""),
      ].join(sep),
    );
  }

  return "\uFEFF" + lines.join("\r\n");
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
