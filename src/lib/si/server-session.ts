/**
 * Server-side helper para extrair sessão do cookie em route handlers e RSC.
 */
import { cookies } from "next/headers";
import { COOKIE_NAME, type SessionPayload } from "./session";
import { verifySession } from "./session-node";

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Response("unauthorized", { status: 401 });
  return s;
}
