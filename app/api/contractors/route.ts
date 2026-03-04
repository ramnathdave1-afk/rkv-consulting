import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Contractors]', error);
      return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (e) {
    console.error('[Contractors]', e);
    return NextResponse.json({ error: 'Failed to list contractors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      company_name,
      contact_name,
      email,
      phone,
      trade,
      city,
      state,
    } = body;

    const { data, error } = await supabase
      .from('contractors')
      .insert({
        user_id: user.id,
        company_name: company_name || null,
        contact_name: contact_name || null,
        email: email || null,
        phone: phone || null,
        trade: trade || 'General',
        city: city || null,
        state: state || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Contractors]', error);
      return NextResponse.json({ error: 'Failed to add contractor' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('[Contractors]', e);
    return NextResponse.json({ error: 'Failed to add contractor' }, { status: 500 });
  }
}
