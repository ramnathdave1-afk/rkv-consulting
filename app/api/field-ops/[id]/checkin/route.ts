import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();
  const { latitude, longitude } = body;

  if (latitude == null || longitude == null) {
    return NextResponse.json({ error: 'latitude and longitude are required' }, { status: 400 });
  }

  // Fetch current work order to merge metadata
  const { data: existing, error: fetchError } = await supabase
    .from('work_orders')
    .select('metadata')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const currentMetadata = (existing?.metadata as Record<string, unknown>) || {};
  const checkins = (currentMetadata.checkins as Array<unknown>) || [];

  checkins.push({
    latitude,
    longitude,
    timestamp: now,
  });

  const updatedMetadata = {
    ...currentMetadata,
    checkins,
    last_checkin: { latitude, longitude, timestamp: now },
  };

  const { data, error } = await supabase
    .from('work_orders')
    .update({
      metadata: updatedMetadata,
      vendor_arrival_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ work_order: data, checkin_time: now });
}
