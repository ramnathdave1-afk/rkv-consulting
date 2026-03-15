import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: sources, error } = await supabase
    .from('data_sources')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch recent jobs for each source
  const sourceIds = sources?.map((s) => s.id) || [];

  const { data: recentJobs } = await supabase
    .from('ingestion_jobs')
    .select('*')
    .in('source_id', sourceIds)
    .order('created_at', { ascending: false })
    .limit(50);

  // Group jobs by source
  const jobsBySource: Record<string, typeof recentJobs> = {};
  for (const job of recentJobs || []) {
    if (!jobsBySource[job.source_id]) jobsBySource[job.source_id] = [];
    jobsBySource[job.source_id]!.push(job);
  }

  const enriched = (sources || []).map((source) => ({
    ...source,
    recent_jobs: (jobsBySource[source.id] || []).slice(0, 5),
  }));

  return NextResponse.json({ sources: enriched });
}
