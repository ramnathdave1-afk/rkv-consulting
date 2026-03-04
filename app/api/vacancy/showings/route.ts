import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('showing_appointments')
      .select('*, properties(address)')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (error) {
      console.error('[Vacancy Showings]', error);
      return NextResponse.json({ error: 'Failed to fetch showings' }, { status: 500 });
    }

    const list = (data || []).map((row: {
      id: string;
      property_id: string;
      prospect_name: string;
      prospect_email: string | null;
      prospect_phone: string | null;
      date: string;
      time: string;
      status: string;
      notes: string | null;
      properties: { address: string | null } | null;
    }) => ({
      id: row.id,
      prospectName: row.prospect_name,
      propertyAddress: row.properties?.address || 'Unknown',
      propertyId: row.property_id,
      dateTime: `${row.date}T${row.time}`,
      status: row.status === 'confirmed' ? 'Confirmed' : row.status === 'completed' ? 'Completed' : 'Pending',
      notes: row.notes,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error('[Vacancy Showings]', e);
    return NextResponse.json({ error: 'Failed to fetch showings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { propertyId, prospectName, prospectEmail, prospectPhone, date, time, inquiryId, notes } = body;

    if (!propertyId || !prospectName || !date || !time) {
      return NextResponse.json({ error: 'propertyId, prospectName, date, and time are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('showing_appointments')
      .insert({
        user_id: user.id,
        property_id: propertyId,
        prospect_name: prospectName,
        prospect_email: prospectEmail || null,
        prospect_phone: prospectPhone || null,
        date,
        time,
        inquiry_id: inquiryId || null,
        notes: notes || null,
        status: 'pending',
      })
      .select('*, properties(address)')
      .single();

    if (error) {
      console.error('[Vacancy Showings]', error);
      return NextResponse.json({ error: 'Failed to create showing' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      prospectName: data.prospect_name,
      propertyAddress: data.properties?.address || 'Unknown',
      propertyId: data.property_id,
      dateTime: `${data.date}T${data.time}`,
      status: 'Pending',
    });
  } catch (e) {
    console.error('[Vacancy Showings]', e);
    return NextResponse.json({ error: 'Failed to create showing' }, { status: 500 });
  }
}
