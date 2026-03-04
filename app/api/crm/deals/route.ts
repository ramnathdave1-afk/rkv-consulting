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

interface DealRow {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  asking_price: number | null;
  rehab_estimate: number | null;
  arv: number | null;
  monthly_rent_estimate: number | null;
  source: string | null;
  analysis_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  property_type: string | null;
  status: string | null;
  stage_entered_at: string | null;
  deal_contacts?: { contact_id: string; role: string | null; contacts: { id: string; name: string | null } | null }[];
}

function deriveDealType(row: DealRow): 'Flip' | 'Rental' | 'Wholesale' | 'BRRRR' {
  const source = (row.source || '').toLowerCase();
  if (source === 'wholesale') return 'Wholesale';

  const hasRent = (row.monthly_rent_estimate ?? 0) > 0;
  const hasRehab = (row.rehab_estimate ?? 0) > 0;
  const rehabRatio = row.asking_price ? (row.rehab_estimate ?? 0) / row.asking_price : 0;

  // BRRRR: has both rental income and significant rehab (>10% of purchase price)
  if (hasRent && hasRehab && rehabRatio > 0.1) return 'BRRRR';
  // Rental: has rental income estimate
  if (hasRent) return 'Rental';
  // Flip: has rehab estimate
  if (hasRehab) return 'Flip';
  // Default
  return 'Rental';
}

function toCRMDeal(row: DealRow) {
  const addr = [row.address, row.city, row.state].filter(Boolean).join(', ') || 'Address TBD';
  const purchasePrice = row.asking_price ?? 0;
  const rehab = row.rehab_estimate ?? 0;
  const arv = row.arv ?? 0;
  const totalInv = purchasePrice + rehab;
  const profit = arv - totalInv;
  const roi = totalInv > 0 ? Math.round((profit / totalInv) * 1000) / 10 : 0;
  const stage = STATUS_TO_STAGE[row.status || 'lead'] || 'Prospect';

  // Compute daysInStage from stage_entered_at
  const stageEnteredAt = row.stage_entered_at || row.updated_at || row.created_at;
  const daysInStage = Math.max(0, Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / 86400000));

  // Read ATLAS scores from analysis_data JSONB
  const ad = row.analysis_data || {};
  const atlasScore = Number(ad.atlas_score ?? ad.score ?? 0);
  const atlasConfidence = Number(ad.atlas_confidence ?? ad.confidence ?? 0);

  // Derive riskLevel from atlasScore
  const riskLevel: 'Low' | 'Medium' | 'High' = atlasScore > 7 ? 'Low' : atlasScore >= 5 ? 'Medium' : atlasScore > 0 ? 'High' : 'Medium';

  // Build associatedContacts from deal_contacts join
  const linkedContacts = (row.deal_contacts || [])
    .filter((dc) => dc.contacts)
    .map((dc) => ({
      id: dc.contacts!.id,
      name: dc.contacts!.name || 'Unknown',
      role: dc.role || 'Contact',
    }));
  const keyContact = linkedContacts[0] ? { id: linkedContacts[0].id, name: linkedContacts[0].name } : { id: '', name: '' };

  return {
    id: row.id,
    propertyAddress: addr,
    propertyType: (row.property_type === 'multi_family' ? 'Multi-Family' : row.property_type === 'commercial' ? 'Commercial' : 'SFR') as 'SFR' | 'Multi-Family' | 'Commercial',
    dealType: deriveDealType(row),
    stage: stage as 'Prospect' | 'Analysis' | 'Due Diligence' | 'Negotiation' | 'Under Contract' | 'Closed' | 'Dead',
    purchasePrice,
    rehabBudget: rehab,
    arv,
    projectedROI: roi,
    totalInvestment: totalInv,
    projectedProfit: profit,
    daysInStage,
    riskLevel,
    atlasScore,
    atlasConfidence,
    keyContact,
    associatedContacts: linkedContacts,
    stageHistory: [{ stage: stage as 'Prospect', enteredAt: stageEnteredAt }],
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
      .select('*, deal_contacts(contact_id, role, contacts(id, name))')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (dealsErr) {
      console.error('[CRM Deals] DB error:', dealsErr.message);
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
    }

    const list = (deals || []).map((d: DealRow) => toCRMDeal(d));
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
    if (!stage || !STAGE_TO_STATUS[stage]) {
      return NextResponse.json({ error: `Invalid stage. Must be one of: ${Object.keys(STAGE_TO_STATUS).join(', ')}` }, { status: 400 });
    }
    const status = STAGE_TO_STATUS[stage];

    // Get current status before update
    const { data: currentDeal } = await supabase
      .from('deals')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const previousStatus = currentDeal?.status || null;

    const { data, error } = await supabase
      .from('deals')
      .update({ status, stage_entered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[CRM Deals] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
    }

    // Record stage history: close previous row and insert new one
    if (previousStatus !== status) {
      await supabase
        .from('deal_stage_history')
        .update({ exited_at: new Date().toISOString() })
        .eq('deal_id', id)
        .eq('user_id', user.id)
        .is('exited_at', null);

      await supabase
        .from('deal_stage_history')
        .insert({
          deal_id: id,
          user_id: user.id,
          from_stage: previousStatus,
          to_stage: status,
          entered_at: new Date().toISOString(),
        });
    }

    return NextResponse.json(toCRMDeal(data));
  } catch (e) {
    console.error('[CRM Deals]', e);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}
