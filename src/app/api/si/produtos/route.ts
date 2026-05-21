import { NextResponse } from "next/server";
import { getAirtable } from "@/lib/si/airtable";
import { getSession } from "@/lib/si/server-session";
import { can, scopeProdutos } from "@/lib/si/rbac";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const at = getAirtable();
  const url = new URL(req.url);
  const setorQ = url.searchParams.get("setor") ?? undefined;
  let rows;
  if (session.papel === "gestor" && can(session.papel, "produtos.list.all")) {
    rows = setorQ ? await at.produtos.listBySetor(setorQ) : await at.produtos.listAll();
  } else {
    rows = await at.produtos.listBySetor(session.setor ?? "__none__");
    rows = scopeProdutos(rows, session);
  }
  return NextResponse.json({ ok: true, produtos: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!can(session.papel, "produtos.create")) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }
  const body = (await req.json()) as {
    nome?: string;
    setor?: string;
    unidade_default?: string;
  };
  const nome = (body.nome ?? "").trim();
  const unidade_default = (body.unidade_default ?? "").trim();
  let setor = (body.setor ?? "").trim();
  if (session.papel !== "gestor") setor = session.setor ?? "";
  if (!nome || !setor || !unidade_default) {
    return NextResponse.json(
      { ok: false, reason: "nome, setor e unidade_default obrigatórios" },
      { status: 400 },
    );
  }
  const at = getAirtable();
  const p = await at.produtos.create({
    nome,
    setor,
    unidade_default,
    criado_por: session.nome,
  });
  return NextResponse.json({ ok: true, produto: p });
}
