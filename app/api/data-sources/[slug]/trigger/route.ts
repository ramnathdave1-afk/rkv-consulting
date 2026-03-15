import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Verify the source exists
  const { data: source, error } = await supabase
    .from('data_sources')
    .select('id, name, status')
    .eq('slug', slug)
    .single();

  if (error || !source) {
    return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
  }

  // Check for already running jobs
  const { data: running } = await supabase
    .from('ingestion_jobs')
    .select('id')
    .eq('source_id', source.id)
    .eq('status', 'running')
    .limit(1);

  if (running?.length) {
    return NextResponse.json({ error: 'An ingestion job is already running for this source' }, { status: 409 });
  }

  // Parse request body for optional filters
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine
  }

  // Create a queued job (the worker will pick it up)
  const { data: job, error: jobError } = await supabase
    .from('ingestion_jobs')
    .insert({
      source_id: source.id,
      status: 'queued',
      triggered_by: 'manual',
      target_states: body.states || null,
      target_counties: body.counties || null,
      target_bbox: body.bbox || null,
    })
    .select('id')
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Ingestion job queued for ${source.name}`,
    job_id: job?.id,
  });
}
