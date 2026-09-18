import { createClient } from '@supabase/supabase-js';

// N'utiliser cette clé QUE côté serveur (API routes) — jamais côté front.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
