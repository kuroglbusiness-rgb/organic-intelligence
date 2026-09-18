import { supabase } from '../../../../lib/supabase';
import { fetchZernioContent } from '../../../../lib/zernio';

// Sync manuel (bouton dans le dashboard) — pas de cron. Best-effort, comme l'envoi de DM :
// le format exact de la réponse Zernio est deviné, à ajuster si besoin (voir lib/zernio.js).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { data: accounts, error } = await supabase.from('social_accounts').select('id, external_account_id');
  if (error) return res.status(500).json({ error: error.message });

  let totalSynced = 0;
  const errors = [];

  for (const account of accounts || []) {
    const { ok, items } = await fetchZernioContent(account.external_account_id);
    if (!ok) {
      errors.push(`compte ${account.external_account_id} : échec de récupération`);
      continue;
    }

    for (const item of items) {
      const { error: upsertError } = await supabase.from('social_content').upsert(
        {
          social_account_id: account.id,
          external_content_id: item.external_content_id,
          content_type: item.content_type,
          caption: item.caption,
          permalink: item.permalink,
          media_url: item.media_url,
          published_at: item.published_at,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'social_account_id,external_content_id' }
      );
      if (upsertError) errors.push(upsertError.message);
      else totalSynced += 1;
    }
  }

  return res.status(200).json({ status: 'ok', synced: totalSynced, errors });
}
