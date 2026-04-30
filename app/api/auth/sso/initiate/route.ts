import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/sso/initiate
 * Body: { email_domain: string }
 *
 * Looks up an enabled SSO config for the email domain. If found, returns the
 * Supabase SSO redirect URL the client should send the user to. Otherwise
 * returns sso_url=null so the login page falls through to password auth.
 */
export async function POST(request: NextRequest) {
  const { email_domain } = await request.json();

  if (!email_domain || typeof email_domain !== 'string') {
    return NextResponse.json({ error: 'email_domain is required' }, { status: 400 });
  }

  const domain = email_domain.toLowerCase().replace(/^@/, '').trim();
  const admin = createAdminClient();

  const { data: configs, error } = await admin
    .from('sso_configurations')
    .select('provider, provider_id, enabled, domain_allowlist')
    .contains('domain_allowlist', [domain])
    .eq('enabled', true)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const config = configs?.[0];
  if (!config) {
    return NextResponse.json({ sso_url: null });
  }

  // Use Supabase Auth signInWithSSO to get the redirect URL.
  // We invoke via the admin client but the redirect itself is browser-driven.
  // Pass `domain` so Supabase routes to the correct provider.
  type SsoSignInClient = {
    signInWithSSO?: (args: {
      domain?: string;
      providerId?: string;
      options?: { redirectTo?: string };
    }) => Promise<{ data?: { url?: string }; error?: { message?: string } }>;
  };
  const auth = admin.auth as unknown as SsoSignInClient;

  const origin = request.headers.get('origin') || request.nextUrl.origin;
  const redirectTo = `${origin}/auth/callback`;

  if (typeof auth.signInWithSSO === 'function') {
    const args: Parameters<NonNullable<SsoSignInClient['signInWithSSO']>>[0] = {
      options: { redirectTo },
    };
    if (config.provider_id) args.providerId = config.provider_id;
    else args.domain = domain;

    const { data, error: ssoError } = await auth.signInWithSSO(args);
    if (ssoError) {
      return NextResponse.json({ error: ssoError.message }, { status: 500 });
    }
    return NextResponse.json({ sso_url: data?.url ?? null });
  }

  // Fallback: construct the URL directly against Supabase's SSO endpoint.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Supabase URL not configured' }, { status: 500 });
  }
  const fallbackUrl =
    `${supabaseUrl}/auth/v1/sso?` +
    new URLSearchParams({
      domain,
      redirect_to: redirectTo,
    }).toString();

  return NextResponse.json({ sso_url: fallbackUrl });
}
