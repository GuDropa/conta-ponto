import { NextResponse } from "next/server";
import { getAirtable, type Status } from "@/lib/si/airtable";
import { getSession } from "@/lib/si/server-session";
import { canTransition } from "@/lib/si/status";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: Status; motivo?: string };
  const to = body.status as Status;
  const motivo = (body.motivo ?? "").trim();

  const at = getAirtable();
  const current = await at.solicitacoes.get(id);
  if (!current) return NextResponse.json({ ok: false }, { status: 404 });

  // V10 — scoping de cancelamento
  if (to === "cancelada") {
    if (session.papel === "funcionario") {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    if (session.papel === "lider" && current.setor !== session.setor) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  const verdict = canTransition(current.status, to, {
    papel: session.papel,
    motivo,
  });
  if (!verdict.ok) {
    return NextResponse.json(
      { ok: false, reason: verdict.reason },
      { status: 400 },
    );
  }

  const updated = await at.solicitacoes.update(id, { status: to });

  // V11 — logs
  if (to === "cancelada") {
    await at.logSolicitacoes.create({
      solicitacao_id: id,
      ator: session.nome,
      acao: "cancelar",
      payload: JSON.stringify({ from: current.status, motivo }),
    });
  } else {
    await at.logAprovacoes.create({
      solicitacao_id: id,
      ator: session.nome,
      decisao: to as "aprovada" | "recusada" | "atendida",
      motivo: to === "recusada" ? motivo : undefined,
    });
  }

  return NextResponse.json({ ok: true, solicitacao: updated });
}
