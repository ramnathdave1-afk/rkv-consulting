import axios, { AxiosError } from 'axios'

const BASE_URL = 'https://api.rentcast.io/v1'

const rentcastClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
    'X-Api-Key': process.env.RENTCAST_API_KEY || '',
  },
})

// ── Response Types ──────────────────────────────────────────────────────────

export interface RentEstimate {
  price: number
  priceRangeLow: number
  priceRangeHigh: number
  county: string
  latitude: number
  longitude: number
  bedrooms: number
  bathrooms: number
  squareFootage: number
  propertyType: string
  listingType: string
  lastSeenDate: string
  correlationId: string
}

export interface PropertyDetails {
  id: string
  formattedAddress: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  zipCode: string
  county: string
  latitude: number
  longitude: number
  propertyType: string
  bedrooms: number
  bathrooms: number
  squareFootage: number
  lotSize: number
  yearBuilt: number
  assessorID: string
  lastSaleDate: string | null
  lastSalePrice: number | null
  ownerOccupied: boolean
  features: Record<string, unknown>
}

export interface MarketStatistics {
  zipCode: string
  city: string
  state: string
  county: string
  averageRent: number
  medianRent: number
  averageRentPerSqft: number
  medianRentPerSqft: number
  averageListPrice: number
  medianListPrice: number
  averagePricePerSqft: number
  medianPricePerSqft: number
  averageDaysOnMarket: number
  totalListings: number
  detailedStats: Record<string, unknown>
}

export interface Comparable {
  id: string
  formattedAddress: string
  city: string
  state: string
  zipCode: string
  latitude: number
  longitude: number
  propertyType: string
  bedrooms: number
  bathrooms: number
  squareFootage: number
  lotSize: number
  yearBuilt: number
  price: number
  listingType: string
  listedDate: string
  lastSeenDate: string
  daysOnMarket: number
  distance: number
  correlation: number
}

// ── Helper ──────────────────────────────────────────────────────────────────

function handleError(error: unknown, context: string): null {
  if (error instanceof AxiosError) {
    console.error(
      `[Rentcast] ${context} failed:`,
      error.response?.status,
      error.response?.data || error.message
    )
  } else {
    console.error(`[Rentcast] ${context} failed:`, error)
  }
  return null
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Fetch a long-term rent estimate for a given property address.
 */
export async function fetchRentEstimate(
  address: string
): Promise<RentEstimate | null> {
  try {
    const response = await rentcastClient.get<RentEstimate>(
      '/avm/rent/long-term',
      {
        params: { address },
      }
    )
    return response.data
  } catch (error) {
    return handleError(error, 'fetchRentEstimate')
  }
}

/**
 * Fetch detailed property information for a given address.
 */
export async function fetchPropertyDetails(
  address: string
): Promise<PropertyDetails | null> {
  try {
    const response = await rentcastClient.get<PropertyDetails[]>(
      '/properties',
      {
        params: { address },
      }
    )
    // The /properties endpoint returns an array; return the first match.
    return response.data?.[0] ?? null
  } catch (error) {
    return handleError(error, 'fetchPropertyDetails')
  }
}

/**
 * Fetch market statistics for a given zip code.
 */
export async function fetchMarketData(
  zipCode: string
): Promise<MarketStatistics | null> {
  try {
    const response = await rentcastClient.get<MarketStatistics>(
      '/market/statistics',
      {
        params: { zipCode },
      }
    )
    return response.data
  } catch (error) {
    return handleError(error, 'fetchMarketData')
  }
}

/**
 * Fetch comparable rental or sale listings near a given address.
 * @param address - The property address to search around.
 * @param radius  - Search radius in miles (default: 1).
 */
export async function fetchComparables(
  address: string,
  radius: number = 1
): Promise<Comparable[] | null> {
  try {
    const response = await rentcastClient.get<Comparable[]>(
      '/avm/rent/comparable',
      {
        params: { address, radius },
      }
    )
    return response.data
  } catch (error) {
    return handleError(error, 'fetchComparables')
  }
}
