import { supabase } from '../../../lib/supabase';
import { verifyZernioSignature } from '../../../lib/hmac';
import { sendZernioDM } from '../../../lib/zernio';

// Next.js doit nous laisser le body brut pour vérifier la signature HMAC
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function genSmartLinkId() {
  return Math.random().toString(36).slice(2, 9); // ex: "g7k2m3a"
}

// Retrouve (ou crée un stub) l'UUID interne social_content correspondant à un id externe
// Zernio/Meta, pour pouvoir le stocker dans organic_campaign_sessions.content_id (FK UUID —
// jamais l'id externe brut). Le contenu complet (caption, permalink...) sera rempli par le
// prochain sync manuel depuis le dashboard.
async function resolveContentId(socialAccountId, externalContentId) {
  if (!externalContentId) return null;
  const { data: content } = await supabase
    .from('social_content')
    .upsert(
      { social_account_id: socialAccountId, external_content_id: externalContentId },
      { onConflict: 'social_account_id,external_content_id' }
    )
    .select('id')
    .single();
  return content?.id || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await readRawBody(req);
  const signature = req.headers['x-zernio-signature'];

  if (!verifyZernioSignature(rawBody, signature, process.env.ZERNIO_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'signature invalide' });
  }

  const payload = JSON.parse(rawBody);

  // On accuse réception tout de suite (Zernio réessaie si on est lent) — l'idempotence
  // ci-dessous protège contre le traitement en double des retries.
  const { error: dupError } = await supabase
    .from('processed_webhook_events')
    .insert({ event_id: payload.id });
  if (dupError) {
    // event_id déjà vu = retry Zernio, on ignore silencieusement
    return res.status(200).json({ status: 'already_processed' });
  }

  // On ne traite que les nouveaux messages/commentaires entrants pour la Phase 1
  if (payload.event !== 'message.received' && payload.event !== 'comment.received') {
    return res.status(200).json({ status: 'ignored_event' });
  }

  const text = (payload.message?.text || payload.comment?.text || '').trim();
  const zernioAccountId = payload.account?.id;
  const conversationId = payload.message?.conversation_id || payload.conversation?.id;
  const igUserId = payload.message?.sender?.id || payload.comment?.sender?.id;

  if (!text || !zernioAccountId || !igUserId) {
    return res.status(200).json({ status: 'payload_incomplet' });
  }

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id')
    .eq('external_account_id', zernioAccountId)
    .single();

  if (!account) return res.status(200).json({ status: 'compte_inconnu' });

  // Log l'engagement brut (comment ou DM) même hors mot-clé — c'est un signal d'intent
  // (PRD §8 : comment +1, dm_inbound +2), pas seulement les clics Smart Link. Fait avant
  // le early-return "aucun mot-clé" ci-dessous, sinon l'engagement non-keyword ne serait
  // jamais compté.
  const igUsername =
    payload.message?.sender?.username || payload.comment?.sender?.username || null; // à vérifier contre le payload réel Zernio
  const mediaId = payload.comment?.media_id || payload.comment?.post_id || null; // idem

  await supabase
    .from('contact_identities')
    .upsert({ ig_user_id: igUserId, ig_username: igUsername }, { onConflict: 'ig_user_id' });

  const engagementContentId = await resolveContentId(account.id, mediaId);

  await supabase.from('acquisition_events').upsert(
    {
      provider: 'zernio',
      event_type: payload.event === 'comment.received' ? 'comment' : 'dm_inbound',
      external_id: payload.id,
      ig_user_id: igUserId,
      utm_source: 'instagram',
      raw_payload: payload,
    },
    { onConflict: 'provider,event_type,external_id', ignoreDuplicates: true }
  );

  // Recherche d'une règle active dont le mot-clé apparaît dans le texte (insensible à la casse)
  const { data: rules } = await supabase
    .from('organic_automation_rules')
    .select('id, keyword, resource_id')
    .eq('social_account_id', account.id)
    .eq('active', true);

  const matchedRule = (rules || []).find((r) =>
    new RegExp(`\\b${r.keyword}\\b`, 'i').test(text)
  );

  if (!matchedRule) return res.status(200).json({ status: 'aucun_mot_cle' });

  const smartLinkId = genSmartLinkId();

  await supabase.from('organic_campaign_sessions').insert({
    rule_id: matchedRule.id,
    content_id: engagementContentId,
    ig_user_id: igUserId,
    smart_link_id: smartLinkId,
  });

  const trackedLink = `${process.env.BASE_URL}/api/s/${smartLinkId}`;

  if (conversationId) {
    await sendZernioDM(
      conversationId,
      zernioAccountId,
      `Voici ta ressource 🙌 ${trackedLink}`
    );
  }
  // Si le déclencheur est un commentaire sans conversation existante, Zernio doit
  // d'abord ouvrir la conversation (POST /v1/inbox/conversations) avant d'envoyer —
  // à ajouter ici une fois que tu testes le trigger "commentaire" en Phase 1.5.

  return res.status(200).json({ status: 'dm_envoye', smartLinkId });
}
