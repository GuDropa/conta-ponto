/** T31 — V12, V18. Login + bcrypt + sessão. */
import { describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { hashSenha, login } from "./auth-service";
import { signSession, verifySession } from "./session-node";

const SECRET = "test-secret-test-secret-test-secret";

describe("login funcionário (leve)", () => {
  it("emite sessão com nome+setor sem checar senha", async () => {
    const result = await login(
      { kind: "funcionario", nome: "João", setor: "padaria" },
      { findByLogin: vi.fn() },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.papel).toBe("funcionario");
      expect(result.session.nome).toBe("João");
      expect(result.session.setor).toBe("padaria");
    }
  });

  it("rejeita nome ou setor vazio", async () => {
    const result = await login(
      { kind: "funcionario", nome: "", setor: "padaria" },
      { findByLogin: vi.fn() },
    );
    expect(result.ok).toBe(false);
  });
});

describe("login credenciais (V12)", () => {
  it("aceita com hash bcrypt correto", async () => {
    const hash = await hashSenha("segredo123");
    const result = await login(
      { kind: "credenciais", usuario: "gestor", senha: "segredo123" },
      {
        findByLogin: async () => ({
          id: "u1",
          usuario: "gestor",
          senha_hash: hash,
          papel: "gestor",
          ativo: true,
        }),
      },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.papel).toBe("gestor");
  });

  it("rejeita senha incorreta", async () => {
    const hash = await hashSenha("certa");
    const result = await login(
      { kind: "credenciais", usuario: "u", senha: "errada" },
      {
        findByLogin: async () => ({
          id: "u1",
          usuario: "u",
          senha_hash: hash,
          papel: "lider",
          setor: "padaria",
          ativo: true,
        }),
      },
    );
    expect(result.ok).toBe(false);
  });

  it("rejeita usuário inativo", async () => {
    const hash = await hashSenha("certa");
    const result = await login(
      { kind: "credenciais", usuario: "u", senha: "certa" },
      {
        findByLogin: async () => ({
          id: "u1",
          usuario: "u",
          senha_hash: hash,
          papel: "lider",
          setor: "padaria",
          ativo: false,
        }),
      },
    );
    expect(result.ok).toBe(false);
  });

  it("rejeita usuário inexistente", async () => {
    const result = await login(
      { kind: "credenciais", usuario: "x", senha: "y" },
      { findByLogin: async () => null },
    );
    expect(result.ok).toBe(false);
  });
});

describe("hashSenha (V12)", () => {
  it("gera hash bcrypt válido e diferente do plaintext", async () => {
    const hash = await hashSenha("abc123");
    expect(hash).not.toBe("abc123");
    expect(await bcrypt.compare("abc123", hash)).toBe(true);
  });
});

describe("session sign/verify (V18)", () => {
  it("verifica token assinado", () => {
    const token = signSession(
      { papel: "gestor", nome: "g", iat: 1 },
      SECRET,
    );
    const out = verifySession(token, SECRET);
    expect(out).not.toBeNull();
    expect(out?.papel).toBe("gestor");
  });

  it("rejeita assinatura inválida", () => {
    const token = signSession({ papel: "gestor", nome: "g", iat: 1 }, SECRET);
    expect(verifySession(token, "outro-secret-com-tamanho-grande")).toBeNull();
  });

  it("rejeita token malformado", () => {
    expect(verifySession("lixo", SECRET)).toBeNull();
    expect(verifySession(null, SECRET)).toBeNull();
  });
});
