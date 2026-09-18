import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { data, error } = await supabase
    .from('social_accounts')
    .select('id, username, external_account_id, zernio_status')
    .order('connected_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ accounts: data });
}
