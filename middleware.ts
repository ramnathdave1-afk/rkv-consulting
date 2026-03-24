import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/pricing', '/terms', '/privacy', '/about', '/contact', '/security', '/demo', '/api/demo', '/api/waitlist', '/api/webhooks', '/api/stripe/webhooks', '/api/twilio/incoming', '/api/twilio/status', '/api/email/incoming', '/api/chat/widget', '/dashboard', '/properties', '/tenants', '/leases', '/work-orders', '/vendors', '/showings', '/conversations', '/reports', '/acquisitions', '/settings', '/integrations', '/import', '/onboarding', '/tenant-portal', '/api/seed'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  // Protected routes — require auth
  const { user, supabaseResponse } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
