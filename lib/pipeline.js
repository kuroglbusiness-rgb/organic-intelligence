// Vocabulaire canonique de leads.pipeline_stage — ne pas en inventer d'autres ailleurs
// (le calcul du heat_score dans lib/scores.js dépend de ces valeurs exactes).
export const PIPELINE_STAGES = ['a_contacter', 'rdv_pris', 'rdv_effectue', 'paye', 'perdu'];

export const PIPELINE_LABELS = {
  a_contacter: 'À contacter',
  rdv_pris: 'RDV pris',
  rdv_effectue: 'RDV effectué',
  paye: 'Payé',
  perdu: 'Perdu',
};

export function isValidPipelineStage(stage) {
  return PIPELINE_STAGES.includes(stage);
}
