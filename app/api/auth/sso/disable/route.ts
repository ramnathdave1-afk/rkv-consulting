import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/sso/disable
 * Disables SSO for the caller's org. Removes the Supabase SSO provider if one
 * was registered, and marks the local row disabled.
 */
export async function POST() {
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

  const admin = createAdminClient();

  const { data: config } = await admin
    .from('sso_configurations')
    .select('provider_id')
    .eq('org_id', profile.org_id)
    .maybeSingle();

  if (config?.provider_id) {
    try {
      type DeleteApi = {
        deleteSSOProvider?: (id: string) => Promise<{ error?: { message?: string } }>;
      };
      const ssoApi = admin.auth.admin as unknown as DeleteApi;
      if (typeof ssoApi.deleteSSOProvider === 'function') {
        await ssoApi.deleteSSOProvider(config.provider_id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[sso/disable] deleteSSOProvider failed:', msg);
      // Continue — disable the local row regardless.
    }
  }

  const { error: updateError } = await admin
    .from('sso_configurations')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('org_id', profile.org_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
