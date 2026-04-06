import { NextRequest, NextResponse } from 'next/server';
import { getMarketStats } from '@/lib/serpapi/client';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const city = searchParams.get('city');
  const state = searchParams.get('state');

  if (!city || !state) {
    return NextResponse.json({ error: 'city and state are required' }, { status: 400 });
  }

  try {
    const data = await getMarketStats(city, state);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
