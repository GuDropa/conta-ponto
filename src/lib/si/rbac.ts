/**
 * Role-based access control para Solicita Insumos.
 * Pure logic — testável sem Next.
 *
 * Cites: V10, V13, V14.
 */
import type { Papel, SessionPayload } from "./session";

export type Action =
  // produtos
  | "produtos.list.own_setor"
  | "produtos.list.all"
  | "produtos.create"
  // solicitações
  | "solicitacoes.create"
  | "solicitacoes.list.own"
  | "solicitacoes.list.setor"
  | "solicitacoes.list.all"
  | "solicitacoes.edit.own_pendente"
  | "solicitacoes.edit.setor_pendente"
  | "solicitacoes.cancel.setor"
  | "solicitacoes.cancel.any"
  | "solicitacoes.status.change"
  | "solicitacoes.export"
  // usuários
  | "usuarios.manage";

const MATRIX: Record<Papel, Action[]> = {
  funcionario: [
    "produtos.list.own_setor",
    "produtos.create",
    "solicitacoes.create",
    "solicitacoes.list.own",
    "solicitacoes.edit.own_pendente",
  ],
  lider: [
    "produtos.list.own_setor",
    "produtos.create",
    "solicitacoes.create",
    "solicitacoes.list.own",
    "solicitacoes.list.setor",
    "solicitacoes.edit.own_pendente",
    "solicitacoes.edit.setor_pendente",
    "solicitacoes.cancel.setor",
  ],
  gestor: [
    "produtos.list.own_setor",
    "produtos.list.all",
    "produtos.create",
    "solicitacoes.create",
    "solicitacoes.list.own",
    "solicitacoes.list.setor",
    "solicitacoes.list.all",
    "solicitacoes.edit.own_pendente",
    "solicitacoes.edit.setor_pendente",
    "solicitacoes.cancel.setor",
    "solicitacoes.cancel.any",
    "solicitacoes.status.change",
    "solicitacoes.export",
    "usuarios.manage",
  ],
};

export function can(papel: Papel | undefined, action: Action): boolean {
  if (!papel) return false;
  return MATRIX[papel]?.includes(action) ?? false;
}

/**
 * Decide se uma sessão pode acessar uma rota /solicita-insumos/*.
 * Retorna `redirect` quando bloqueado.
 */
export function checkRoute(
  pathname: string,
  session: SessionPayload | null,
): { ok: true } | { ok: false; redirect: string } {
  // /solicita-insumos/login: sempre permitido
  if (pathname === "/solicita-insumos/login") return { ok: true };

  if (!session) {
    return { ok: false, redirect: "/solicita-insumos/login" };
  }

  if (pathname.startsWith("/solicita-insumos/admin/usuarios")) {
    if (session.papel !== "gestor") {
      return { ok: false, redirect: "/solicita-insumos" };
    }
  } else if (pathname.startsWith("/solicita-insumos/admin")) {
    if (session.papel !== "gestor") {
      return { ok: false, redirect: "/solicita-insumos" };
    }
  } else if (pathname.startsWith("/solicita-insumos/setor")) {
    if (session.papel !== "lider" && session.papel !== "gestor") {
      return { ok: false, redirect: "/solicita-insumos" };
    }
  }

  return { ok: true };
}

/**
 * Filtra solicitações por papel/setor — usado em endpoints e telas (V10).
 */
export function scopeSolicitacoes<
  T extends { setor: string; solicitante: string },
>(rows: T[], session: SessionPayload): T[] {
  if (session.papel === "gestor") return rows;
  if (session.papel === "lider") {
    return rows.filter((r) => r.setor === session.setor);
  }
  // funcionario
  return rows.filter(
    (r) => r.setor === session.setor && r.solicitante === session.nome,
  );
}

export function scopeProdutos<T extends { setor: string }>(
  rows: T[],
  session: SessionPayload,
): T[] {
  if (session.papel === "gestor") return rows;
  return rows.filter((r) => r.setor === session.setor);
}
