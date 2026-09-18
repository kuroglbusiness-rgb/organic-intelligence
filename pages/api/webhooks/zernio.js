import { supabase } from '../../../lib/supabase';
import { verifyZernioSignature } from '../../../lib/hmac';

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

// Envoie un DM via l'API Zernio (POST /v1/inbox/conversations/{conversationId}/messages)
// Doc : https://docs.zernio.com/webhooks/inbox — vérifie le nom exact des champs
// dans ton dashboard Zernio, les APIs tierces évoluent.
async function sendZernioDM(conversationId, accountId, message) {
  const res = await fetch(
    `https://zernio.com/api/v1/inbox/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZERNIO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId, message }),
    }
  );
  if (!res.ok) {
    console.error('Échec envoi DM Zernio', await res.text());
  }
  return res.ok;
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
