// Envoie un DM via l'API Zernio (POST /v1/inbox/conversations/{conversationId}/messages)
// Doc : https://docs.zernio.com/webhooks/inbox — vérifie le nom exact des champs
// dans ton dashboard Zernio, les APIs tierces évoluent.
export async function sendZernioDM(conversationId, accountId, message) {
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

// Récupère le catalogue de contenu (Reels/posts) d'un compte connecté.
// Endpoint deviné par analogie avec l'envoi de DM — à vérifier/ajuster contre la doc Zernio
// réelle ou les logs de requêtes sortantes si le format de réponse diffère.
// Retourne un tableau normalisé, jamais une exception (best-effort, comme sendZernioDM).
export async function fetchZernioContent(accountId) {
  const res = await fetch(`https://zernio.com/api/v1/accounts/${accountId}/content?limit=100`, {
    headers: { Authorization: `Bearer ${process.env.ZERNIO_API_KEY}` },
  });

  if (!res.ok) {
    console.error('Échec sync contenu Zernio', await res.text());
    return { ok: false, items: [] };
  }

  const body = await res.json();
  const rawItems = body.data || body.items || body.results || [];

  const items = rawItems.map((item) => ({
    external_content_id: String(item.id ?? item.media_id ?? ''),
    content_type: item.media_type?.toLowerCase() || item.type || 'post',
    caption: item.caption || item.text || null,
    permalink: item.permalink || item.url || null,
    media_url: item.media_url || item.thumbnail_url || null,
    published_at: item.timestamp || item.published_at || null,
  })).filter((item) => item.external_content_id);

  return { ok: true, items };
}
