import { supabase } from './supabase';

// Heat score CRM (0-3) — qualification commerciale. Voir PRD §8.
export function computeHeatScore({ status, pipelineStage, metadata }) {
  if (status === 'ko') return 0;
  if (metadata?.whatsapp_clicked) return 3;
  if (
    ['rdv_pris', 'rdv_effectue', 'paye'].includes(pipelineStage) ||
    metadata?.appointment_booked
  ) {
    return 2;
  }
  return 1; // status === 'ok', pas encore de RDV
}

// Intent score organique (0-10) — engagement pré-conversion, formule à decay temporel (PRD §8).
// event_type déjà en prod pour les clics Smart Link = 'click' (pas 'smart_link_click' comme le
// nomme le PRD) : on garde la valeur telle qu'écrite en base et on aliase ici plutôt que de
// renommer un chemin qui tourne déjà en production.
const INTENT_WEIGHTS = {
  click: 3, // = smart_link_click du PRD
  dm_inbound: 2,
  comment: 1,
};
const DECAY_LAMBDA = 0.05;

function decayedScore(events, now = Date.now()) {
  const total = events.reduce((sum, ev) => {
    const weight = INTENT_WEIGHTS[ev.event_type];
    if (!weight) return sum;
    const ageDays = (now - new Date(ev.created_at).getTime()) / 86400000;
    return sum + weight * Math.exp(-DECAY_LAMBDA * ageDays);
  }, 0);
  return Math.min(10, Math.round(total * 100) / 100);
}

// Calcule l'intent score pour une liste d'ig_user_id en un seul aller-retour DB (pas de N+1).
// Retourne une Map ig_user_id -> score.
export async function computeIntentScores(igUserIds) {
  const ids = [...new Set(igUserIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data: events } = await supabase
    .from('acquisition_events')
    .select('ig_user_id, event_type, created_at')
    .in('ig_user_id', ids);

  const grouped = new Map();
  for (const ev of events || []) {
    if (!grouped.has(ev.ig_user_id)) grouped.set(ev.ig_user_id, []);
    grouped.get(ev.ig_user_id).push(ev);
  }

  const now = Date.now();
  const scores = new Map();
  for (const id of ids) {
    scores.set(id, decayedScore(grouped.get(id) || [], now));
  }
  return scores;
}
