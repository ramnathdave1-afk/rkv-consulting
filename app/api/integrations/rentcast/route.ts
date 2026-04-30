/**
 * RentCast integration config endpoints.
 *
 * GET  /api/integrations/rentcast → { configured: boolean, has_org_key: boolean, env_fallback: boolean }
 *      (Never returns the key itself — masks for safety.)
 * PUT  /api/integrations/rentcast { api_key: string | null }
 *      Sets / clears the per-org RentCast key. Pass null/empty to disable.
 *
 * Storage: `integration_configs` table, provider='rentcast', config={ api_key }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data: integration } = await supabase
    .from('integration_configs')
    .select('config, enabled')
    .eq('org_id', profile.org_id)
    .eq('provider', 'rentcast')
    .maybeSingle();

  const cfg = (integration?.config && typeof integration.config === 'object')
    ? (integration.config as { api_key?: string })
    : {};
  const orgKey = integration?.enabled && cfg.api_key ? cfg.api_key : null;

  return NextResponse.json({
    has_org_key: Boolean(orgKey),
    env_fallback: Boolean(process.env.RENTCAST_API_KEY),
    configured: Boolean(orgKey || process.env.RENTCAST_API_KEY),
    // Mask the key for display (last 4 chars).
    masked_key: orgKey ? `••••${orgKey.slice(-4)}` : null,
  });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { api_key?: string | null };
  const newKey = typeof body.api_key === 'string' ? body.api_key.trim() : null;

  // Upsert (org_id, provider) row.
  const { error } = await supabase
    .from('integration_configs')
    .upsert(
      {
        org_id: profile.org_id,
        provider: 'rentcast',
        config: newKey ? { api_key: newKey } : {},
        enabled: Boolean(newKey),
      },
      { onConflict: 'org_id,provider' },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    has_org_key: Boolean(newKey),
    configured: Boolean(newKey || process.env.RENTCAST_API_KEY),
    masked_key: newKey ? `••••${newKey.slice(-4)}` : null,
  });
}
