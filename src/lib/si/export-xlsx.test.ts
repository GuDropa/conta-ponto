/** T37 — export xlsx. */
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { Solicitacao } from "./airtable";
import { buildExportRows, buildExportXlsx } from "./export-xlsx";

const rows: Solicitacao[] = [
  {
    id: "1",
    setor: "padaria",
    solicitante: "João",
    produto: "farinha",
    qtd: 10,
    unidade: "kg",
    prioridade: "alta",
    obs: "urgente",
    status: "pendente",
    criado_em: "2026-01-01",
    atualizado_em: "2026-01-01",
  },
  {
    id: "2",
    setor: "caixa",
    solicitante: "Maria",
    produto: "sacola",
    qtd: 100,
    unidade: "un",
    prioridade: "media",
    status: "aprovada",
    criado_em: "2026-01-02",
    atualizado_em: "2026-01-02",
  },
];

describe("buildExportRows", () => {
  it("mapeia 1:1 e preenche obs vazio quando ausente", () => {
    const out = buildExportRows(rows);
    expect(out).toHaveLength(2);
    expect(out[0].produto).toBe("farinha");
    expect(out[0].obs).toBe("urgente");
    expect(out[1].obs).toBe("");
  });
});

describe("buildExportXlsx", () => {
  it("gera buffer xlsx legível com as linhas", () => {
    const buf = buildExportXlsx(rows);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toContain("Solicitacoes");
    const ws = wb.Sheets["Solicitacoes"];
    const json = XLSX.utils.sheet_to_json(ws);
    expect(json).toHaveLength(2);
    expect((json[0] as Record<string, unknown>).produto).toBe("farinha");
  });

  it("preserva filtragem aplicada externamente (linhas zero)", () => {
    const buf = buildExportXlsx([]);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets["Solicitacoes"];
    const json = XLSX.utils.sheet_to_json(ws);
    expect(json).toHaveLength(0);
  });
});
