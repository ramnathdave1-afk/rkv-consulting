import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePortfolioFit } from '@/lib/acquisitions/portfolio-fit';
import type { Deal } from '@/lib/types';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data: deal } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

  const result = await analyzePortfolioFit(profile.org_id, deal as unknown as Deal);

  // Store the analysis on the deal
  await supabase.from('deals').update({
    portfolio_impact: result.impact_summary,
  }).eq('id', id);

  return NextResponse.json(result);
}
