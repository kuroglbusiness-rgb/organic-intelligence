import { NextResponse } from 'next/server';
import { DASHBOARD_COOKIE_NAME, isValidSessionToken } from './lib/dashboardAuth';

// IMPORTANT : le matcher ci-dessous ne doit JAMAIS être élargi au-delà de /dashboard et
// /api/dashboard — /api/webhooks/*, /api/s/* sont des endpoints publics (Zernio, followers
// qui cliquent un Smart Link) qui doivent rester accessibles sans cookie.
export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Le login lui-même ne doit pas être protégé, sinon on ne peut jamais se connecter.
  if (pathname === '/dashboard/login' || pathname === '/api/dashboard/login') {
    return NextResponse.next();
  }

  const token = req.cookies.get(DASHBOARD_COOKIE_NAME)?.value;
  const valid = await isValidSessionToken(token, process.env.DASHBOARD_PASSWORD || '');

  if (valid) return NextResponse.next();

  if (pathname.startsWith('/api/dashboard/')) {
    return NextResponse.json({ error: 'non authentifié' }, { status: 401 });
  }

  const loginUrl = new URL('/dashboard/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}
