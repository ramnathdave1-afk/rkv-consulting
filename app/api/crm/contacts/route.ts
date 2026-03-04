import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATUS_MAP = ['Active', 'Inactive', 'Hot Lead'] as const;
const LEAD_SOURCES = ['Referral', 'Cold Outreach', 'Inbound', 'Network Event', 'Other'] as const;

interface ContactRow {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  type: string | null;
  relationship_score: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  deal_contacts?: { deal_id: string; deals: { asking_price: number | null } | null }[];
}

function toCRMContact(row: ContactRow) {
  const parts = (row.name || ' ').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  const meta = row.metadata || {};
  const tags = (meta.tags as string[]) || (row.type ? [row.type] : []);

  // Compute real dealCount and totalDealVolume from deal_contacts join
  const linkedDeals = row.deal_contacts || [];
  const dealCount = linkedDeals.length;
  const totalDealVolume = linkedDeals.reduce((sum, dc) => sum + (dc.deals?.asking_price ?? 0), 0);

  return {
    id: row.id,
    firstName,
    lastName,
    company: row.company || '',
    role: (meta.role as string) || row.type || '',
    phone: row.phone || '',
    email: row.email || '',
    address: (meta.address as string) || '',
    tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
    leadSource: (LEAD_SOURCES.includes((meta.lead_source as typeof LEAD_SOURCES[number]) || 'Other') ? meta.lead_source : 'Other') as typeof LEAD_SOURCES[number],
    leadScore: row.relationship_score ?? 50,
    status: (STATUS_MAP.includes((meta.status as typeof STATUS_MAP[number]) || 'Active') ? meta.status : 'Active') as typeof STATUS_MAP[number],
    totalDealVolume,
    dealCount,
    lastActivity: (meta.last_activity as string) || row.created_at,
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('contacts')
      .select('*, deal_contacts(deal_id, deals(asking_price))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CRM Contacts] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }
    const list = (data || []).map(toCRMContact);
    return NextResponse.json(list);
  } catch (e) {
    console.error('[CRM Contacts]', e);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const b = await req.json();
    const name = [b.firstName, b.lastName].filter(Boolean).join(' ') || 'Unknown';
    const metadata: Record<string, unknown> = {
      tags: b.tags || [],
      lead_source: b.leadSource || 'Other',
      address: b.address || '',
      status: b.status || 'Active',
      total_deal_volume: b.totalDealVolume ?? 0,
      deal_count: b.dealCount ?? 0,
      last_activity: b.lastActivity || new Date().toISOString(),
      role: b.role || '',
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        name,
        company: b.company || null,
        email: b.email || null,
        phone: b.phone || null,
        type: Array.isArray(b.tags) ? b.tags[0] || 'other' : b.tags || 'other',
        relationship_score: Math.min(10, Math.max(1, b.leadScore ?? 5)),
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('[CRM Contacts] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
    }
    return NextResponse.json(toCRMContact(data));
  } catch (e) {
    console.error('[CRM Contacts]', e);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[CRM Contacts] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[CRM Contacts]', e);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
