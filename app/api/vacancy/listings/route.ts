import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('vacancy_listings')
      .select('id, property_id, status, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Build a map of property_id -> listing status
    const statusMap: Record<string, string> = {};
    (data || []).forEach((row: { property_id: string; status: string }) => {
      // Keep the most recent listing status per property (first one since ordered by updated_at desc)
      if (!statusMap[row.property_id]) {
        statusMap[row.property_id] = row.status === 'published' ? 'Listed' : row.status === 'draft' ? 'Draft' : row.status === 'archived' ? 'Archived' : 'Not Listed';
      }
    });

    return NextResponse.json(statusMap);
  } catch (e) {
    console.error('[Vacancy Listings]', e);
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 });
  }
}
