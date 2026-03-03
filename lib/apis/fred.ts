import axios, { AxiosError } from 'axios'

const BASE_URL = 'https://api.stlouisfed.org/fred'

const fredClient = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: process.env.FRED_API_KEY || '',
    file_type: 'json',
  },
})

// ── Types ───────────────────────────────────────────────────────────────────

interface FredObservation {
  realtime_start: string
  realtime_end: string
  date: string
  value: string
}

interface FredSeriesResponse {
  realtime_start: string
  realtime_end: string
  observation_start: string
  observation_end: string
  units: string
  output_type: number
  file_type: string
  order_by: string
  sort_order: string
  count: number
  offset: number
  limit: number
  observations: FredObservation[]
}

// ── FRED Series IDs ─────────────────────────────────────────────────────────

const SERIES = {
  MORTGAGE_30YR: 'MORTGAGE30US',
  TREASURY_10Y: 'DGS10', // 10-Year Treasury Constant Maturity Rate (daily, cap rate floor proxy)
  UNEMPLOYMENT_NATIONAL: 'UNRATE',
  CPI: 'CPIAUCSL',
  HOUSING_PERMITS: 'PERMIT', // New private housing units authorized by building permits (monthly)
  EXISTING_HOME_SALES: 'EXHOSLUSM495S', // Existing Home Sales (monthly, NAR)
  // State unemployment uses a pattern like "AZUR" for Arizona, "CAUR" for California, etc.
} as const

// ── Helpers ─────────────────────────────────────────────────────────────────

function handleError(error: unknown, context: string): null {
  if (error instanceof AxiosError) {
    console.error(
      `[FRED] ${context} failed:`,
      error.response?.status,
      error.response?.data || error.message
    )
  } else {
    console.error(`[FRED] ${context} failed:`, error)
  }
  return null
}

/**
 * Fetch the most recent observation for a given FRED series.
 */
async function fetchLatestObservation(
  seriesId: string
): Promise<number | null> {
  try {
    const response = await fredClient.get<FredSeriesResponse>(
      '/series/observations',
      {
        params: {
          series_id: seriesId,
          sort_order: 'desc',
          limit: 1,
        },
      }
    )

    const observations = response.data?.observations
    if (!observations || observations.length === 0) {
      console.error(`[FRED] No observations found for series ${seriesId}`)
      return null
    }

    const value = parseFloat(observations[0].value)
    if (isNaN(value)) {
      console.error(
        `[FRED] Non-numeric value for series ${seriesId}:`,
        observations[0].value
      )
      return null
    }

    return value
  } catch (error) {
    return handleError(error, `fetchLatestObservation(${seriesId})`)
  }
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Fetch the current 30-year fixed mortgage rate (weekly, from Freddie Mac).
 * Series: MORTGAGE30US
 * @returns The rate as a percentage (e.g. 6.85), or null on failure.
 */
export async function fetchMortgageRate(): Promise<number | null> {
  return fetchLatestObservation(SERIES.MORTGAGE_30YR)
}

/**
 * Fetch the unemployment rate.
 * Without a state parameter, returns the national rate (series: UNRATE).
 * With a two-letter state abbreviation, returns the state-level rate
 * (e.g. "AZ" -> series "AZUR", "CA" -> series "CAUR").
 *
 * @param state - Optional two-letter state abbreviation.
 * @returns The unemployment rate as a percentage, or null on failure.
 */
export async function fetchUnemploymentRate(
  state?: string
): Promise<number | null> {
  if (state) {
    const stateCode = state.toUpperCase().trim()
    if (stateCode.length !== 2) {
      console.error(
        '[FRED] fetchUnemploymentRate: state must be a 2-letter abbreviation, got:',
        state
      )
      return null
    }
    const seriesId = `${stateCode}UR`
    return fetchLatestObservation(seriesId)
  }
  return fetchLatestObservation(SERIES.UNEMPLOYMENT_NATIONAL)
}

/**
 * Fetch the latest Consumer Price Index for All Urban Consumers (CPI-U).
 * Series: CPIAUCSL (seasonally adjusted, monthly).
 * @returns The CPI index value, or null on failure.
 */
export async function fetchCPI(): Promise<number | null> {
  return fetchLatestObservation(SERIES.CPI)
}

/**
 * Fetch the 10-Year Treasury Constant Maturity Rate (daily).
 * Key for cap rate floors and cost of capital. Series: DGS10.
 * @returns The rate as a percentage (e.g. 4.25), or null on failure.
 */
export async function fetch10YearTreasury(): Promise<number | null> {
  return fetchLatestObservation(SERIES.TREASURY_10Y)
}

/**
 * Fetch the latest New Private Housing Permits (monthly). Series: PERMIT.
 * @returns Thousands of units, or null on failure.
 */
export async function fetchHousingPermits(): Promise<number | null> {
  return fetchLatestObservation(SERIES.HOUSING_PERMITS)
}

/**
 * Fetch the latest Existing Home Sales (monthly, NAR). Series: EXHOSLUSM495S.
 * @returns Millions of units (SAAR), or null on failure.
 */
export async function fetchExistingHomeSales(): Promise<number | null> {
  return fetchLatestObservation(SERIES.EXISTING_HOME_SALES)
}
