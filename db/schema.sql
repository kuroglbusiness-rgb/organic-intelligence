-- Organic Intelligence — schéma Phase 1
-- À copier-coller dans Supabase > SQL Editor > New query > Run

create extension if not exists "uuid-ossp";

-- 1. Le(s) compte(s) Instagram connecté(s) via Zernio
create table social_accounts (
  id uuid primary key default uuid_generate_v4(),
  provider text not null default 'instagram',
  external_account_id text not null,       -- id du compte IG côté Zernio/Meta
  username text,
  zernio_status text default 'active',     -- active / revoked / error
  connected_at timestamptz default now(),
  unique(provider, external_account_id)
);

-- 2. Contenu Instagram synchronisé (Reels, posts) — sert à savoir quel contenu a généré quel lead
create table social_content (
  id uuid primary key default uuid_generate_v4(),
  social_account_id uuid references social_accounts(id),
  external_content_id text not null,       -- id du Reel/post côté Meta
  content_type text,                       -- reel / post / story
  caption text,
  permalink text,
  published_at timestamptz,
  synced_at timestamptz default now(),
  unique(social_account_id, external_content_id)
);

-- 3. Identité d'un contact/follower — permet de relier IG, email, téléphone à la même personne
create table contact_identities (
  id uuid primary key default uuid_generate_v4(),
  ig_user_id text,
  ig_username text,
  email text,
  phone text,
  lead_id uuid,                            -- rempli une fois qu'un lead CRM existe (voir table leads)
  created_at timestamptz default now()
);
create index on contact_identities (ig_user_id);
create index on contact_identities (email);

-- 4. Règles d'automatisation : mot-clé → ressource envoyée en DM
create table organic_automation_rules (
  id uuid primary key default uuid_generate_v4(),
  social_account_id uuid references social_accounts(id),
  keyword text not null,                   -- ex: GUIDE, MÉTHODE, PLAN
  resource_id uuid,                        -- voir organic_resources
  active boolean default true,
  created_at timestamptz default now()
);

-- 5. Ressources externes distribuées en DM (jamais de formulaire interne en V1)
create table organic_resources (
  id uuid primary key default uuid_generate_v4(),
  label text not null,                     -- ex: "Guide gratuit PDF"
  resource_type text not null,             -- pdf / notion / drive / url
  destination_url text not null,           -- l'URL externe finale
  created_at timestamptz default now()
);

alter table organic_automation_rules
  add constraint fk_resource foreign key (resource_id) references organic_resources(id);

-- 6. Sessions déclenchées : un follower a matché un mot-clé, un DM avec Smart Link a été envoyé
create table organic_campaign_sessions (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid references organic_automation_rules(id),
  content_id uuid references social_content(id),
  ig_user_id text not null,
  smart_link_id text not null,             -- l'id court utilisé dans l'URL trackée (/api/s/{id})
  matched_at timestamptz default now()
);
create index on organic_campaign_sessions (smart_link_id);

-- 7. Chaque clic sur un Smart Link (avant même de savoir si ça convertit)
create table acquisition_events (
  id uuid primary key default uuid_generate_v4(),
  provider text not null default 'smart_link',
  event_type text not null,                -- click / page_view / lead_created
  external_id text,                        -- pour dédupliquer les retries webhook
  smart_link_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  fbclid text,
  ig_user_id text,
  raw_payload jsonb,
  created_at timestamptz default now(),
  unique(provider, event_type, external_id)
);
create index on acquisition_events (smart_link_id);

-- 8. Les leads dans notre CRM (créés dès qu'une landing externe confirme une conversion)
create table leads (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  email text,
  phone text,
  ig_username text,
  pipeline_stage text default 'a_contacter', -- a_contacter → rdv_pris → paye ...
  heat_score int default 0,                  -- 0 froid → 3 chaud+whatsapp
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. Attribution : quel contenu / quelle session a produit ce lead, avec quel niveau de confiance
create table lead_content_attribution (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id),
  content_id uuid references social_content(id),
  session_id uuid references organic_campaign_sessions(id),
  confidence text default 'PROBABLE',        -- DETERMINISTIC / PROBABLE / INFLUENCED / UNKNOWN
  created_at timestamptz default now()
);

-- 10. Déduplication des webhooks Zernio (retries) — voir "Limites Zernio" du PRD original
create table processed_webhook_events (
  event_id text primary key,               -- l'id d'event stable envoyé par Zernio (payload.id)
  received_at timestamptz default now()
);
