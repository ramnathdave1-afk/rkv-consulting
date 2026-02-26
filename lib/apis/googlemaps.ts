import axios, { AxiosError } from 'axios'
import { Loader } from '@googlemaps/js-api-loader'

// ── Types ───────────────────────────────────────────────────────────────────

export interface GeocodedLocation {
  lat: number
  lng: number
  formattedAddress: string
  placeId: string
}

interface GoogleGeocodingResult {
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
    location_type: string
  }
  place_id: string
  address_components: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
  types: string[]
}

interface GoogleGeocodingResponse {
  results: GoogleGeocodingResult[]
  status: string
  error_message?: string
}

// ── Server-side Geocoding ───────────────────────────────────────────────────

/**
 * Geocode an address to latitude/longitude coordinates using the Google
 * Geocoding API (server-side, via HTTP).
 *
 * @param address - The street address to geocode.
 * @returns An object with lat, lng, formattedAddress, and placeId, or null on failure.
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  if (!apiKey) {
    console.error(
      '[GoogleMaps] geocodeAddress: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'
    )
    return null
  }

  try {
    const response = await axios.get<GoogleGeocodingResponse>(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: apiKey,
        },
      }
    )

    if (response.data.status !== 'OK') {
      console.error(
        '[GoogleMaps] geocodeAddress: API returned status',
        response.data.status,
        response.data.error_message || ''
      )
      return null
    }

    const result = response.data.results[0]
    if (!result) {
      console.error('[GoogleMaps] geocodeAddress: No results found for', address)
      return null
    }

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(
        '[GoogleMaps] geocodeAddress failed:',
        error.response?.status,
        error.response?.data || error.message
      )
    } else {
      console.error('[GoogleMaps] geocodeAddress failed:', error)
    }
    return null
  }
}

/**
 * Geocode with full details including formatted address and place ID.
 */
export async function geocodeAddressDetailed(
  address: string
): Promise<GeocodedLocation | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  if (!apiKey) {
    console.error(
      '[GoogleMaps] geocodeAddressDetailed: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'
    )
    return null
  }

  try {
    const response = await axios.get<GoogleGeocodingResponse>(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: apiKey,
        },
      }
    )

    if (response.data.status !== 'OK') {
      console.error(
        '[GoogleMaps] geocodeAddressDetailed: API returned status',
        response.data.status,
        response.data.error_message || ''
      )
      return null
    }

    const result = response.data.results[0]
    if (!result) {
      return null
    }

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(
        '[GoogleMaps] geocodeAddressDetailed failed:',
        error.response?.status,
        error.response?.data || error.message
      )
    } else {
      console.error('[GoogleMaps] geocodeAddressDetailed failed:', error)
    }
    return null
  }
}

// ── Client-side Loader ──────────────────────────────────────────────────────

let loaderInstance: Loader | null = null

/**
 * Get a singleton instance of the Google Maps JS API Loader.
 * Use this on the client side to load the Maps JavaScript API
 * before rendering map components.
 *
 * Usage:
 * ```ts
 * const loader = getGoogleMapsLoader()
 * const { Map } = await loader.importLibrary('maps')
 * const { Marker } = await loader.importLibrary('marker')
 * ```
 */
export function getGoogleMapsLoader(): Loader {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places', 'geometry', 'marker'],
    })
  }
  return loaderInstance
}
