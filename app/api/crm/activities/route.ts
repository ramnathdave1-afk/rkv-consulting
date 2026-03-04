import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  created_at: string;
  contact_id?: string;
  deal_id?: string;
  contacts: { name: string | null } | null;
  deals: { address: string | null; city: string | null } | null;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('contact_activities')
      .select('*, contacts(name), deals(address, city)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[CRM Activities] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const list = (data || []).map((row: ActivityRow) => ({
      id: row.id,
      type: row.type as 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'analysis' | 'document',
      description: row.description,
      timestamp: row.created_at,
      contactId: row.contact_id,
      contactName: row.contacts?.name || undefined,
      dealId: row.deal_id,
      dealAddress: row.deals ? [row.deals.address, row.deals.city].filter(Boolean).join(', ') || undefined : undefined,
    }));
    return NextResponse.json(list);
  } catch (e) {
    console.error('[CRM Activities]', e);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, description, contactId, dealId } = body;

    const VALID_TYPES = ['call', 'email', 'meeting', 'note', 'stage_change', 'analysis', 'document'] as const;
    if (!type || !description) {
      return NextResponse.json({ error: 'type and description are required' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }
    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contact_activities')
      .insert({
        user_id: user.id,
        contact_id: contactId,
        deal_id: dealId || null,
        type,
        description,
      })
      .select('*, contacts(name), deals(address, city)')
      .single();

    if (error) {
      console.error('[CRM Activities] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
    }

    const row = data as ActivityRow;
    return NextResponse.json({
      id: row.id,
      type: row.type,
      description: row.description,
      timestamp: row.created_at,
      contactId: row.contact_id,
      contactName: row.contacts?.name || undefined,
      dealId: row.deal_id,
      dealAddress: row.deals ? [row.deals.address, row.deals.city].filter(Boolean).join(', ') || undefined : undefined,
    });
  } catch (e) {
    console.error('[CRM Activities]', e);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
