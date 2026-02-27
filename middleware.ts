import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Public routes (no auth required)                                   */
/* ------------------------------------------------------------------ */

const publicPaths = new Set([
  '/',
  '/pricing',
  '/login',
  '/signup',
  '/forgot-password',
  '/api/stripe/webhook',
  '/api/health',
  '/submit-deal',
  '/wholesalers',
]);

function isPublicPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return true;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/deals/submit') ||
    pathname.startsWith('/api/deals/automatch') ||
    pathname.startsWith('/apply/') ||
    pathname.includes('.')
  ) {
    return true;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*  Middleware                                                          */
/* ------------------------------------------------------------------ */

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: { headers: req.headers },
  });

  const pathname = req.nextUrl.pathname;

  // Skip public paths
  if (isPublicPath(pathname)) {
    return res;
  }

  // Skip auth check if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return res;
  }

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          res = NextResponse.next({
            request: { headers: req.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get current session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- Protected dashboard routes ----
  if (!isPublicPath(pathname)) {
    if (!user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ---- Auth pages when already logged in ----
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // ---- Onboarding redirect for first-time users ----
  if (user && !pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile && profile.onboarding_completed === false) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }
    } catch {
      // If profile check fails, don't block the user
    }
  }

  return res;
}

/* ------------------------------------------------------------------ */
/*  Matcher config                                                     */
/* ------------------------------------------------------------------ */

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
