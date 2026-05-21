/**
 * Tipos compartilhados de sessão + funções edge-safe (WebCrypto).
 * Importável de qualquer runtime (edge ou node).
 *
 * Para sign/verify síncronos baseados em Node crypto, ver `./session-node`.
 *
 * Cites: V14, V18, V12.
 */

export type Papel = "funcionario" | "lider" | "gestor";

export interface SessionPayload {
  papel: Papel;
  nome: string;
  setor?: string;
  iat: number;
}

export const COOKIE_NAME = "si_sess";

function b64urlBytes(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromB64urlBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Edge-safe sign usando WebCrypto. Funciona em Node 18+ e Edge runtime.
 */
export async function signSessionWebCrypto(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const body = b64urlBytes(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${b64urlBytes(new Uint8Array(sig))}`;
}

/**
 * Edge-safe verify usando WebCrypto.
 */
export async function verifySessionWebCrypto(
  token: string | undefined | null,
  secret: string | undefined,
): Promise<SessionPayload | null> {
  if (!secret || secret.length < 16) return null;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expected = b64urlBytes(new Uint8Array(sig));
  if (mac !== expected) return null;
  try {
    const bytes = fromB64urlBytes(body);
    const text = new TextDecoder().decode(bytes);
    const payload = JSON.parse(text) as SessionPayload;
    if (!payload.papel || !payload.nome) return null;
    return payload;
  } catch {
    return null;
  }
}
