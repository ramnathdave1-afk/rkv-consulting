import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STAGE_TO_STATUS: Record<string, string> = {
  Prospect: 'lead',
  Analysis: 'analyzing',
  'Due Diligence': 'due_diligence',
  Negotiation: 'offer_sent',
  'Under Contract': 'under_contract',
  Closing: 'closing',
  Closed: 'closed',
  Dead: 'dead',
};
const STATUS_TO_STAGE: Record<string, string> = Object.fromEntries(
  Object.entries(STAGE_TO_STATUS).map(([k, v]) => [v, k])
);

function toCRMDeal(
  row: {
    id: string;
    address: string | null;
    city: string | null;
    state: string | null;
    asking_price: number | null;
    rehab_estimate: number | null;
    arv: number | null;
    analysis_data: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    property_type: string | null;
    status: string | null;
  },
  keyContact?: { id: string; name: string }
) {
  const addr = [row.address, row.city, row.state].filter(Boolean).join(', ') || 'Address TBD';
  const purchasePrice = row.asking_price ?? 0;
  const rehab = row.rehab_estimate ?? 0;
  const arv = row.arv ?? 0;
  const totalInv = purchasePrice + rehab;
  const profit = arv - totalInv;
  const roi = totalInv > 0 ? (profit / totalInv) * 100 : 0;
  const stage = STATUS_TO_STAGE[row.status || 'lead'] || 'Prospect';

  return {
    id: row.id,
    propertyAddress: addr,
    propertyType: (row.property_type === 'multi_family' ? 'Multi-Family' : row.property_type === 'commercial' ? 'Commercial' : 'SFR') as 'SFR' | 'Multi-Family' | 'Commercial',
    dealType: 'Flip' as const,
    stage: stage as 'Prospect' | 'Analysis' | 'Due Diligence' | 'Negotiation' | 'Under Contract' | 'Closed' | 'Dead',
    purchasePrice,
    rehabBudget: rehab,
    arv,
    projectedROI: roi,
    totalInvestment: totalInv,
    projectedProfit: profit,
    daysInStage: 0,
    riskLevel: 'Medium' as const,
    atlasScore: 0,
    atlasConfidence: 0,
    keyContact: keyContact || { id: '', name: '' },
    associatedContacts: [],
    stageHistory: [{ stage: stage as 'Prospect', enteredAt: row.updated_at || row.created_at }],
    activities: [],
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: deals, error: dealsErr } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (dealsErr) return NextResponse.json({ error: dealsErr.message }, { status: 500 });

    const { data: contacts } = await supabase.from('contacts').select('id, name').eq('user_id', user.id);
    type ContactInfo = { id: string; name: string };
    const contactMap = new Map<string, ContactInfo>(
      (contacts || []).map((c: { id: string; name: string | null }) => [c.id, { id: c.id, name: c.name || 'Unknown' }])
    );

    const list = (deals || []).map((d: {
      id: string;
      address: string | null;
      city: string | null;
      state: string | null;
      asking_price: number | null;
      rehab_estimate: number | null;
      arv: number | null;
      analysis_data: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
      property_type: string | null;
      status: string | null;
    }) => toCRMDeal(d, contactMap.get(d.id) ?? undefined));
    return NextResponse.json(list);
  } catch (e) {
    console.error('[CRM Deals]', e);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const b = await req.json();
    const { id, stage } = b;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const status = stage ? STAGE_TO_STATUS[stage] : undefined;
    if (!status) return NextResponse.json({ error: 'stage required' }, { status: 400 });

    const { data, error } = await supabase
      .from('deals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(toCRMDeal(data));
  } catch (e) {
    console.error('[CRM Deals]', e);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}
