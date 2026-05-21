/** T29 — V2. Parser planilha ERP. */
import { describe, expect, it } from "vitest";
import { parseErpRows } from "./gondola-erp-parser";

describe("parseErpRows (V2)", () => {
  it("aceita colunas válidas e retorna produtos", () => {
    const result = parseErpRows([
      { codigo_barras: "123", descricao: "Pão" },
      { codigo_barras: "456", descricao: "Leite" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.products).toHaveLength(2);
      expect(result.products[0]).toEqual({ barcode: "123", description: "Pão" });
    }
  });

  it("aceita aliases (ean / codigo)", () => {
    const result = parseErpRows([{ ean: "789", nome: "Queijo" }]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.products[0]).toEqual({ barcode: "789", description: "Queijo" });
    }
  });

  it("bloqueia quando coluna de barcode está ausente", () => {
    const result = parseErpRows([{ produto: "Pão", preco: 5 }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/barcode/);
  });

  it("bloqueia quando lista vazia", () => {
    const result = parseErpRows([]);
    expect(result.ok).toBe(false);
  });

  it("descarta linhas com barcode vazio", () => {
    const result = parseErpRows([
      { codigo_barras: "111", descricao: "X" },
      { codigo_barras: "", descricao: "Y" },
      { codigo_barras: "   ", descricao: "Z" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.products).toHaveLength(1);
  });

  it("descrição padrão é '—' quando coluna não existe", () => {
    const result = parseErpRows([{ codigo_barras: "111" }]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.products[0].description).toBe("—");
  });
});
