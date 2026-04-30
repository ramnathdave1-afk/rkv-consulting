import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const STEP_ORDER = [
  'org_setup',
  'plan',
  'first_property',
  'branding',
  'team',
  'integrations',
  'tour',
] as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { step } = await request.json();
  if (!step || !STEP_ORDER.includes(step)) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  const idx = STEP_ORDER.indexOf(step);
  const nextStep = idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : 'tour';

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_step: nextStep })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, nextStep });
}
