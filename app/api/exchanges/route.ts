import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('exchanges_1031')
      .select('*')
      .eq('user_id', user.id)
      .order('sale_date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e) {
    console.error('[1031 Exchanges]', e);
    return NextResponse.json({ error: 'Failed to fetch exchanges' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { relinquishedProperty, salePrice, saleDate, notes } = body;

    if (!relinquishedProperty || !salePrice || !saleDate) {
      return NextResponse.json({ error: 'relinquishedProperty, salePrice, and saleDate are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('exchanges_1031')
      .insert({
        user_id: user.id,
        relinquished_property: relinquishedProperty,
        sale_price: salePrice,
        sale_date: saleDate,
        notes: notes || null,
        status: 'initiated',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[1031 Exchanges]', e);
    return NextResponse.json({ error: 'Failed to create exchange' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, status, identifiedProperties, notes } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (identifiedProperties !== undefined) updates.identified_properties = identifiedProperties;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('exchanges_1031')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error('[1031 Exchanges]', e);
    return NextResponse.json({ error: 'Failed to update exchange' }, { status: 500 });
  }
}
