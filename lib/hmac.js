import crypto from 'crypto';

// Vérifie qu'un webhook vient bien de Zernio (et pas d'un tiers qui devine ton URL).
// Zernio envoie une signature dans un header (le nom exact est indiqué dans leur
// dashboard > Webhooks > Signing — adapte HEADER_NAME si besoin).
export function verifyZernioSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader)
    );
  } catch {
    return false; // longueurs différentes = signature invalide
  }
}
