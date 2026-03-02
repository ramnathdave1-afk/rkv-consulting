import axios, { AxiosError } from 'axios'

// Zillow Real Estate API on RapidAPI (host: zillow-real-estate-api.p.rapidapi.com).
// Set RAPIDAPI_KEY in Vercel. Override host with RAPIDAPI_ZILLOW_HOST if needed.
const ZILLOW_HOST =
  process.env.RAPIDAPI_ZILLOW_HOST || 'zillow-real-estate-api.p.rapidapi.com'

function getZillowClient() {
  return axios.create({
    baseURL: `https://${ZILLOW_HOST}`,
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
      'X-RapidAPI-Host': ZILLOW_HOST,
    },
  })
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeListing(p: any): ZillowListing {
  return {
    zpid: String(p.zpid ?? p.zillowId ?? p.id ?? ''),
    address: p.address ?? p.streetAddress ?? p.line ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    zipcode: p.zipcode ?? p.zipCode ?? p.postalCode ?? '',
    price: Number(p.price ?? p.listPrice ?? p.amount ?? 0),
    bedrooms: Number(p.bedrooms ?? p.beds ?? 0),
    bathrooms: Number(p.bathrooms ?? p.baths ?? 0),
    livingArea: Number(p.livingArea ?? p.sqft ?? p.squareFootage ?? 0),
    lotAreaValue: p.lotAreaValue ?? p.lotSize ?? null,
    yearBuilt: p.yearBuilt ?? p.yearBuilt ?? null,
    homeType: p.homeType ?? p.propertyType ?? p.type ?? 'unknown',
    imgSrc: p.imgSrc ?? p.imageUrl ?? p.photo ?? p.img ?? null,
    daysOnZillow: Number(p.daysOnZillow ?? p.daysOnMarket ?? 0),
    latitude: Number(p.latitude ?? p.lat ?? 0),
    longitude: Number(p.longitude ?? p.lng ?? p.lon ?? 0),
    rentZestimate: p.rentZestimate ?? p.rentEstimate ?? null,
    zestimate: p.zestimate ?? p.estimatedValue ?? null,
    listingStatus: p.listingStatus ?? 'FOR_SALE',
    priceReduction: p.priceReduction ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractResults(data: any): ZillowListing[] {
  const raw =
    data?.props ??
    data?.results ??
    data?.searchResults ??
    data?.listings ??
    data?.data?.results ??
    data?.data?.props ??
    []
  const arr = Array.isArray(raw) ? raw : raw?.result ?? []
  return arr.map(normalizeListing).filter((r: ZillowListing) => r.zpid && r.address)
}

// ── API Functions ────────────────────────────────────────────────────────────

/**
 * Search Zillow listings for a location. Tries propertyExtendedSearch first,
 * then getSearchResults-style endpoints so it works with Collector and others.
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

  const client = getZillowClient()

  // 1) Try /v1/ listing search (zillow-real-estate-api.p.rapidapi.com)
  try {
    const r = await client.get('/v1/listings', {
      params: {
        location: params.location,
        type: params.status === 'ForRent' ? 'rent' : 'sale',
        page: params.page || 1,
      },
    })
    const results = extractResults(r.data)
    if (results.length > 0) {
      return {
        totalResultCount: r.data?.totalCount ?? r.data?.totalResultCount ?? results.length,
        results,
      }
    }
  } catch (err) {
    const status = err instanceof AxiosError ? err.response?.status : 0
    if (status !== 404 && status !== 501) {
      return handleError(err, 'searchListings (/v1/listings)')
    }
  }

  try {
    const r = await client.get('/v1/search', {
      params: {
        q: params.location,
        type: params.status === 'ForRent' ? 'rent' : 'sale',
        page: params.page || 1,
      },
    })
    const results = extractResults(r.data)
    if (results.length > 0) {
      return {
        totalResultCount: r.data?.totalCount ?? results.length,
        results,
      }
    }
  } catch {
    // ignore
  }

  // 2) Try propertyExtendedSearch (legacy style)
  try {
    const r = await client.get('/propertyExtendedSearch', {
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
    const results = extractResults(r.data)
    if (results.length > 0) {
      return {
        totalResultCount: r.data?.totalResultCount ?? results.length,
        results,
      }
    }
  } catch (err) {
    const status = err instanceof AxiosError ? err.response?.status : 0
    if (status !== 404 && status !== 501) {
      return handleError(err, 'searchListings (propertyExtendedSearch)')
    }
  }

  // 2) Try getSearchResults / search with citystatezip (Collector-style)
  try {
    const r = await client.get('/getSearchResults', {
      params: {
        citystatezip: params.location,
        output: 'json',
      },
    })
    const results = extractResults(r.data)
    return {
      totalResultCount: results.length,
      results,
    }
  } catch {
    // ignore
  }

  try {
    const r = await client.get('/search', {
      params: {
        location: params.location,
        status: params.status || 'ForSale',
        output: 'json',
      },
    })
    const results = extractResults(r.data)
    return {
      totalResultCount: results.length,
      results,
    }
  } catch {
    // ignore
  }

  return { totalResultCount: 0, results: [] }
}

/**
 * Fetch detailed property info by Zillow Property ID.
 */
export async function getPropertyDetails(zpid: string): Promise<Record<string, unknown> | null> {
  if (!process.env.RAPIDAPI_KEY) return null

  const client = getZillowClient()

  const pathsWithZpid = [`/v1/property/${zpid}`, `/v1/propertyDetails/${zpid}`]
  for (const path of pathsWithZpid) {
    try {
      const response = await client.get(path)
      if (response.data) return response.data
    } catch {
      // try next
    }
  }
  const pathsWithParam = ['/v1/property', '/v1/propertyDetails', '/property', '/getPropertyDetails', '/propertyDetails']
  for (const path of pathsWithParam) {
    try {
      const response = await client.get(path, { params: { zpid } })
      if (response.data) return response.data
    } catch {
      // try next
    }
  }
  return null
}
