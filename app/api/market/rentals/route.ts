import { NextRequest, NextResponse } from 'next/server';
import { getRentalRates } from '@/lib/serpapi/client';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const zip = searchParams.get('zip');
  const bedrooms = searchParams.get('bedrooms');

  if (!city || !state || !zip) {
    return NextResponse.json({ error: 'city, state, zip are required' }, { status: 400 });
  }

  try {
    const data = await getRentalRates(city, state, zip, bedrooms ? parseInt(bedrooms) : undefined);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
