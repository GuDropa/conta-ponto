import { NextResponse } from "next/server";
import { getAirtable, type Papel } from "@/lib/si/airtable";
import { getSession } from "@/lib/si/server-session";
import { can } from "@/lib/si/rbac";
import { hashSenha } from "@/lib/si/auth-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.papel, "usuarios.manage")) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const at = getAirtable();
  const rows = await at.usuarios.list();
  // Não expor senha_hash (V18)
  const safe = rows.map((r) => {
    const { senha_hash, ...rest } = r;
    void senha_hash;
    return rest;
  });
  return NextResponse.json({ ok: true, usuarios: safe });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !can(session.papel, "usuarios.manage")) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const body = (await req.json()) as {
    usuario?: string;
    senha?: string;
    papel?: Papel;
    setor?: string;
    ativo?: boolean;
  };
  const usuario = (body.usuario ?? "").trim();
  const senha = body.senha ?? "";
  const papel = body.papel;
  const setor = (body.setor ?? "").trim() || undefined;
  if (!usuario || senha.length < 6 || (papel !== "gestor" && papel !== "lider")) {
    return NextResponse.json(
      { ok: false, reason: "usuario, senha (>=6) e papel obrigatórios" },
      { status: 400 },
    );
  }
  if (papel === "lider" && !setor) {
    return NextResponse.json(
      { ok: false, reason: "líder precisa de setor" },
      { status: 400 },
    );
  }
  const at = getAirtable();
  const existing = await at.usuarios.findByLogin(usuario);
  if (existing) {
    return NextResponse.json(
      { ok: false, reason: "usuário já existe" },
      { status: 409 },
    );
  }
  const hash = await hashSenha(senha);
  const u = await at.usuarios.create({
    usuario,
    senha_hash: hash,
    papel,
    setor,
    ativo: body.ativo ?? true,
  });
  const { senha_hash, ...safe } = u;
  void senha_hash;
  return NextResponse.json({ ok: true, usuario: safe });
}
