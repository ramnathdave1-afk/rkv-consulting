import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(6);

    if (error) {
      console.error('[Portfolio Snapshot]', error);
      return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
    }

    const ordered = (data || []).reverse();
    return NextResponse.json(ordered);
  } catch (e) {
    console.error('[Portfolio Snapshot]', e);
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { portfolio_value, equity, monthly_cash_flow, net_roi } = body;

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('portfolio_snapshots')
      .upsert(
        {
          user_id: user.id,
          snapshot_date: today,
          portfolio_value: Number(portfolio_value) || 0,
          equity: Number(equity) || 0,
          monthly_cash_flow: Number(monthly_cash_flow) || 0,
          net_roi: net_roi != null ? Number(net_roi) : null,
        },
        { onConflict: 'user_id,snapshot_date', ignoreDuplicates: false }
      );

    if (error) {
      console.error('[Portfolio Snapshot]', error);
      return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Portfolio Snapshot]', e);
    return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });
  }
}
