/** T33 — V8, V9, V15. Transições de status. */
import { describe, expect, it } from "vitest";
import { canEdit, canTransition } from "./status";

describe("canTransition (V8)", () => {
  it("pendente → aprovada (gestor) OK", () => {
    expect(canTransition("pendente", "aprovada", { papel: "gestor" })).toEqual({
      ok: true,
    });
  });

  it("pendente → recusada exige motivo (V9)", () => {
    const noMotivo = canTransition("pendente", "recusada", { papel: "gestor" });
    expect(noMotivo.ok).toBe(false);
    if (!noMotivo.ok) expect(noMotivo.reason).toMatch(/motivo/);
    const withMotivo = canTransition("pendente", "recusada", {
      papel: "gestor",
      motivo: "estoque cheio",
    });
    expect(withMotivo.ok).toBe(true);
  });

  it("motivo só whitespace falha (V9)", () => {
    const r = canTransition("pendente", "recusada", {
      papel: "gestor",
      motivo: "   ",
    });
    expect(r.ok).toBe(false);
  });

  it("status terminal: aprovada → pendente bloqueado (V15)", () => {
    expect(canTransition("aprovada", "pendente", { papel: "gestor" }).ok).toBe(false);
    expect(canTransition("recusada", "aprovada", { papel: "gestor" }).ok).toBe(false);
    expect(canTransition("cancelada", "aprovada", { papel: "gestor" }).ok).toBe(false);
    expect(canTransition("atendida", "aprovada", { papel: "gestor" }).ok).toBe(false);
  });

  it("aprovada → atendida (gestor) OK; aprovada → cancelada OK", () => {
    expect(canTransition("aprovada", "atendida", { papel: "gestor" }).ok).toBe(true);
    expect(canTransition("aprovada", "cancelada", { papel: "gestor" }).ok).toBe(true);
  });

  it("líder não muda status (só cancelamento)", () => {
    expect(canTransition("pendente", "aprovada", { papel: "lider" }).ok).toBe(false);
    expect(canTransition("pendente", "cancelada", { papel: "lider" }).ok).toBe(true);
  });

  it("funcionário não cancela", () => {
    expect(canTransition("pendente", "cancelada", { papel: "funcionario" }).ok).toBe(
      false,
    );
  });
});

describe("canEdit (V15)", () => {
  it("só permite edição quando pendente", () => {
    expect(canEdit("pendente")).toBe(true);
    expect(canEdit("aprovada")).toBe(false);
    expect(canEdit("recusada")).toBe(false);
    expect(canEdit("cancelada")).toBe(false);
    expect(canEdit("atendida")).toBe(false);
  });
});
