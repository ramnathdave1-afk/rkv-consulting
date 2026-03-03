import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATUS_MAP = ['Active', 'Inactive', 'Hot Lead'] as const;
const LEAD_SOURCES = ['Referral', 'Cold Outreach', 'Inbound', 'Network Event', 'Other'] as const;

function toCRMContact(row: {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  type: string | null;
  relationship_score: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}) {
  const parts = (row.name || ' ').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  const meta = row.metadata || {};
  const tags = (meta.tags as string[]) || (row.type ? [row.type] : []);
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
    totalDealVolume: Number(meta.total_deal_volume) || 0,
    dealCount: Number(meta.deal_count) || 0,
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
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(toCRMContact(data));
  } catch (e) {
    console.error('[CRM Contacts]', e);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
