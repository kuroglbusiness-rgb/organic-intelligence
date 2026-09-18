import { supabase } from '../../../../lib/supabase';
import { computeHeatScore } from '../../../../lib/scores';
import { isValidPipelineStage } from '../../../../lib/pipeline';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', id).single();
    if (error || !lead) return res.status(404).json({ error: 'lead introuvable' });

    const { data: attribution } = await supabase
      .from('lead_content_attribution')
      .select('confidence, created_at, content_id, social_content(caption, permalink, content_type, media_url)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: identity } = await supabase
      .from('contact_identities')
      .select('ig_user_id, ig_username')
      .eq('lead_id', id)
      .maybeSingle();

    let timeline = [];
    if (identity?.ig_user_id) {
      const { data: events } = await supabase
        .from('acquisition_events')
        .select('event_type, provider, created_at, smart_link_id')
        .eq('ig_user_id', identity.ig_user_id)
        .order('created_at', { ascending: false })
        .limit(50);
      timeline = events || [];
    }

    return res.status(200).json({ lead, attribution: attribution || null, identity: identity || null, timeline });
  }

  if (req.method === 'PATCH') {
    const { pipeline_stage, status, metadata } = req.body || {};

    if (pipeline_stage !== undefined && !isValidPipelineStage(pipeline_stage)) {
      return res.status(400).json({ error: `pipeline_stage invalide : ${pipeline_stage}` });
    }
    if (status !== undefined && !['ok', 'ko'].includes(status)) {
      return res.status(400).json({ error: `status invalide : ${status}` });
    }

    const { data: current, error: fetchError } = await supabase
      .from('leads')
      .select('pipeline_stage, status, metadata')
      .eq('id', id)
      .single();
    if (fetchError || !current) return res.status(404).json({ error: 'lead introuvable' });

    const nextPipelineStage = pipeline_stage ?? current.pipeline_stage;
    const nextStatus = status ?? current.status ?? 'ok';
    const nextMetadata = metadata ? { ...current.metadata, ...metadata } : current.metadata || {};

    const heat_score = computeHeatScore({
      status: nextStatus,
      pipelineStage: nextPipelineStage,
      metadata: nextMetadata,
    });

    const { data: updated, error } = await supabase
      .from('leads')
      .update({
        pipeline_stage: nextPipelineStage,
        status: nextStatus,
        metadata: nextMetadata,
        heat_score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ lead: updated });
  }

  return res.status(405).end();
}
