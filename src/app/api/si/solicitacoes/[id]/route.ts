import { NextResponse } from "next/server";
import { getAirtable, type Prioridade } from "@/lib/si/airtable";
import { getSession } from "@/lib/si/server-session";
import { can } from "@/lib/si/rbac";
import { canEdit } from "@/lib/si/status";

export const runtime = "nodejs";

const PRIORIDADES: Prioridade[] = ["baixa", "media", "alta", "urgente"];

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await ctx.params;
  const at = getAirtable();
  const s = await at.solicitacoes.get(id);
  if (!s) return NextResponse.json({ ok: false }, { status: 404 });
  // V10 scoping
  if (session.papel === "funcionario") {
    if (s.setor !== session.setor || s.solicitante !== session.nome) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  } else if (session.papel === "lider") {
    if (s.setor !== session.setor) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }
  return NextResponse.json({ ok: true, solicitacao: s });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await ctx.params;
  const at = getAirtable();
  const current = await at.solicitacoes.get(id);
  if (!current) return NextResponse.json({ ok: false }, { status: 404 });

  // V10 — scoping de edição
  if (session.papel === "funcionario") {
    if (current.setor !== session.setor || current.solicitante !== session.nome) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    if (!can(session.papel, "solicitacoes.edit.own_pendente")) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  } else if (session.papel === "lider") {
    if (current.setor !== session.setor) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }
  // V15 — só pendente edita
  if (!canEdit(current.status)) {
    return NextResponse.json(
      { ok: false, reason: "edição bloqueada: status não-pendente" },
      { status: 409 },
    );
  }

  const body = (await req.json()) as {
    produto?: string;
    qtd?: number;
    unidade?: string;
    prioridade?: Prioridade;
    obs?: string;
  };
  const patch: Record<string, unknown> = {};
  if (body.produto !== undefined) patch.produto = String(body.produto).trim();
  if (body.unidade !== undefined) patch.unidade = String(body.unidade).trim();
  if (body.qtd !== undefined) {
    const q = Number(body.qtd);
    if (!Number.isFinite(q) || q <= 0) {
      return NextResponse.json(
        { ok: false, reason: "qtd>0" },
        { status: 400 },
      );
    }
    patch.qtd = q;
  }
  if (body.prioridade !== undefined) {
    if (!PRIORIDADES.includes(body.prioridade)) {
      return NextResponse.json(
        { ok: false, reason: "prioridade inválida" },
        { status: 400 },
      );
    }
    patch.prioridade = body.prioridade;
  }
  if (body.obs !== undefined) patch.obs = String(body.obs).trim();

  const updated = await at.solicitacoes.update(id, patch);
  await at.logSolicitacoes.create({
    solicitacao_id: id,
    ator: session.nome,
    acao: "editar",
    payload: JSON.stringify({ before: current, patch }),
  });
  return NextResponse.json({ ok: true, solicitacao: updated });
}
