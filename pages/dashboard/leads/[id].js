import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/DashboardLayout';

const EVENT_LABELS = {
  comment: '💬 Commentaire',
  dm_inbound: '📩 DM entrant',
  click: '🔗 Clic Smart Link',
  lead_created: '✅ Lead créé',
};

export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/dashboard/leads/${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  async function toggleWhatsapp() {
    const nextValue = !data.lead.metadata?.whatsapp_clicked;
    await fetch(`/api/dashboard/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { whatsapp_clicked: nextValue } }),
    });
    fetch(`/api/dashboard/leads/${id}`)
      .then((r) => r.json())
      .then(setData);
  }

  if (!data) {
    return (
      <DashboardLayout title="Lead">
        <p className="text-sm text-slate-500">Chargement…</p>
      </DashboardLayout>
    );
  }

  const { lead, attribution, identity, timeline } = data;

  return (
    <DashboardLayout title={lead.full_name || lead.email || 'Lead'}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm text-sm">
            <h2 className="mb-3 font-medium text-slate-700">Identité</h2>
            <dl className="space-y-1">
              <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{lead.email || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Téléphone</dt><dd>{lead.phone || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Instagram</dt><dd>{identity?.ig_username || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Créé le</dt><dd>{new Date(lead.created_at).toLocaleDateString('fr-FR')}</dd></div>
            </dl>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm text-sm">
            <h2 className="mb-3 font-medium text-slate-700">Attribution</h2>
            {attribution ? (
              <>
                <p className="text-slate-700">
                  {attribution.social_content?.caption?.slice(0, 80) || attribution.social_content?.permalink || 'Contenu source inconnu'}
                </p>
                <p className="mt-1 text-xs text-slate-400">Confiance : {attribution.confidence}</p>
              </>
            ) : (
              <p className="text-slate-400">Aucune attribution — lead sans source tracée.</p>
            )}
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm text-sm">
            <h2 className="mb-3 font-medium text-slate-700">Signaux heat score</h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!lead.metadata?.whatsapp_clicked}
                onChange={toggleWhatsapp}
              />
              Contact WhatsApp effectué
            </label>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-medium text-slate-700">Timeline d’engagement</h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun événement lié à ce lead pour l’instant.</p>
            ) : (
              <ul className="space-y-2">
                {timeline.map((event, i) => (
                  <li key={i} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                    <span>{EVENT_LABELS[event.event_type] || event.event_type}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(event.created_at).toLocaleString('fr-FR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
