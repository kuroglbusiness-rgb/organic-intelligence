import { supabase } from '../../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('organic_automation_rules')
      .select('*, organic_resources(label, resource_type, destination_url), social_accounts(username)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rules: data });
  }

  if (req.method === 'POST') {
    const { social_account_id, keyword, resource_id, active } = req.body || {};
    if (!social_account_id || !keyword || !resource_id) {
      return res.status(400).json({ error: 'social_account_id, keyword et resource_id sont requis' });
    }
    const { data, error } = await supabase
      .from('organic_automation_rules')
      .insert({ social_account_id, keyword: keyword.trim(), resource_id, active: active ?? true })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ rule: data });
  }

  return res.status(405).end();
}
