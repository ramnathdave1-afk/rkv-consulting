/**
 * Apify integration status endpoint.
 *
 * GET /api/integrations/apify → { configured: boolean }
 *
 * Apify is server-env-only (APIFY_API_TOKEN). We never return the token — just
 * whether it's wired up so the Settings UI can render a status pill.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isApifyConfigured } from '@/lib/acquisitions/apify-comps';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    configured: isApifyConfigured(),
  });
}
