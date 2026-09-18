import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const [{ count: totalLeads }, { count: totalClicks }, { data: leads }, { data: attributions }] =
    await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase
        .from('acquisition_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'click'),
      supabase.from('leads').select('heat_score'),
      supabase
        .from('lead_content_attribution')
        .select('content_id, social_content(caption, permalink)'),
    ]);

  const heatDistribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const lead of leads || []) {
    heatDistribution[lead.heat_score ?? 0] = (heatDistribution[lead.heat_score ?? 0] || 0) + 1;
  }

  const contentCounts = new Map();
  for (const attr of attributions || []) {
    if (!attr.content_id) continue;
    const key = attr.content_id;
    const existing = contentCounts.get(key) || { count: 0, content: attr.social_content };
    existing.count += 1;
    contentCounts.set(key, existing);
  }
  const topContent = [...contentCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const conversionRate = totalClicks ? Math.round(((totalLeads || 0) / totalClicks) * 1000) / 10 : 0;

  return res.status(200).json({
    totalLeads: totalLeads || 0,
    totalClicks: totalClicks || 0,
    conversionRate,
    heatDistribution,
    topContent,
  });
}
