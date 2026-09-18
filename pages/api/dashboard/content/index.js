import { supabase } from '../../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { data: content, error } = await supabase
    .from('social_content')
    .select('*')
    .order('published_at', { ascending: false, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  if (!content?.length) return res.status(200).json({ content: [] });

  const contentIds = content.map((c) => c.id);

  const [{ data: sessions }, { data: attributions }] = await Promise.all([
    supabase
      .from('organic_campaign_sessions')
      .select('smart_link_id, content_id')
      .in('content_id', contentIds),
    supabase.from('lead_content_attribution').select('content_id').in('content_id', contentIds),
  ]);

  const smartLinkToContent = new Map((sessions || []).map((s) => [s.smart_link_id, s.content_id]));
  const smartLinkIds = [...smartLinkToContent.keys()];

  const clicksByContent = new Map();
  if (smartLinkIds.length) {
    const { data: clicks } = await supabase
      .from('acquisition_events')
      .select('smart_link_id')
      .eq('event_type', 'click')
      .in('smart_link_id', smartLinkIds);
    for (const c of clicks || []) {
      const contentId = smartLinkToContent.get(c.smart_link_id);
      clicksByContent.set(contentId, (clicksByContent.get(contentId) || 0) + 1);
    }
  }

  const leadsByContent = new Map();
  for (const a of attributions || []) {
    leadsByContent.set(a.content_id, (leadsByContent.get(a.content_id) || 0) + 1);
  }

  const result = content.map((c) => ({
    ...c,
    clicks: clicksByContent.get(c.id) || 0,
    leads: leadsByContent.get(c.id) || 0,
  }));

  return res.status(200).json({ content: result });
}
