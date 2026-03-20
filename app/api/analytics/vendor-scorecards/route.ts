import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateVendorScorecards } from '@/lib/maintenance/vendor-scorecard';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const url = new URL(request.url);
  const month = url.searchParams.get('month') ? Number(url.searchParams.get('month')) : undefined;
  const year = url.searchParams.get('year') ? Number(url.searchParams.get('year')) : undefined;

  const scorecards = await calculateVendorScorecards(profile.org_id, month, year);
  return NextResponse.json({ scorecards });
}
