import { NextResponse } from "next/server";
import {
  getAirtable,
  type Prioridade,
  type Status,
} from "@/lib/si/airtable";
import { getSession } from "@/lib/si/server-session";
import { can, scopeSolicitacoes } from "@/lib/si/rbac";

export const runtime = "nodejs";

const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta", "urgente"];

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(req.url);
  const filter = {
    setor: url.searchParams.get("setor") ?? undefined,
    status: (url.searchParams.get("status") as Status | null) ?? undefined,
    prioridade:
      (url.searchParams.get("prioridade") as Prioridade | null) ?? undefined,
    solicitante: url.searchParams.get("solicitante") ?? undefined,
    desde: url.searchParams.get("desde") ?? undefined,
    ate: url.searchParams.get("ate") ?? undefined,
    scope: url.searchParams.get("scope") ?? "auto", // auto | own | setor | all
  };
  const at = getAirtable();
  const rows = await at.solicitacoes.list({
    setor: filter.setor,
    status: filter.status,
    prioridade: filter.prioridade,
    solicitante: filter.solicitante,
    desde: filter.desde,
    ate: filter.ate,
  });
  // Aplicar scope conforme papel/parâmetro (V10)
  let scoped = rows;
  if (session.papel === "funcionario") {
    scoped = scopeSolicitacoes(rows, session);
  } else if (session.papel === "lider") {
    if (filter.scope === "own") {
      scoped = rows.filter(
        (r) => r.setor === session.setor && r.solicitante === session.nome,
      );
    } else {
      scoped = scopeSolicitacoes(rows, session);
    }
  } else if (session.papel === "gestor") {
    if (filter.scope === "own") {
      scoped = rows.filter((r) => r.solicitante === session.nome);
    } else if (filter.scope === "setor" && filter.setor) {
      scoped = rows.filter((r) => r.setor === filter.setor);
    }
  }
  return NextResponse.json({ ok: true, solicitacoes: scoped });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!can(session.papel, "solicitacoes.create")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    produto?: string;
    qtd?: number;
    unidade?: string;
    prioridade?: Prioridade;
    obs?: string;
    setor?: string;
  };
  const produto = (body.produto ?? "").trim();
  const unidade = (body.unidade ?? "").trim();
  const qtd = Number(body.qtd);
  const prioridade = body.prioridade as Prioridade;
  const obs = (body.obs ?? "").trim();
  // V17 — prioridade obrigatória
  if (!PRIORIDADES.includes(prioridade)) {
    return NextResponse.json(
      { ok: false, reason: "prioridade obrigatória ∈ baixa/media/alta/urgente" },
      { status: 400 },
    );
  }
  if (!produto || !unidade || !Number.isFinite(qtd) || qtd <= 0) {
    return NextResponse.json(
      { ok: false, reason: "produto, qtd>0 e unidade obrigatórios" },
      { status: 400 },
    );
  }
  const setor =
    session.papel === "gestor" && body.setor
      ? body.setor
      : session.setor ?? "";
  if (!setor) {
    return NextResponse.json(
      { ok: false, reason: "setor obrigatório" },
      { status: 400 },
    );
  }

  const at = getAirtable();
  const s = await at.solicitacoes.create({
    setor,
    solicitante: session.nome,
    produto,
    qtd,
    unidade,
    prioridade,
    obs,
  });
  // V11 — log
  await at.logSolicitacoes.create({
    solicitacao_id: s.id,
    ator: session.nome,
    acao: "criar",
    payload: JSON.stringify({ produto, qtd, unidade, prioridade, obs, setor }),
  });
  return NextResponse.json({ ok: true, solicitacao: s });
}
