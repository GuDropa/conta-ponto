/** T32, T34 — V10, V13, V14. RBAC + scoping. */
import { describe, expect, it } from "vitest";
import { can, checkRoute, scopeSolicitacoes, scopeProdutos } from "./rbac";
import type { SessionPayload } from "./session";

const funcSession: SessionPayload = {
  papel: "funcionario",
  nome: "João",
  setor: "padaria",
  iat: 1,
};
const liderSession: SessionPayload = {
  papel: "lider",
  nome: "ana",
  setor: "padaria",
  iat: 1,
};
const gestorSession: SessionPayload = {
  papel: "gestor",
  nome: "g",
  iat: 1,
};

describe("checkRoute (V14)", () => {
  it("/login: sempre permitido", () => {
    expect(checkRoute("/solicita-insumos/login", null).ok).toBe(true);
  });

  it("sem sessão: redireciona para /login", () => {
    const r = checkRoute("/solicita-insumos", null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.redirect).toBe("/solicita-insumos/login");
  });

  it("funcionário bloqueado em /setor /admin /admin/usuarios", () => {
    expect(checkRoute("/solicita-insumos/setor", funcSession).ok).toBe(false);
    expect(checkRoute("/solicita-insumos/admin", funcSession).ok).toBe(false);
    expect(checkRoute("/solicita-insumos/admin/usuarios", funcSession).ok).toBe(false);
  });

  it("líder OK em /setor; bloqueado em /admin e /admin/usuarios (V13)", () => {
    expect(checkRoute("/solicita-insumos/setor", liderSession).ok).toBe(true);
    expect(checkRoute("/solicita-insumos/admin", liderSession).ok).toBe(false);
    expect(checkRoute("/solicita-insumos/admin/usuarios", liderSession).ok).toBe(false);
  });

  it("gestor passa em tudo", () => {
    expect(checkRoute("/solicita-insumos/setor", gestorSession).ok).toBe(true);
    expect(checkRoute("/solicita-insumos/admin", gestorSession).ok).toBe(true);
    expect(checkRoute("/solicita-insumos/admin/usuarios", gestorSession).ok).toBe(true);
  });
});

describe("can (V13)", () => {
  it("usuarios.manage só gestor", () => {
    expect(can("funcionario", "usuarios.manage")).toBe(false);
    expect(can("lider", "usuarios.manage")).toBe(false);
    expect(can("gestor", "usuarios.manage")).toBe(true);
  });

  it("solicitacoes.status.change só gestor", () => {
    expect(can("lider", "solicitacoes.status.change")).toBe(false);
    expect(can("gestor", "solicitacoes.status.change")).toBe(true);
  });
});

describe("scopeSolicitacoes (V10)", () => {
  const rows = [
    { setor: "padaria", solicitante: "João" },
    { setor: "padaria", solicitante: "Maria" },
    { setor: "caixa", solicitante: "Carlos" },
  ];
  it("funcionário só vê do próprio setor + próprio nome", () => {
    expect(scopeSolicitacoes(rows, funcSession)).toEqual([
      { setor: "padaria", solicitante: "João" },
    ]);
  });
  it("líder vê tudo do setor", () => {
    expect(scopeSolicitacoes(rows, liderSession)).toEqual([
      { setor: "padaria", solicitante: "João" },
      { setor: "padaria", solicitante: "Maria" },
    ]);
  });
  it("gestor vê tudo", () => {
    expect(scopeSolicitacoes(rows, gestorSession)).toEqual(rows);
  });
});

describe("scopeProdutos (V10)", () => {
  const rows = [
    { setor: "padaria", nome: "farinha" },
    { setor: "caixa", nome: "sacola" },
  ];
  it("funcionário/líder: só do setor", () => {
    expect(scopeProdutos(rows, funcSession)).toEqual([
      { setor: "padaria", nome: "farinha" },
    ]);
    expect(scopeProdutos(rows, liderSession)).toEqual([
      { setor: "padaria", nome: "farinha" },
    ]);
  });
  it("gestor: tudo", () => {
    expect(scopeProdutos(rows, gestorSession)).toEqual(rows);
  });
});
