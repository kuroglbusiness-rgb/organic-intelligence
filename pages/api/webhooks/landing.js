import { supabase } from '../../../lib/supabase';

// Ce endpoint est appelé par Make/Zapier/n8n (ou directement par Calendly/Typeform si
// leur webhook natif le permet) quand quelqu'un convertit sur une ressource externe.
// Sécurisation simple : ?key=LANDING_WEBHOOK_SECRET dans l'URL du webhook configuré
// côté Make/Calendly.
//
// Body JSON attendu, à adapter à ce que ton outil externe envoie réellement :
// {
//   "full_name": "...", "email": "...", "phone": "...",
//   "sl_id": "g7k2m3a",              // vient du paramètre sl_id propagé par /api/s/[id]
//   "utm_campaign": "GUIDE"
// }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.query.key !== process.env.LANDING_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'clé invalide' });
  }

  const { full_name, email, phone, sl_id } = req.body || {};

  // 1. Créer le lead dans notre CRM
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({ full_name, email, phone, pipeline_stage: 'a_contacter' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 2. Retrouver la session Smart Link correspondante pour l'attribution
  if (sl_id) {
    const { data: session } = await supabase
      .from('organic_campaign_sessions')
      .select('id, content_id, ig_user_id')
      .eq('smart_link_id', sl_id)
      .single();

    if (session) {
      await supabase.from('lead_content_attribution').insert({
        lead_id: lead.id,
        content_id: session.content_id,
        session_id: session.id,
        confidence: 'DETERMINISTIC', // clic Smart Link + retour webhook immédiat = fiable
      });

      // Lie aussi l'identité IG à ce lead pour retrouver son historique DM plus tard
      await supabase
        .from('contact_identities')
        .update({ lead_id: lead.id })
        .eq('ig_user_id', session.ig_user_id);

      await supabase.from('acquisition_events').upsert(
        {
          provider: 'crm',
          event_type: 'lead_created',
          external_id: lead.id,
          smart_link_id: sl_id,
          raw_payload: req.body,
        },
        { onConflict: 'provider,event_type,external_id', ignoreDuplicates: true }
      );
    }
  }

  // La Phase 2 ajoutera ici l'envoi de l'event "Lead" à Meta via la CAPI Zernio.

  return res.status(200).json({ status: 'lead_cree', lead_id: lead.id });
}
