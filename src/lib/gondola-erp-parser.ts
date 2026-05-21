/**
 * Parser puro de linhas da planilha ERP. Extraído para testes (T29).
 *
 * Cites: V2 — coluna barcode obrigatória.
 */
import type { ErpProduct } from "./gondola-store";

export const BARCODE_KEYS = [
  "codigo_barras",
  "cod_barras",
  "barcode",
  "ean",
  "codigo",
  "código",
  "cod",
  "gtin",
];
export const DESC_KEYS = [
  "descricao",
  "descrição",
  "description",
  "produto",
  "nome",
  "name",
];

export function normalizeHeader(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function findColumn(
  headers: string[],
  candidates: string[],
): string | null {
  for (const h of headers) {
    if (candidates.includes(normalizeHeader(h))) return h;
  }
  return null;
}

export type ParseResult =
  | { ok: true; products: ErpProduct[] }
  | { ok: false; reason: string };

export function parseErpRows(
  rows: Record<string, unknown>[],
): ParseResult {
  if (!rows || rows.length === 0) {
    return { ok: false, reason: "planilha vazia" };
  }
  const headers = Object.keys(rows[0]);
  const barcodeCol = findColumn(headers, BARCODE_KEYS);
  if (!barcodeCol) {
    return { ok: false, reason: "coluna de barcode ausente" };
  }
  const descCol = findColumn(headers, DESC_KEYS);
  const products: ErpProduct[] = rows
    .map((row) => ({
      barcode: String(row[barcodeCol] ?? "").trim(),
      description: descCol ? String(row[descCol] ?? "").trim() : "—",
    }))
    .filter((p) => p.barcode !== "" && p.barcode !== "undefined");
  if (products.length === 0) {
    return { ok: false, reason: "nenhum produto válido" };
  }
  return { ok: true, products };
}
