import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

export default function ContentPage() {
  const [content, setContent] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  function load() {
    fetch('/api/dashboard/content')
      .then((r) => r.json())
      .then((data) => setContent(data.content));
  }

  useEffect(load, []);

  async function sync() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch('/api/dashboard/content/sync', { method: 'POST' });
    const body = await res.json();
    setSyncResult(body);
    setSyncing(false);
    load();
  }

  return (
    <DashboardLayout title="Contenu">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Performance par Reel/post — clics Smart Link et leads attribués.
        </p>
        <button
          onClick={sync}
          disabled={syncing}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {syncing ? 'Sync…' : 'Sync depuis Zernio'}
        </button>
      </div>

      {syncResult && (
        <p className="mb-4 text-xs text-slate-500">
          {syncResult.synced} contenu(s) synchronisé(s).
          {syncResult.errors?.length > 0 && (
            <span className="text-amber-600"> Erreurs : {syncResult.errors.join(', ')}</span>
          )}
        </p>
      )}

      {!content ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : content.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun contenu synchronisé — clique sur "Sync depuis Zernio" pour importer tes Reels/posts.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.map((item) => (
            <div key={item.id} className="rounded-lg border bg-white p-4 shadow-sm">
              {item.media_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.media_url} alt="" className="mb-3 h-40 w-full rounded-md object-cover" />
              )}
              <p className="text-sm text-slate-700 line-clamp-2">{item.caption || item.permalink || 'Sans titre'}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{item.content_type}</span>
                <span>{item.clicks} clic(s) · {item.leads} lead(s)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
