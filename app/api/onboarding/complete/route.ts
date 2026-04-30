import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date().toISOString();

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
      onboarding_completed_at: now,
      onboarding_step: 'done',
    })
    .eq('user_id', user.id)
    .select('org_id')
    .single();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  if (profile?.org_id) {
    await supabase
      .from('organizations')
      .update({ onboarding_completed: true })
      .eq('id', profile.org_id);
  }

  return NextResponse.json({ success: true, redirect: '/dashboard' });
}
