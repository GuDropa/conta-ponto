/**
 * gondola-xlsx — exportação do relatório check-gondolas.
 * V7: dois sheets — "Encontrados" e "Faltantes".
 * Reutiliza XLSX_MIME do módulo hr-report-xlsx.
 */
import * as XLSX from "xlsx";
import type { ErpProduct } from "@/lib/gondola-store";

export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface GondolaReportData {
  found: ErpProduct[];
  missing: ErpProduct[];
  sessionDate: string; // ISO string
}

/**
 * Gera Blob .xlsx com 2 sheets: "Encontrados" e "Faltantes".
 * V7 invariant.
 */
export function gondolaReportToXlsxBlob(data: GondolaReportData): Blob {
  const wb = XLSX.utils.book_new();

  const header = ["Código de Barras", "Descrição"];

  const foundRows = [header, ...data.found.map((p) => [p.barcode, p.description])];
  const missingRows = [header, ...data.missing.map((p) => [p.barcode, p.description])];

  const wsFound = XLSX.utils.aoa_to_sheet(foundRows);
  const wsMissing = XLSX.utils.aoa_to_sheet(missingRows);

  XLSX.utils.book_append_sheet(wb, wsFound, "Encontrados");
  XLSX.utils.book_append_sheet(wb, wsMissing, "Faltantes");

  const raw = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([raw], { type: XLSX_MIME });
}

/** Dispara download do blob no browser. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
