import { NextResponse } from "next/server";
import { getAirtable, type Papel } from "@/lib/si/airtable";
import { getSession } from "@/lib/si/server-session";
import { can } from "@/lib/si/rbac";
import { hashSenha } from "@/lib/si/auth-service";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !can(session.papel, "usuarios.manage")) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    senha?: string;
    papel?: Papel;
    setor?: string;
    ativo?: boolean;
  };
  const patch: Record<string, unknown> = {};
  if (body.papel === "gestor" || body.papel === "lider") patch.papel = body.papel;
  if (body.setor !== undefined) patch.setor = body.setor || undefined;
  if (body.ativo !== undefined) patch.ativo = body.ativo;
  if (body.senha) {
    if (body.senha.length < 6) {
      return NextResponse.json({ ok: false, reason: "senha curta" }, { status: 400 });
    }
    patch.senha_hash = await hashSenha(body.senha);
  }
  const at = getAirtable();
  const u = await at.usuarios.update(id, patch);
  const { senha_hash, ...safe } = u;
  void senha_hash;
  return NextResponse.json({ ok: true, usuario: safe });
}
