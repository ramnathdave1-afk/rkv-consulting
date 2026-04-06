import { NextRequest, NextResponse } from 'next/server';
import { getMarketComps } from '@/lib/serpapi/client';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const address = searchParams.get('address');
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const zip = searchParams.get('zip');

  if (!address || !city || !state || !zip) {
    return NextResponse.json({ error: 'address, city, state, zip are required' }, { status: 400 });
  }

  try {
    const data = await getMarketComps(address, city, state, zip);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
