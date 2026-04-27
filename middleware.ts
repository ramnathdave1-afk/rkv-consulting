import "@/lib/config";
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/terms',
  '/privacy',
  '/about',
  '/contact',
  '/security',
  '/demo',
  '/status',
  '/changelog',
  '/docs',
  '/api/auth',
  '/api/demo',
  '/api/waitlist',
  '/api/twilio',
  '/api/stripe/webhooks',
  '/api/webhooks',
  '/api/email/incoming',
  '/api/chat/widget',
  '/api/outreach/track',
  '/api/outreach/webhooks',
  '/api/outreach/unsubscribe',
  '/_next',
  '/favicon.ico',
];

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
