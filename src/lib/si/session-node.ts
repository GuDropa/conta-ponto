/**
 * Sign/verify síncronos usando Node crypto. Apenas para route handlers (runtime nodejs).
 * Não importar de edge runtime.
 */
import crypto from "node:crypto";
import type { SessionPayload } from "./session";

const ALG = "sha256";

function getSecret(): string {
  const s = process.env.SI_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SI_SESSION_SECRET ausente ou curto demais (>=16 chars)");
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signSession(
  payload: SessionPayload,
  secret = getSecret(),
): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const mac = b64url(crypto.createHmac(ALG, secret).update(body).digest());
  return `${body}.${mac}`;
}

export function verifySession(
  token: string | undefined | null,
  secret = getSecret(),
): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  const expected = b64url(crypto.createHmac(ALG, secret).update(body).digest());
  if (
    mac.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (!payload.papel || !payload.nome) return null;
    return payload;
  } catch {
    return null;
  }
}
