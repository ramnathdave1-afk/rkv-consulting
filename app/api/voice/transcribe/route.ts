import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio } from '@/lib/ai/whisper';
import { triageMaintenanceRequest, matchVendor } from '@/lib/ai/maintenance-triage';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const formData = await request.formData();
  const audioFile = formData.get('audio') as File | null;
  const propertyId = formData.get('property_id') as string | null;
  const unitId = formData.get('unit_id') as string | null;
  const tenantId = formData.get('tenant_id') as string | null;

  if (!audioFile) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  if (!propertyId) return NextResponse.json({ error: 'property_id required' }, { status: 400 });

  const buffer = await audioFile.arrayBuffer();
  const transcription = await transcribeAudio(buffer, audioFile.name);

  if (!transcription.text) {
    return NextResponse.json({ error: 'Could not transcribe audio' }, { status: 422 });
  }

  // Auto-triage the transcribed maintenance request
  const triage = await triageMaintenanceRequest(transcription.text);
  const vendor = await matchVendor(profile.org_id, triage.category);

  // Create work order from voice transcription
  const admin = createAdminClient();
  const { data: workOrder } = await admin
    .from('work_orders')
    .insert({
      org_id: profile.org_id,
      property_id: propertyId,
      unit_id: unitId || null,
      tenant_id: tenantId || null,
      vendor_id: vendor?.id || null,
      title: triage.summary,
      description: transcription.text,
      category: triage.category,
      priority: triage.priority,
      status: vendor ? 'assigned' : 'open',
      source: 'phone',
      ai_summary: triage.summary,
      metadata: {
        transcription_duration: transcription.duration_seconds,
        transcription_language: transcription.language,
        auto_triaged: true,
        auto_dispatched: !!vendor,
      },
    })
    .select('id')
    .single();

  return NextResponse.json({
    transcription: transcription.text,
    duration_seconds: transcription.duration_seconds,
    triage,
    vendor_assigned: vendor ? { id: vendor.id, name: vendor.name } : null,
    work_order_id: workOrder?.id,
  });
}
