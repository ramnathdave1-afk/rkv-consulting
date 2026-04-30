import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /auth/callback
 *
 * Handles the post-IDP redirect from Supabase. Exchanges the code for a
 * session, then auto-provisions a profile + org link for first-time SSO users.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/dashboard';

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
      );
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const isSamlUser = user.app_metadata?.provider === 'saml';

  if (!profile && isSamlUser) {
    // Auto-provision SSO user
    const admin = createAdminClient();
    const email = user.email!;
    const domain = email.split('@')[1]?.toLowerCase();

    if (domain) {
      const { data: ssoConfig } = await admin
        .from('sso_configurations')
        .select('org_id, attribute_mapping')
        .contains('domain_allowlist', [domain])
        .eq('enabled', true)
        .maybeSingle();

      if (ssoConfig) {
        // Map SAML attrs → role if attribute_mapping.role is configured.
        const meta = (user.user_metadata || {}) as Record<string, unknown>;
        const mapping = (ssoConfig.attribute_mapping || {}) as Record<string, string>;
        const mappedName =
          (mapping.name && typeof meta[mapping.name] === 'string'
            ? (meta[mapping.name] as string)
            : null) ||
          (typeof meta.name === 'string' ? meta.name : null) ||
          (typeof meta.full_name === 'string' ? meta.full_name : null) ||
          email.split('@')[0];

        const mappedRole =
          mapping.role && typeof meta[mapping.role] === 'string'
            ? (meta[mapping.role] as string)
            : 'member';

        const ssoSubject =
          (typeof meta.sub === 'string' ? meta.sub : null) ||
          (typeof user.app_metadata?.sub === 'string' ? user.app_metadata.sub : null) ||
          user.id;

        await admin.from('profiles').insert({
          user_id: user.id,
          org_id: ssoConfig.org_id,
          email,
          full_name: mappedName,
          role: mappedRole,
          auth_method: 'sso_saml',
          sso_subject: ssoSubject,
        });
      } else {
        // No SSO config matches — user got here somehow but has no org.
        // Send them to a holding page; admins can claim manually.
        return NextResponse.redirect(
          new URL('/login?error=No+org+matched+for+your+domain', request.url)
        );
      }
    }
  } else if (profile && isSamlUser) {
    // Existing profile — keep auth_method in sync if it changed.
    const admin = createAdminClient();
    await admin
      .from('profiles')
      .update({ auth_method: 'sso_saml' })
      .eq('user_id', user.id);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
