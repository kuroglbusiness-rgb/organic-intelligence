import { supabase } from '../../../lib/supabase';

// GET /api/s/{smart_link_id}
// C'est le lien envoyé en DM. On logue le clic AVANT de rediriger (302, côté serveur,
// donc ça fonctionne même dans le navigateur in-app d'Instagram) puis on renvoie vers
// la vraie ressource externe en propageant les UTM + fbclid.
export default async function handler(req, res) {
  const { id } = req.query;

  const { data: session } = await supabase
    .from('organic_campaign_sessions')
    .select('id, rule_id, content_id, ig_user_id, organic_automation_rules(resource_id, keyword)')
    .eq('smart_link_id', id)
    .single();

  if (!session) {
    // Lien inconnu ou expiré : on ne bloque jamais l'utilisateur, on renvoie vers ta bio.
    res.writeHead(302, { Location: process.env.BASE_URL });
    return res.end();
  }

  const { data: resource } = await supabase
    .from('organic_resources')
    .select('destination_url')
    .eq('id', session.organic_automation_rules.resource_id)
    .single();

  const fbclid = req.query.fbclid || null;

  // On log le clic. external_id = smart_link_id + timestamp seconde, pour absorber
  // les doubles requêtes que génèrent parfois les previews de liens in-app.
  const externalId = `${id}-${Math.floor(Date.now() / 1000)}`;
  await supabase.from('acquisition_events').upsert(
    {
      provider: 'smart_link',
      event_type: 'click',
      external_id: externalId,
      smart_link_id: id,
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: session.organic_automation_rules.keyword,
      fbclid,
      ig_user_id: session.ig_user_id,
      raw_payload: { query: req.query },
    },
    { onConflict: 'provider,event_type,external_id', ignoreDuplicates: true }
  );

  const target = new URL(resource.destination_url);
  target.searchParams.set('utm_source', 'instagram');
  target.searchParams.set('utm_medium', 'social');
  target.searchParams.set('utm_campaign', session.organic_automation_rules.keyword);
  target.searchParams.set('sl_id', id); // pour retrouver la session côté webhook landing
  if (fbclid) target.searchParams.set('fbclid', fbclid);

  res.writeHead(302, { Location: target.toString() });
  res.end();
}
