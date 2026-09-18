import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

const HEAT_LABELS = { 0: '❄️ Froid', 1: '🔥 OK', 2: '🔥🔥 RDV', 3: '🔥🔥🔥 RDV + WhatsApp' };

function KpiCard({ label, value }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard/overview')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <DashboardLayout title="Vue d’ensemble">
        <p className="text-sm text-slate-500">Chargement…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vue d’ensemble">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Leads totaux" value={data.totalLeads} />
        <KpiCard label="Clics Smart Link" value={data.totalClicks} />
        <KpiCard label="Taux de conversion clic → lead" value={`${data.conversionRate}%`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-slate-700">Répartition heat score</h2>
          <div className="space-y-2">
            {Object.entries(data.heatDistribution).map(([score, count]) => (
              <div key={score} className="flex items-center justify-between text-sm">
                <span>{HEAT_LABELS[score]}</span>
                <span className="font-medium text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-slate-700">Top contenu par leads générés</h2>
          {data.topContent.length === 0 ? (
            <p className="text-sm text-slate-400">
              Aucune attribution de contenu pour l’instant — lance un sync depuis la page Contenu.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topContent.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="truncate text-slate-700">
                    {item.content?.caption?.slice(0, 60) || item.content?.permalink || 'Contenu inconnu'}
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">{item.count} lead(s)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
