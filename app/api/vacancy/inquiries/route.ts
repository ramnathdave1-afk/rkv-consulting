import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('property_id');

    let query = supabase
      .from('vacancy_inquiries')
      .select('*')
      .eq('user_id', user.id)
      .order('date_received', { ascending: false });

    if (propertyId) query = query.eq('property_id', propertyId);

    const { data, error } = await query;

    if (error) {
      console.error('[Vacancy Inquiries]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (e) {
    console.error('[Vacancy Inquiries]', e);
    return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { property_id, prospect_name, email, phone, message, source, interest_score } = body;

    if (!property_id || !prospect_name) {
      return NextResponse.json({ error: 'property_id and prospect_name required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('vacancy_inquiries')
      .insert({
        user_id: user.id,
        property_id: property_id,
        prospect_name: prospect_name,
        email: email || null,
        phone: phone || null,
        message: message || null,
        source: source || 'Direct',
        interest_score: interest_score || 'Medium',
      })
      .select()
      .single();

    if (error) {
      console.error('[Vacancy Inquiries]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('[Vacancy Inquiries]', e);
    return NextResponse.json({ error: 'Failed to create inquiry' }, { status: 500 });
  }
}
