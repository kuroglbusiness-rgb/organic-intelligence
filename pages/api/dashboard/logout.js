import { buildLogoutCookie } from '../../../lib/dashboardAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Set-Cookie', buildLogoutCookie());
  return res.status(200).json({ status: 'ok' });
}
