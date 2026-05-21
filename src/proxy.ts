/**
 * Proxy (Next 16) — bloqueia /solicita-insumos/* por papel.
 *
 * Cites: V10, V13, V14.
 */
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionWebCrypto } from "@/lib/si/session";
import { checkRoute } from "@/lib/si/rbac";

export const config = {
  matcher: ["/solicita-insumos/:path*"],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.SI_SESSION_SECRET;
  const session = await verifySessionWebCrypto(token, secret);
  const decision = checkRoute(pathname, session);
  if (decision.ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = decision.redirect;
  url.search = "";
  return NextResponse.redirect(url);
}
