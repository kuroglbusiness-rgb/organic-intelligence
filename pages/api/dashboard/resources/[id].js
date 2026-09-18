import { supabase } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { label, resource_type, destination_url } = req.body || {};
    const patch = {};
    if (label !== undefined) patch.label = label;
    if (resource_type !== undefined) patch.resource_type = resource_type;
    if (destination_url !== undefined) patch.destination_url = destination_url;

    const { data, error } = await supabase
      .from('organic_resources')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ resource: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('organic_resources').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ status: 'ok' });
  }

  return res.status(405).end();
}
