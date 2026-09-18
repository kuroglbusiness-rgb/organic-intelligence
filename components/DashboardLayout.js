import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV = [
  { href: '/dashboard', label: 'Vue d’ensemble' },
  { href: '/dashboard/leads', label: 'Leads' },
  { href: '/dashboard/content', label: 'Contenu' },
  { href: '/dashboard/rules', label: 'Règles' },
];

export default function DashboardLayout({ children, title }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/dashboard/logout', { method: 'POST' });
    router.push('/dashboard/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-slate-900">Organic Intelligence</span>
            <nav className="flex gap-4 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    router.pathname === item.href
                      ? 'font-medium text-slate-900'
                      : 'text-slate-500 hover:text-slate-900'
                  }
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-900">
            Se déconnecter
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {title && <h1 className="mb-6 text-xl font-semibold text-slate-900">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
