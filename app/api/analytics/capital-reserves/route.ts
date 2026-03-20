import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { projectCapitalReserves } from '@/lib/analytics/capital-reserves';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id');
  if (!propertyId) return NextResponse.json({ error: 'property_id required' }, { status: 400 });

  const result = await projectCapitalReserves(profile.org_id, propertyId);
  return NextResponse.json(result);
}
