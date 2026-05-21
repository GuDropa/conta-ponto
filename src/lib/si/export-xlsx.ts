/**
 * Export de solicitações para .xlsx.
 * Pure logic: recebe rows e retorna buffer + worksheet builder (testável).
 */
import * as XLSX from "xlsx";
import type { Solicitacao } from "./airtable";

export interface ExportRow {
  setor: string;
  solicitante: string;
  produto: string;
  qtd: number;
  unidade: string;
  prioridade: string;
  status: string;
  obs: string;
  criado_em: string;
  atualizado_em: string;
}

export function buildExportRows(rows: Solicitacao[]): ExportRow[] {
  return rows.map((r) => ({
    setor: r.setor,
    solicitante: r.solicitante,
    produto: r.produto,
    qtd: r.qtd,
    unidade: r.unidade,
    prioridade: r.prioridade,
    status: r.status,
    obs: r.obs ?? "",
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
  }));
}

export function buildExportXlsx(rows: Solicitacao[]): Buffer {
  const data = buildExportRows(rows);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Solicitacoes");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}
