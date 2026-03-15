import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubscription, getUsage } from '@/lib/billing/usage';

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

  const [subscription, usage] = await Promise.all([
    getSubscription(profile.org_id),
    getUsage(profile.org_id),
  ]);

  return NextResponse.json({ subscription, usage });
}
