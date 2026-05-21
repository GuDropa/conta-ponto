/**
 * Service layer testável para mutações de solicitação.
 * Centraliza V11 (logs) e V15/V9 (validações de transição).
 *
 * Cites: V11, V15, V9.
 */
import type {
  AirtableClient,
  Prioridade,
  Solicitacao,
  Status,
} from "./airtable";
import type { SessionPayload } from "./session";
import { canEdit, canTransition } from "./status";

export type MutResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string; code?: number };

export interface CreateSolicitacaoInput {
  produto: string;
  qtd: number;
  unidade: string;
  prioridade: Prioridade;
  obs?: string;
  setor: string;
}

export async function createSolicitacao(
  at: AirtableClient,
  session: SessionPayload,
  input: CreateSolicitacaoInput,
): Promise<MutResult<Solicitacao>> {
  const s = await at.solicitacoes.create({
    setor: input.setor,
    solicitante: session.nome,
    produto: input.produto,
    qtd: input.qtd,
    unidade: input.unidade,
    prioridade: input.prioridade,
    obs: input.obs,
  });
  // V11
  await at.logSolicitacoes.create({
    solicitacao_id: s.id,
    ator: session.nome,
    acao: "criar",
    payload: JSON.stringify(input),
  });
  return { ok: true, data: s };
}

export interface EditSolicitacaoInput {
  qtd?: number;
  unidade?: string;
  prioridade?: Prioridade;
  obs?: string;
  produto?: string;
}

export async function editSolicitacao(
  at: AirtableClient,
  session: SessionPayload,
  id: string,
  patch: EditSolicitacaoInput,
): Promise<MutResult<Solicitacao>> {
  const current = await at.solicitacoes.get(id);
  if (!current) return { ok: false, reason: "não encontrada", code: 404 };
  if (!canEdit(current.status)) {
    return { ok: false, reason: "edição bloqueada", code: 409 };
  }
  const updated = await at.solicitacoes.update(id, patch);
  // V11
  await at.logSolicitacoes.create({
    solicitacao_id: id,
    ator: session.nome,
    acao: "editar",
    payload: JSON.stringify({ before: current, patch }),
  });
  return { ok: true, data: updated };
}

export async function changeStatus(
  at: AirtableClient,
  session: SessionPayload,
  id: string,
  to: Status,
  motivo?: string,
): Promise<MutResult<Solicitacao>> {
  const current = await at.solicitacoes.get(id);
  if (!current) return { ok: false, reason: "não encontrada", code: 404 };
  const verdict = canTransition(current.status, to, {
    papel: session.papel,
    motivo,
  });
  if (!verdict.ok) {
    return { ok: false, reason: verdict.reason, code: 400 };
  }
  const updated = await at.solicitacoes.update(id, { status: to });
  // V11
  if (to === "cancelada") {
    await at.logSolicitacoes.create({
      solicitacao_id: id,
      ator: session.nome,
      acao: "cancelar",
      payload: JSON.stringify({ from: current.status, motivo: motivo ?? "" }),
    });
  } else {
    await at.logAprovacoes.create({
      solicitacao_id: id,
      ator: session.nome,
      decisao: to as "aprovada" | "recusada" | "atendida",
      motivo: to === "recusada" ? motivo : undefined,
    });
  }
  return { ok: true, data: updated };
}

export function validatePrioridade(p: unknown): p is Prioridade {
  return p === "baixa" || p === "media" || p === "alta" || p === "urgente";
}
