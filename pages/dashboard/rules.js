import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

export default function RulesPage() {
  const [rules, setRules] = useState(null);
  const [resources, setResources] = useState(null);
  const [accounts, setAccounts] = useState(null);

  const [newResource, setNewResource] = useState({ label: '', resource_type: 'pdf', destination_url: '' });
  const [newRule, setNewRule] = useState({ social_account_id: '', keyword: '', resource_id: '' });

  function loadAll() {
    fetch('/api/dashboard/rules').then((r) => r.json()).then((d) => setRules(d.rules));
    fetch('/api/dashboard/resources').then((r) => r.json()).then((d) => setResources(d.resources));
    fetch('/api/dashboard/accounts').then((r) => r.json()).then((d) => setAccounts(d.accounts));
  }

  useEffect(loadAll, []);

  async function createResource(e) {
    e.preventDefault();
    await fetch('/api/dashboard/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newResource),
    });
    setNewResource({ label: '', resource_type: 'pdf', destination_url: '' });
    loadAll();
  }

  async function createRule(e) {
    e.preventDefault();
    await fetch('/api/dashboard/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    });
    setNewRule({ social_account_id: '', keyword: '', resource_id: '' });
    loadAll();
  }

  async function toggleActive(rule) {
    await fetch(`/api/dashboard/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !rule.active }),
    });
    loadAll();
  }

  async function deleteRule(id) {
    if (!confirm('Supprimer cette règle ?')) return;
    await fetch(`/api/dashboard/rules/${id}`, { method: 'DELETE' });
    loadAll();
  }

  return (
    <DashboardLayout title="Règles">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium text-slate-700">Ressources externes</h2>
          <form onSubmit={createResource} className="mb-4 space-y-2 rounded-lg border bg-white p-4 shadow-sm">
            <input
              placeholder="Label (ex: Guide gratuit PDF)"
              value={newResource.label}
              onChange={(e) => setNewResource({ ...newResource, label: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              required
            />
            <div className="flex gap-2">
              <select
                value={newResource.resource_type}
                onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              >
                <option value="pdf">PDF</option>
                <option value="notion">Notion</option>
                <option value="drive">Google Drive</option>
                <option value="url">URL</option>
              </select>
              <input
                placeholder="https://..."
                value={newResource.destination_url}
                onChange={(e) => setNewResource({ ...newResource, destination_url: e.target.value })}
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                required
              />
            </div>
            <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
              Ajouter la ressource
            </button>
          </form>

          <ul className="space-y-2">
            {(resources || []).map((r) => (
              <li key={r.id} className="rounded-lg border bg-white p-3 text-sm shadow-sm">
                <p className="font-medium text-slate-900">{r.label}</p>
                <p className="truncate text-xs text-slate-400">{r.destination_url}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-slate-700">Règles mot-clé → ressource</h2>
          <form onSubmit={createRule} className="mb-4 space-y-2 rounded-lg border bg-white p-4 shadow-sm">
            <select
              value={newRule.social_account_id}
              onChange={(e) => setNewRule({ ...newRule, social_account_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              required
            >
              <option value="">Compte Instagram…</option>
              {(accounts || []).map((a) => (
                <option key={a.id} value={a.id}>{a.username || a.external_account_id}</option>
              ))}
            </select>
            <input
              placeholder="Mot-clé (ex: GUIDE)"
              value={newRule.keyword}
              onChange={(e) => setNewRule({ ...newRule, keyword: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              required
            />
            <select
              value={newRule.resource_id}
              onChange={(e) => setNewRule({ ...newRule, resource_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              required
            >
              <option value="">Ressource à envoyer…</option>
              {(resources || []).map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
              Créer la règle
            </button>
          </form>

          <ul className="space-y-2">
            {(rules || []).map((rule) => (
              <li key={rule.id} className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm shadow-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    "{rule.keyword}" → {rule.organic_resources?.label}
                  </p>
                  <p className="text-xs text-slate-400">{rule.social_accounts?.username}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleActive(rule)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${rule.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {rule.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="text-xs text-red-500 hover:underline">
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
}
