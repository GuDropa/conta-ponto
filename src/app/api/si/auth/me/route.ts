import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/si/session";
import { verifySession } from "@/lib/si/session-node";

export const runtime = "nodejs";

export async function GET() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  const session = verifySession(token);
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, session });
}
