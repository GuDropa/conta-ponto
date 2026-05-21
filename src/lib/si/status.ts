/**
 * Transições de status de solicitação. Pure logic.
 *
 * Cites: V8, V9, V15.
 */
import type { Status } from "./airtable";
import type { Papel } from "./session";

export const STATUS_VALUES: Status[] = [
  "pendente",
  "aprovada",
  "recusada",
  "cancelada",
  "atendida",
];

const TRANSITIONS: Record<Status, Status[]> = {
  pendente: ["aprovada", "recusada", "cancelada"],
  aprovada: ["atendida", "cancelada"],
  recusada: [],
  cancelada: [],
  atendida: [],
};

export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: string };

export function canTransition(
  from: Status,
  to: Status,
  opts: { papel: Papel; motivo?: string },
): TransitionResult {
  if (!STATUS_VALUES.includes(to)) {
    return { ok: false, reason: "status inválido" };
  }
  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: `transição ${from} → ${to} não permitida` };
  }
  // V9 — recusa exige motivo
  if (to === "recusada") {
    if (!opts.motivo || opts.motivo.trim().length === 0) {
      return { ok: false, reason: "motivo obrigatório para recusa" };
    }
  }
  // V13/V14 — apenas gestor muda status arbitrariamente
  if (to !== "cancelada" && opts.papel !== "gestor") {
    return { ok: false, reason: "apenas gestor pode mudar status" };
  }
  // Cancelamento: líder ou gestor
  if (to === "cancelada" && opts.papel === "funcionario") {
    return { ok: false, reason: "funcionário não pode cancelar" };
  }
  return { ok: true };
}

/**
 * V15 — edição só permitida se status = pendente.
 */
export function canEdit(status: Status): boolean {
  return status === "pendente";
}
