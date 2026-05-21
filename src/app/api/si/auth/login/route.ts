import { NextResponse } from "next/server";
import { getAirtable } from "@/lib/si/airtable";
import { login, type LoginInput } from "@/lib/si/auth-service";
import { COOKIE_NAME } from "@/lib/si/session";
import { signSession } from "@/lib/si/session-node";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "json inválido" }, { status: 400 });
  }
  const input = body as LoginInput;
  if (!input || (input.kind !== "funcionario" && input.kind !== "credenciais")) {
    return NextResponse.json(
      { ok: false, reason: "kind inválido" },
      { status: 400 },
    );
  }

  const at = getAirtable();
  const result = await login(input, {
    findByLogin: at.usuarios.findByLogin,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  const token = signSession(result.session);
  const res = NextResponse.json({ ok: true, session: result.session });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}
