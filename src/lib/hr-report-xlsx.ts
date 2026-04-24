import * as XLSX from "xlsx";

import {
  buildHrReportRows,
  type BuildHrReportCsvOptions,
  type HrBatchReport,
} from "@/lib/hr-batch-report";

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Gera .xlsx (OOXML) para o relatório RH — abre nativo no Excel, sem peça CSV.
 */
export function hrReportToXlsxBlob(
  report: HrBatchReport,
  options?: BuildHrReportCsvOptions,
  sheetName = "Ponto",
): Blob {
  const rows = buildHrReportRows(report, options);
  return aoaToXlsxBlob(rows, sheetName);
}

/**
 * Converte tabela (array de linhas) em Blob .xlsx.
 */
export function aoaToXlsxBlob(
  rows: (string | number)[][],
  sheetName: string,
): Blob {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const raw = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([raw], { type: XLSX_MIME });
}
