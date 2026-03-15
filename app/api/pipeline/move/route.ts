import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { STAGE_ORDER } from '@/lib/constants';
import type { PipelineStage } from '@/lib/types';

export async function PATCH(request: NextRequest) {
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
  const { site_id, to_stage, notes } = body;

  if (!site_id || !to_stage || !STAGE_ORDER.includes(to_stage)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // Get current site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, pipeline_stage, org_id')
    .eq('id', site_id)
    .eq('org_id', profile.org_id)
    .single();

  if (siteError || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const fromStage = site.pipeline_stage;

  // Update site
  const { error: updateError } = await supabase
    .from('sites')
    .update({ pipeline_stage: to_stage, updated_at: new Date().toISOString() })
    .eq('id', site_id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Log pipeline history
  await supabase.from('pipeline_history').insert({
    site_id,
    from_stage: fromStage,
    to_stage: to_stage as PipelineStage,
    moved_by: user.id,
    notes: notes || null,
  });

  // Log activity
  await supabase.from('agent_activity_log').insert({
    agent_name: null,
    action: `Pipeline: ${fromStage} → ${to_stage}`,
    details: { site_id, from: fromStage, to: to_stage, notes },
    org_id: profile.org_id,
    site_id,
  });

  return NextResponse.json({ success: true, from: fromStage, to: to_stage });
}
