import axios, { AxiosError } from 'axios'

const rapidApiClient = axios.create({
  baseURL: 'https://zillow-com1.p.rapidapi.com',
  headers: {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
    'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
  },
})

// ── Types ────────────────────────────────────────────────────────────────────

export interface ZillowListing {
  zpid: string
  address: string
  city: string
  state: string
  zipcode: string
  price: number
  bedrooms: number
  bathrooms: number
  livingArea: number
  lotAreaValue: number | null
  yearBuilt: number | null
  homeType: string
  imgSrc: string | null
  daysOnZillow: number
  latitude: number
  longitude: number
  rentZestimate: number | null
  zestimate: number | null
  listingStatus: string
  priceReduction: string | null
}

export interface ZillowSearchResult {
  totalResultCount: number
  results: ZillowListing[]
}

// ── Helper ───────────────────────────────────────────────────────────────────

function handleError(error: unknown, context: string): null {
  if (error instanceof AxiosError) {
    console.error(
      `[Zillow] ${context} failed:`,
      error.response?.status,
      error.response?.data || error.message
    )
  } else {
    console.error(`[Zillow] ${context} failed:`, error)
  }
  return null
}

// ── API Functions ────────────────────────────────────────────────────────────

/**
 * Search Zillow listings for a given location with filters.
 */
export async function searchListings(params: {
  location: string
  status?: string
  price_max?: number
  price_min?: number
  beds_min?: number
  home_type?: string
  sort?: string
  page?: number
}): Promise<ZillowSearchResult | null> {
  if (!process.env.RAPIDAPI_KEY) {
    console.warn('[Zillow] RAPIDAPI_KEY not configured, skipping')
    return null
  }

  try {
    const response = await rapidApiClient.get('/propertyExtendedSearch', {
      params: {
        location: params.location,
        status_type: params.status || 'ForSale',
        price_max: params.price_max,
        price_min: params.price_min,
        beds_min: params.beds_min,
        home_type: params.home_type,
        sort: params.sort || 'Newest',
        page: params.page || 1,
      },
    })

    const data = response.data
    if (!data?.props) return { totalResultCount: 0, results: [] }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: ZillowListing[] = (data.props || []).map((p: any) => ({
      zpid: String(p.zpid),
      address: p.address || p.streetAddress || '',
      city: p.city || '',
      state: p.state || '',
      zipcode: p.zipcode || '',
      price: p.price || 0,
      bedrooms: p.bedrooms || 0,
      bathrooms: p.bathrooms || 0,
      livingArea: p.livingArea || 0,
      lotAreaValue: p.lotAreaValue || null,
      yearBuilt: p.yearBuilt || null,
      homeType: p.homeType || 'unknown',
      imgSrc: p.imgSrc || null,
      daysOnZillow: p.daysOnZillow || 0,
      latitude: p.latitude || 0,
      longitude: p.longitude || 0,
      rentZestimate: p.rentZestimate || null,
      zestimate: p.zestimate || null,
      listingStatus: p.listingStatus || 'FOR_SALE',
      priceReduction: p.priceReduction || null,
    }))

    return {
      totalResultCount: data.totalResultCount || results.length,
      results,
    }
  } catch (error) {
    return handleError(error, 'searchListings')
  }
}

/**
 * Fetch detailed property info by Zillow Property ID.
 */
export async function getPropertyDetails(zpid: string): Promise<Record<string, unknown> | null> {
  if (!process.env.RAPIDAPI_KEY) return null

  try {
    const response = await rapidApiClient.get('/property', {
      params: { zpid },
    })
    return response.data
  } catch (error) {
    return handleError(error, 'getPropertyDetails')
  }
}
