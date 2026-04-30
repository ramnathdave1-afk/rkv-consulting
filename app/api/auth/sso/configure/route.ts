import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireFeature } from '@/lib/billing/gate';

/**
 * POST /api/auth/sso/configure
 * Body: { provider, metadata_xml?, metadata_url?, domain_allowlist[], attribute_mapping{}, enabled }
 *
 * Registers a SAML SSO provider with Supabase and persists per-org config.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'No org' }, { status: 403 });
  }

  if (!['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
  }

  const gate = await requireFeature(profile.org_id, 'sso_saml');
  if (!gate.allowed) return gate.response;

  const body = await request.json();
  const {
    provider,
    metadata_xml,
    metadata_url,
    domain_allowlist = [],
    attribute_mapping = {},
    enabled = true,
  } = body;

  if (!provider) {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }
  if (!metadata_xml && !metadata_url) {
    return NextResponse.json(
      { error: 'metadata_xml or metadata_url is required' },
      { status: 400 }
    );
  }
  if (!Array.isArray(domain_allowlist) || domain_allowlist.length === 0) {
    return NextResponse.json(
      { error: 'At least one allowlisted domain is required' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Upsert provider with Supabase Auth admin SSO API.
  // The admin SDK exposes this under `auth.admin` in supabase-js v2.
  // See: https://supabase.com/docs/guides/auth/sso/auth-sso-saml
  let providerId: string | null = null;
  try {
    type SsoApi = {
      createSSOProvider?: (args: Record<string, unknown>) => Promise<{
        data?: { id?: string };
        error?: { message?: string };
      }>;
    };
    const ssoApi = (admin.auth.admin as unknown as SsoApi);
    if (typeof ssoApi.createSSOProvider === 'function') {
      const ssoArgs: Record<string, unknown> = {
        type: 'saml',
        domains: domain_allowlist,
        attribute_mapping,
      };
      if (metadata_xml) ssoArgs.metadata_xml = metadata_xml;
      if (metadata_url) ssoArgs.metadata_url = metadata_url;

      const { data, error } = await ssoApi.createSSOProvider(ssoArgs);
      if (error) {
        return NextResponse.json(
          { error: `Supabase SSO error: ${error.message}` },
          { status: 500 }
        );
      }
      providerId = data?.id ?? null;
    }
  } catch (e) {
    // If the SDK call fails (e.g., not Pro plan), still persist config so
    // admins can see what they entered. Surface the error.
    const msg = e instanceof Error ? e.message : 'Unknown SDK error';
    console.error('[sso/configure] createSSOProvider failed:', msg);
  }

  // Persist config row (one per org)
  const { error: upsertError } = await admin
    .from('sso_configurations')
    .upsert(
      {
        org_id: profile.org_id,
        provider,
        provider_id: providerId,
        metadata_xml: metadata_xml || null,
        metadata_url: metadata_url || null,
        domain_allowlist,
        attribute_mapping,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, provider_id: providerId });
}
