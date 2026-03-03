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
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/integrations/status') ||
    pathname.startsWith('/api/leads/') ||
    pathname.startsWith('/apply/') ||
    pathname.startsWith('/portfolio/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/careers') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/security') ||
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

  // Get session from JWT (local validation, no network call)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // ---- Protected routes ----
  if (!isPublicPath(pathname) && !user) {
    // API routes: return JSON 401 (not a redirect to HTML login page)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Page routes: redirect to login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---- Auth pages when already logged in ----
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // ---- Onboarding redirect for first-time users ----
  // Only query DB if the onboarding cookie is not set (avoids a DB call on every request)
  const onboardingDone = req.cookies.get('onboarding_completed')?.value === '1';
  if (user && !onboardingDone && !pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile && profile.onboarding_completed === false) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }

      // User has completed onboarding — set cookie so we skip the DB check next time
      if (profile && profile.onboarding_completed !== false) {
        res.cookies.set('onboarding_completed', '1', {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
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
