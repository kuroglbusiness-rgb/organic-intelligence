import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/DashboardLayout';
import { PIPELINE_STAGES, PIPELINE_LABELS } from '../../lib/pipeline';

const HEAT_ICONS = { 0: '❄️', 1: '🔥', 2: '🔥🔥', 3: '🔥🔥🔥' };
const CONFIDENCE_STYLES = {
  DETERMINISTIC: 'bg-green-100 text-green-800',
  PROBABLE: 'bg-amber-100 text-amber-800',
  INFLUENCED: 'bg-slate-100 text-slate-600',
  UNKNOWN: 'bg-slate-100 text-slate-400',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState(null);

  function load() {
    fetch('/api/dashboard/leads')
      .then((r) => r.json())
      .then((data) => setLeads(data.leads));
  }

  useEffect(load, []);

  async function updateStage(id, pipeline_stage) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, pipeline_stage } : l)));
    await fetch(`/api/dashboard/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage }),
    });
    load();
  }

  return (
    <DashboardLayout title="Leads">
      {!leads ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun lead pour l’instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Contenu source</th>
                <th className="px-4 py-3">Confiance</th>
                <th className="px-4 py-3">Heat</th>
                <th className="px-4 py-3">Intent</th>
                <th className="px-4 py-3">Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/leads/${lead.id}`} className="font-medium text-slate-900 hover:underline">
                      {lead.full_name || lead.email || lead.ig_username_resolved || 'Lead sans nom'}
                    </Link>
                    <p className="text-xs text-slate-400">{lead.email}</p>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">
                    {lead.content?.caption?.slice(0, 50) || lead.content?.permalink || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {lead.confidence ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[lead.confidence] || ''}`}
                      >
                        {lead.confidence}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">UNKNOWN</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{HEAT_ICONS[lead.heat_score ?? 0]}</td>
                  <td className="px-4 py-3 text-slate-700">{lead.intent_score?.toFixed(1) ?? '0.0'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.pipeline_stage}
                      onChange={(e) => updateStage(lead.id, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    >
                      {PIPELINE_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {PIPELINE_LABELS[stage]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
