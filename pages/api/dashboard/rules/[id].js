import { supabase } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { keyword, resource_id, active } = req.body || {};
    const patch = {};
    if (keyword !== undefined) patch.keyword = keyword.trim();
    if (resource_id !== undefined) patch.resource_id = resource_id;
    if (active !== undefined) patch.active = active;

    const { data, error } = await supabase
      .from('organic_automation_rules')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rule: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('organic_automation_rules').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ status: 'ok' });
  }

  return res.status(405).end();
}
