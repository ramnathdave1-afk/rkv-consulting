import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  // Verify integration belongs to org
  const { data: integration } = await supabase
    .from('integrations')
    .select('id, platform, status')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }

  // Create sync job
  const { data: job, error } = await supabase
    .from('sync_jobs')
    .insert({
      integration_id: id,
      org_id: profile.org_id,
      entity_type: 'full',
      status: 'queued',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update integration status
  await supabase
    .from('integrations')
    .update({ status: 'syncing' })
    .eq('id', id);

  // TODO: Dispatch actual sync job to background worker

  return NextResponse.json({ sync_job: job }, { status: 201 });
}
