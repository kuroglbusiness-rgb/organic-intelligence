-- Organic Intelligence — migration 002 : briques dashboard (scores, attribution, contenu)
-- À copier-coller dans Supabase > SQL Editor > New query > Run
-- Idempotent : peut être ré-exécutée sans risque.

-- Qualification binaire du lead (voir PRD §1.1) : ok = qualifié, ko = disqualifié
alter table leads add column if not exists status text default 'ok';

-- Flags heat score (appointment_booked, whatsapp_clicked) + tout ce qui ne justifie pas
-- une colonne dédiée
alter table leads add column if not exists metadata jsonb default '{}'::jsonb;

-- Vignette pour la page "Contenu" du dashboard
alter table social_content add column if not exists media_url text;

-- Lookup PROBABLE (contact_identities/sessions du même ig_user_id < 24h) et intent score
create index if not exists idx_campaign_sessions_ig_matched
  on organic_campaign_sessions (ig_user_id, matched_at);

create index if not exists idx_acquisition_events_ig_created
  on acquisition_events (ig_user_id, created_at);

-- Une ligne contact_identities par ig_user_id — nécessaire pour upsert sans dupliquer
-- à chaque commentaire/DM entrant.
create unique index if not exists idx_contact_identities_ig_user_id
  on contact_identities (ig_user_id)
  where ig_user_id is not null;
