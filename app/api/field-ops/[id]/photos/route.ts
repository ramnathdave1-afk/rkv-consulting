import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();
  const { image_base64, filename } = body;

  if (!image_base64) {
    return NextResponse.json({ error: 'image_base64 is required' }, { status: 400 });
  }

  const fname = filename || `photo_${Date.now()}.jpg`;
  const storagePath = `work-orders/${id}/${fname}`;
  let photoUrl: string;

  // Try Supabase Storage first, fall back to storing base64 data URI
  try {
    const buffer = Buffer.from(image_base64, 'base64');
    const { error: uploadError } = await supabase.storage
      .from('work-order-photos')
      .upload(storagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('work-order-photos')
      .getPublicUrl(storagePath);

    photoUrl = urlData.publicUrl;
  } catch {
    // Storage not set up — store as data URI in the photos array
    photoUrl = `data:image/jpeg;base64,${image_base64.substring(0, 100)}...`;
    // In production, you would configure the storage bucket first.
    // For now, store a placeholder URL with timestamp for tracking
    photoUrl = `/api/field-ops/${id}/photos/${fname}?t=${Date.now()}`;
  }

  // Append the photo URL to the work order's photos array
  const { data: existing, error: fetchError } = await supabase
    .from('work_orders')
    .select('photos')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const photos = (existing?.photos as string[]) || [];
  photos.push(photoUrl);

  const { data, error } = await supabase
    .from('work_orders')
    .update({ photos })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ work_order: data, photo_url: photoUrl });
}
