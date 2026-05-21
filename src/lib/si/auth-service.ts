/**
 * Login server-side. Pure logic (recebe deps injetadas).
 *
 * Cites: V12 (bcrypt), V18 (cookie httpOnly), V14.
 */
import bcrypt from "bcryptjs";
import type { Usuario } from "./airtable";
import type { Papel, SessionPayload } from "./session";

export interface FuncionarioLogin {
  kind: "funcionario";
  nome: string;
  setor: string;
}
export interface CredenciaisLogin {
  kind: "credenciais";
  usuario: string;
  senha: string;
}
export type LoginInput = FuncionarioLogin | CredenciaisLogin;

export type LoginResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; reason: string };

export interface AuthDeps {
  findByLogin: (usuario: string) => Promise<Usuario | null>;
  compare?: (plain: string, hash: string) => Promise<boolean>;
}

export async function login(
  input: LoginInput,
  deps: AuthDeps,
): Promise<LoginResult> {
  if (input.kind === "funcionario") {
    const nome = input.nome.trim();
    const setor = input.setor.trim();
    if (!nome || !setor) {
      return { ok: false, reason: "nome e setor obrigatórios" };
    }
    const session: SessionPayload = {
      papel: "funcionario",
      nome,
      setor,
      iat: Math.floor(Date.now() / 1000),
    };
    return { ok: true, session };
  }
  // credenciais
  const compare = deps.compare ?? bcrypt.compare;
  const usuario = input.usuario.trim();
  const senha = input.senha;
  if (!usuario || !senha) {
    return { ok: false, reason: "usuário e senha obrigatórios" };
  }
  const u = await deps.findByLogin(usuario);
  if (!u || !u.ativo) {
    return { ok: false, reason: "credenciais inválidas" };
  }
  const okHash = await compare(senha, u.senha_hash);
  if (!okHash) {
    return { ok: false, reason: "credenciais inválidas" };
  }
  const papel: Papel = u.papel === "gestor" ? "gestor" : "lider";
  return {
    ok: true,
    session: {
      papel,
      nome: u.usuario,
      setor: u.setor,
      iat: Math.floor(Date.now() / 1000),
    },
  };
}

export async function hashSenha(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
