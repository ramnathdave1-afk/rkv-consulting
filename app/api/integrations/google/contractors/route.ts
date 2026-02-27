import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// ── Types ───────────────────────────────────────────────────────────────────

interface ContractorResult {
  name: string
  address: string
  phone: string | null
  website: string | null
  rating: number | null
  reviewCount: number
  placeId: string
}

interface PlacesNearbyResult {
  place_id: string
  name: string
  vicinity: string
  rating?: number
  user_ratings_total?: number
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  business_status?: string
  opening_hours?: {
    open_now?: boolean
  }
}

interface PlacesNearbyResponse {
  results: PlacesNearbyResult[]
  status: string
  error_message?: string
}

interface PlaceDetailsResult {
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
}

interface PlaceDetailsResponse {
  result: PlaceDetailsResult
  status: string
  error_message?: string
}

// ── Trade-to-Type Mapping ───────────────────────────────────────────────────

const TRADE_TYPE_MAP: Record<string, string> = {
  plumber: 'plumber',
  plumbing: 'plumber',
  electrician: 'electrician',
  electrical: 'electrician',
  hvac: 'general_contractor',
  'hvac technician': 'general_contractor',
  roofer: 'roofing_contractor',
  roofing: 'roofing_contractor',
  painter: 'painter',
  painting: 'painter',
  locksmith: 'locksmith',
  landscaper: 'general_contractor',
  landscaping: 'general_contractor',
  carpenter: 'general_contractor',
  carpentry: 'general_contractor',
  flooring: 'general_contractor',
  handyman: 'general_contractor',
  general: 'general_contractor',
  contractor: 'general_contractor',
}

function getPlaceType(trade: string): string {
  const normalized = trade.toLowerCase().trim()
  return TRADE_TYPE_MAP[normalized] || 'general_contractor'
}

// ── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { trade, location, radius } = body as {
      trade?: string
      location?: string
      radius?: number
    }

    // Validate required fields
    if (!trade) {
      return NextResponse.json(
        { error: 'trade is required' },
        { status: 400 }
      )
    }

    if (!location) {
      return NextResponse.json(
        { error: 'location is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error('[Google Contractors] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set')
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    // Step 1: Geocode the location to get lat/lng
    const geocodeResponse = await axios.get<{
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>
      status: string
      error_message?: string
    }>('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: location,
        key: apiKey,
      },
    })

    if (
      geocodeResponse.data.status !== 'OK' ||
      !geocodeResponse.data.results.length
    ) {
      console.error(
        '[Google Contractors] Geocoding failed:',
        geocodeResponse.data.status,
        geocodeResponse.data.error_message
      )
      return NextResponse.json(
        { error: `Could not geocode location: ${location}` },
        { status: 400 }
      )
    }

    const { lat, lng } = geocodeResponse.data.results[0].geometry.location
    const searchRadius = Math.min(radius || 16093, 50000) // Default ~10 miles, max 50km
    const placeType = getPlaceType(trade)

    // Step 2: Search for contractors using Nearby Search
    const nearbyResponse = await axios.get<PlacesNearbyResponse>(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${lat},${lng}`,
          radius: searchRadius,
          type: placeType,
          keyword: trade,
          key: apiKey,
        },
      }
    )

    if (nearbyResponse.data.status !== 'OK') {
      // ZERO_RESULTS is not an error, just no matches
      if (nearbyResponse.data.status === 'ZERO_RESULTS') {
        return NextResponse.json({
          contractors: [],
          message: `No ${trade} contractors found near ${location}`,
        })
      }

      console.error(
        '[Google Contractors] Nearby search failed:',
        nearbyResponse.data.status,
        nearbyResponse.data.error_message
      )
      return NextResponse.json(
        { error: 'Google Places search failed' },
        { status: 502 }
      )
    }

    // Filter out permanently closed businesses and limit to top 10
    const places = nearbyResponse.data.results
      .filter((p) => p.business_status !== 'CLOSED_PERMANENTLY')
      .slice(0, 10)

    // Step 3: Fetch details (phone + website) for each result
    const contractors: ContractorResult[] = await Promise.all(
      places.map(async (place) => {
        const details = await fetchPlaceDetails(place.place_id, apiKey)

        return {
          name: place.name,
          address: place.vicinity,
          phone: details?.formatted_phone_number || details?.international_phone_number || null,
          website: details?.website || null,
          rating: place.rating || null,
          reviewCount: place.user_ratings_total || 0,
          placeId: place.place_id,
        }
      })
    )

    return NextResponse.json({
      contractors,
      meta: {
        trade,
        location,
        placeType,
        radius: searchRadius,
        totalResults: contractors.length,
      },
    })
  } catch (error) {
    console.error('[Google Contractors] Error:', error)
    return NextResponse.json(
      { error: 'Failed to search for contractors' },
      { status: 500 }
    )
  }
}

// ── Place Details Helper ────────────────────────────────────────────────────

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlaceDetailsResult | null> {
  try {
    const response = await axios.get<PlaceDetailsResponse>(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'formatted_phone_number,international_phone_number,website',
          key: apiKey,
        },
      }
    )

    if (response.data.status !== 'OK') {
      console.warn(
        `[Google Contractors] Place details failed for ${placeId}:`,
        response.data.status
      )
      return null
    }

    return response.data.result
  } catch (error) {
    console.warn(`[Google Contractors] Failed to fetch details for ${placeId}:`, error)
    return null
  }
}
