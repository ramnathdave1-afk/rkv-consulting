import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetch10YearTreasury,
  fetchMortgageRate,
  fetchHousingPermits,
  fetchExistingHomeSales,
} from '@/lib/apis/fred';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cached: { data: LivePulseResponse; expiresAt: number } | null = null;

export interface LivePulseResponse {
  daily: {
    treasury_10y: number | null;
    mortgage_30y: number | null;
  };
  monthly: {
    housing_permits: number | null;
    existing_home_sales: number | null;
  };
  fetched_at: string;
  live: true;
}

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

    const [treasury10y, mortgage30y, permits, existingSales] = await Promise.allSettled([
      fetch10YearTreasury(),
      fetchMortgageRate(),
      fetchHousingPermits(),
      fetchExistingHomeSales(),
    ]);

    const data: LivePulseResponse = {
      daily: {
        treasury_10y: treasury10y.status === 'fulfilled' ? treasury10y.value : null,
        mortgage_30y: mortgage30y.status === 'fulfilled' ? mortgage30y.value : null,
      },
      monthly: {
        housing_permits: permits.status === 'fulfilled' ? permits.value : null,
        existing_home_sales: existingSales.status === 'fulfilled' ? existingSales.value : null,
      },
      fetched_at: new Date().toISOString(),
      live: true,
    };

    cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Market Pulse] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live market pulse' },
      { status: 500 }
    );
  }
}
