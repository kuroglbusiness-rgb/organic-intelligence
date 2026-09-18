// Web Crypto (crypto.subtle) plutôt que le module Node `crypto` : ce fichier est importé à la
// fois par les API routes (runtime Node) ET par middleware.js (Edge runtime, qui n'a pas le
// module `crypto` de Node) — Web Crypto est le seul dénominateur commun aux deux.

const COOKIE_NAME = 'oi_dashboard_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

async function hmacHex(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Token = "<expiresAt>.<hmac(expiresAt)>" — signé avec DASHBOARD_PASSWORD comme secret,
// donc invalidé automatiquement si le mot de passe est changé.
export async function createSessionToken(secret) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const signature = await hmacHex(String(expiresAt), secret);
  return `${expiresAt}.${signature}`;
}

export async function isValidSessionToken(token, secret) {
  if (!token) return false;
  const [expiresAtStr, signature] = token.split('.');
  if (!expiresAtStr || !signature) return false;

  const expected = await hmacHex(expiresAtStr, secret);
  if (!timingSafeEqualHex(expected, signature)) return false;

  return Number(expiresAtStr) > Date.now();
}

export const DASHBOARD_COOKIE_NAME = COOKIE_NAME;

export function buildSessionCookie(token) {
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function buildLogoutCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
