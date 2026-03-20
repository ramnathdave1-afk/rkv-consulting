import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptCredentials } from '@/lib/integrations/credentials';

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

  const { data, error } = await supabase
    .from('integrations')
    .select('id, org_id, platform, auth_type, status, last_sync_at, last_sync_status, last_sync_records, sync_config, created_at, updated_at')
    .eq('org_id', profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integrations: data });
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

  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { platform, auth_type, credentials } = await request.json();

  if (!platform || !credentials) {
    return NextResponse.json({ error: 'Missing platform or credentials' }, { status: 400 });
  }

  const credentials_encrypted = encryptCredentials(credentials);

  const { data, error } = await supabase
    .from('integrations')
    .insert({
      org_id: profile.org_id,
      platform,
      auth_type: auth_type || 'api_key',
      credentials_encrypted,
      status: 'disconnected',
      created_by: user.id,
    })
    .select('id, org_id, platform, auth_type, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ integration: data }, { status: 201 });
}
