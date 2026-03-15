import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateApiKey } from '@/app/api/v1/middleware';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, rate_limit_rpm, is_active, last_used_at, expires_at, created_at')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get usage stats for each key
  const keyIds = (keys || []).map((k) => k.id);
  const { data: usageStats } = await supabase
    .from('api_usage')
    .select('api_key_id, endpoint')
    .in('api_key_id', keyIds)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const usageByKey: Record<string, number> = {};
  for (const u of usageStats || []) {
    usageByKey[u.api_key_id] = (usageByKey[u.api_key_id] || 0) + 1;
  }

  const enriched = (keys || []).map((k) => ({
    ...k,
    requests_24h: usageByKey[k.id] || 0,
  }));

  return NextResponse.json({ keys: enriched });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const name = body.name || 'API Key';
  const scopes = body.scopes || ['read'];
  const rateLimitRpm = body.rate_limit_rpm || 60;

  const { rawKey, keyHash, keyPrefix } = await generateApiKey();

  const { error } = await supabase.from('api_keys').insert({
    org_id: profile.org_id,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes,
    rate_limit_rpm: rateLimitRpm,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the raw key — this is the ONLY time it's shown
  return NextResponse.json({
    key: rawKey,
    prefix: keyPrefix,
    message: 'Save this key — it will not be shown again.',
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Key ID required' }, { status: 400 });

  // Soft delete — deactivate instead of removing
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
