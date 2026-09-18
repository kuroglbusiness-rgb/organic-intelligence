import { supabase } from '../../../../lib/supabase';
import { computeIntentScores } from '../../../../lib/scores';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  if (!leads?.length) return res.status(200).json({ leads: [] });

  const leadIds = leads.map((l) => l.id);

  const [{ data: attributions }, { data: identities }] = await Promise.all([
    supabase
      .from('lead_content_attribution')
      .select('lead_id, confidence, created_at, content_id, social_content(caption, permalink, content_type)')
      .in('lead_id', leadIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_identities')
      .select('lead_id, ig_user_id, ig_username')
      .in('lead_id', leadIds),
  ]);

  const attributionByLead = new Map();
  for (const attr of attributions || []) {
    if (!attributionByLead.has(attr.lead_id)) attributionByLead.set(attr.lead_id, attr);
  }

  const identityByLead = new Map();
  for (const identity of identities || []) {
    identityByLead.set(identity.lead_id, identity);
  }

  const intentScores = await computeIntentScores(
    (identities || []).map((i) => i.ig_user_id)
  );

  const result = leads.map((lead) => {
    const attribution = attributionByLead.get(lead.id) || null;
    const identity = identityByLead.get(lead.id) || null;
    return {
      ...lead,
      ig_user_id: identity?.ig_user_id || null,
      ig_username_resolved: identity?.ig_username || lead.ig_username || null,
      confidence: attribution?.confidence || null,
      content: attribution?.social_content || null,
      intent_score: identity ? intentScores.get(identity.ig_user_id) ?? 0 : 0,
    };
  });

  return res.status(200).json({ leads: result });
}
