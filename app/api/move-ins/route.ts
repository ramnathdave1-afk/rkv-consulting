import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_CHECKLIST_ITEMS } from '@/lib/move-ins/default-checklist';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('move_in_checklists')
    .select(`
      *,
      tenants ( id, first_name, last_name, email, phone ),
      properties ( id, name, address_line1 ),
      units ( id, unit_number ),
      move_in_checklist_items ( id, completed )
    `)
    .eq('org_id', ORG_ID)
    .order('move_in_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const checklists = (data || []).map((c: Record<string, unknown>) => {
    const items = (c.move_in_checklist_items || []) as { id: string; completed: boolean }[];
    return {
      ...c,
      total_items: items.length,
      completed_items: items.filter((i) => i.completed).length,
    };
  });

  return NextResponse.json({ checklists });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  const { tenant_id, property_id, unit_id, move_in_date, lease_id } = body;

  if (!tenant_id || !property_id || !move_in_date) {
    return NextResponse.json(
      { error: 'tenant_id, property_id, and move_in_date are required' },
      { status: 400 },
    );
  }

  // Create the checklist
  const { data: checklist, error: cErr } = await supabase
    .from('move_in_checklists')
    .insert({
      org_id: ORG_ID,
      tenant_id,
      property_id,
      unit_id: unit_id || null,
      lease_id: lease_id || null,
      move_in_date,
      status: 'pending',
    })
    .select()
    .single();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // Auto-generate default checklist items
  const items = DEFAULT_CHECKLIST_ITEMS.map((item) => ({
    checklist_id: checklist.id,
    org_id: ORG_ID,
    item_type: item.type,
    label: item.label,
    sort_order: item.sort,
    completed: false,
  }));

  const { error: iErr } = await supabase
    .from('move_in_checklist_items')
    .insert(items);

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  // Re-fetch with joins
  const { data: full, error: fErr } = await supabase
    .from('move_in_checklists')
    .select(`
      *,
      tenants ( id, first_name, last_name, email, phone ),
      properties ( id, name, address_line1 ),
      units ( id, unit_number ),
      move_in_checklist_items ( id, completed )
    `)
    .eq('id', checklist.id)
    .single();

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  const fullItems = (full.move_in_checklist_items || []) as { id: string; completed: boolean }[];

  return NextResponse.json(
    {
      checklist: {
        ...full,
        total_items: fullItems.length,
        completed_items: fullItems.filter((i) => i.completed).length,
      },
    },
    { status: 201 },
  );
}
