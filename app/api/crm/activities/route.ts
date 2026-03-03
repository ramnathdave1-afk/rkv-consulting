import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('contact_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const list = (data || []).map((row: { id: string; type: string; description: string; created_at: string; contact_id?: string; deal_id?: string }) => ({
      id: row.id,
      type: row.type as 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'analysis' | 'document',
      description: row.description,
      timestamp: row.created_at,
      contactId: row.contact_id,
      dealId: row.deal_id,
    }));
    return NextResponse.json(list);
  } catch (e) {
    console.error('[CRM Activities]', e);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
