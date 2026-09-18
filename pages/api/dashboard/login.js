import { createSessionToken, buildSessionCookie } from '../../../lib/dashboardAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body || {};
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected || password !== expected) {
    return res.status(401).json({ error: 'mot de passe incorrect' });
  }

  const token = await createSessionToken(expected);
  res.setHeader('Set-Cookie', buildSessionCookie(token));
  return res.status(200).json({ status: 'ok' });
}
