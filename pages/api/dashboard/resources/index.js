import { supabase } from '../../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('organic_resources')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ resources: data });
  }

  if (req.method === 'POST') {
    const { label, resource_type, destination_url } = req.body || {};
    if (!label || !resource_type || !destination_url) {
      return res.status(400).json({ error: 'label, resource_type et destination_url sont requis' });
    }
    const { data, error } = await supabase
      .from('organic_resources')
      .insert({ label, resource_type, destination_url })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ resource: data });
  }

  return res.status(405).end();
}
