import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'latitude and longitude are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          latlng: `${latitude},${longitude}`,
          key: apiKey,
        },
      }
    );

    if (response.data.status !== 'OK' || !response.data.results?.length) {
      return NextResponse.json(
        { error: 'No results from reverse geocoding' },
        { status: 404 }
      );
    }

    const result = response.data.results[0];
    const components = result.address_components || [];

    let city = '';
    let state = '';
    let zip = '';

    for (const component of components) {
      const types: string[] = component.types;
      if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      } else if (types.includes('postal_code')) {
        zip = component.long_name;
      }
    }

    return NextResponse.json({
      city,
      state,
      zip,
      formattedAddress: result.formatted_address || '',
    });
  } catch (error) {
    console.error('[Geocode Reverse] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode' },
      { status: 500 }
    );
  }
}
