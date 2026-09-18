# Organic Intelligence — Phase 1

Ce dossier contient le squelette fonctionnel des 5 premières étapes du PRD :
connexion Zernio → sync contenu → Smart Links → 1 règle mot-clé → webhook
landing qui crée un lead dans notre CRM.

**Ce que ce code fait déjà :**
- reçoit les DM/commentaires Instagram via Zernio, détecte un mot-clé, répond
  automatiquement avec un lien tracké (Smart Link)
- logue chaque clic sur ce lien (UTM, fbclid) puis redirige vers ta ressource
  externe (PDF, Calendly, etc.)
- reçoit la confirmation de conversion (ex. RDV Calendly pris) et crée le lead
  dans la base, avec l'attribution vers le Reel/post d'origine

**Ce que je ne peux pas faire à ta place** (ça touche à ton identité / tes
comptes) : créer tes comptes Zernio, Supabase et Vercel, connecter ton vrai
compte Instagram, et configurer le DNS de kurotrd.com. Les étapes ci-dessous
te disent exactement quoi cliquer. Si tu ouvres ce dossier dans **Claude
Code**, je peux t'accompagner en direct sur chaque étape (déploiement inclus)
au lieu que tu suives ce README seul.

---

## 1. Créer les comptes (5-10 min, tout gratuit à ton échelle)

1. **Zernio** — [zernio.com](https://zernio.com) → Sign up → connecte ton
   compte Instagram Business Forexia (celui déjà lié à une Page Facebook).
   Les 2 premiers comptes connectés sont gratuits, sans CB. Une fois connecté,
   note son `accountId` (visible dans le dashboard) — c'est la valeur qui ira
   dans `social_accounts.external_account_id`.
2. **Supabase** — [supabase.com](https://supabase.com) → New project (plan
   Free). Une fois créé : SQL Editor → colle le contenu de `db/schema.sql` →
   Run. Puis Settings > API → copie `Project URL` et la clé `service_role`.
3. **Vercel** — [vercel.com](https://vercel.com) → connecte-le à ton futur
   repo GitHub de ce projet (ou utilise Claude Code pour déployer directement
   avec `vercel deploy`).

## 2. Configurer les variables d'environnement

Copie `.env.example` en `.env.local` et remplis chaque valeur récupérée à
l'étape 1 (clé API Zernio, secret webhook Zernio, URL + clé Supabase). Choisis
toi-même une longue chaîne aléatoire pour `LANDING_WEBHOOK_SECRET`.

## 3. Domaine des Smart Links

Pas besoin d'acheter un nouveau domaine : dans les DNS de **kurotrd.com**,
ajoute un enregistrement CNAME `track` → pointe vers Vercel (Vercel te donne
la valeur exacte quand tu ajoutes `track.kurotrd.com` comme domaine du
projet). `BASE_URL` dans `.env` devient `https://track.kurotrd.com`.

## 4. Créer ta première ressource + règle mot-clé

Dans Supabase > Table editor, insère une ligne (ou utilise SQL Editor) :

```sql
insert into organic_resources (label, resource_type, destination_url)
values ('Guide gratuit PDF', 'pdf', 'https://ton-lien-vers-le-pdf.com');

insert into social_accounts (external_account_id, username)
values ('ACCOUNT_ID_ZERNIO', 'forexia.ig'); -- l'accountId noté à l'étape 1

insert into organic_automation_rules (social_account_id, keyword, resource_id)
select sa.id, 'GUIDE', r.id
from social_accounts sa, organic_resources r
where sa.username = 'forexia.ig' and r.label = 'Guide gratuit PDF';
```

## 5. Configurer le webhook Zernio

Dans le dashboard Zernio > Webhooks > Create :
- URL : `https://track.kurotrd.com/api/webhooks/zernio`
- Events : `message.received` + `comment.received`
- Secret : la même valeur que `ZERNIO_WEBHOOK_SECRET` dans ton `.env`

## 6. Tester

Envoie-toi (depuis un autre compte) un DM contenant `GUIDE` à ton compte
Instagram connecté. Tu dois recevoir automatiquement le lien tracké en
retour. Clique dessus → tu dois atterrir sur ton PDF, et une ligne doit
apparaître dans `acquisition_events` (table Supabase).

## 7. Brancher la conversion (Calendly → lead CRM)

Crée un scénario Make (ou Zapier/n8n) : trigger "Calendly - Invitee Created"
→ action "HTTP POST" vers
`https://track.kurotrd.com/api/webhooks/landing?key=TON_LANDING_WEBHOOK_SECRET`
avec le nom, l'email, le téléphone du lead, et `sl_id` récupéré depuis les
UTMs/paramètres de la page où le RDV a été pris (Calendly doit recevoir et
faire suivre `sl_id` — configurable en champ caché sur le formulaire Calendly).

## Prochaines étapes (Phase 2, une fois que des leads remontent)

- Événements CAPI Meta (Lead / Schedule / Purchase) via Zernio
- Dashboard CRM simple pour voir tes leads et leur pipeline
- Backfill des anciens commentaires (jusqu'à 500) pour identifier tes
  engagés silencieux
- Heat score et segmentation chauds/tièdes/froids

## Limites connues à garder en tête (héritées du PRD original)

- Les navigateurs in-app Instagram peuvent tronquer `fbclid` — c'est pour ça
  que le redirect se fait côté serveur (302) plutôt qu'en JS
- Max 3 boutons par DM (limite Instagram Messaging)
- Le champ exact des payloads Zernio (`message.text`, `account.id`, etc.)
  vient de leur doc publique au moment de l'écriture de ce code — vérifie
  dans Zernio > Webhooks > Webhook logs après ton premier test, et ajuste
  `pages/api/webhooks/zernio.js` si un nom de champ a changé
