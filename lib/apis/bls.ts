import axios, { AxiosError } from 'axios'

const BASE_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'

// ── Types ───────────────────────────────────────────────────────────────────

interface BLSSeriesData {
  year: string
  period: string
  periodName: string
  value: string
  footnotes: Array<{ code: string; text: string }>
}

interface BLSSeries {
  seriesID: string
  data: BLSSeriesData[]
}

interface BLSResponse {
  status: string
  responseTime: number
  message: string[]
  Results?: {
    series: BLSSeries[]
  }
}

export interface JobGrowthResult {
  currentEmployment: number
  previousYear: number
  growthRate: number
  series: string
}

export interface MedianIncomeResult {
  medianIncome: number
  percentChange: number
}

export interface UnemploymentRateResult {
  rate: number
  previousRate: number
  change: number
}

// ── BLS Area Code Mapping ───────────────────────────────────────────────────
// Maps common metro area names to BLS FIPS-based area codes used in series IDs.
// CES (nonfarm payroll) uses MSA codes; LAUS (unemployment) uses state FIPS codes.

const METRO_AREA_CODES: Record<string, string> = {
  // Major MSA codes for CES nonfarm payroll series
  'new york': '35620',
  'nyc': '35620',
  'los angeles': '31080',
  'la': '31080',
  'chicago': '16980',
  'dallas': '19100',
  'houston': '26420',
  'washington dc': '47900',
  'dc': '47900',
  'philadelphia': '37980',
  'miami': '33100',
  'atlanta': '12060',
  'boston': '14460',
  'san francisco': '41860',
  'sf': '41860',
  'phoenix': '38060',
  'riverside': '40140',
  'detroit': '19820',
  'seattle': '42660',
  'minneapolis': '33460',
  'san diego': '41740',
  'tampa': '45300',
  'denver': '19740',
  'st louis': '41180',
  'baltimore': '12580',
  'orlando': '36740',
  'charlotte': '16740',
  'san antonio': '41700',
  'portland': '38900',
  'sacramento': '40900',
  'pittsburgh': '38300',
  'austin': '12420',
  'las vegas': '29820',
  'cincinnati': '17140',
  'kansas city': '28140',
  'columbus': '18140',
  'indianapolis': '26900',
  'cleveland': '17460',
  'nashville': '34980',
  'raleigh': '39580',
  'salt lake city': '41620',
}

// State FIPS codes for LAUS (Local Area Unemployment Statistics)
const STATE_FIPS_CODES: Record<string, string> = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
  'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
  'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
  'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
  'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
  'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
  'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
  'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56',
  'DC': '11',
}

// OEWS area codes for wage data (same MSA codes but formatted differently)
const OEWS_AREA_CODES: Record<string, string> = {
  'new york': '0035620',
  'nyc': '0035620',
  'los angeles': '0031080',
  'la': '0031080',
  'chicago': '0016980',
  'dallas': '0019100',
  'houston': '0026420',
  'washington dc': '0047900',
  'dc': '0047900',
  'philadelphia': '0037980',
  'miami': '0033100',
  'atlanta': '0012060',
  'boston': '0014460',
  'san francisco': '0041860',
  'sf': '0041860',
  'phoenix': '0038060',
  'riverside': '0040140',
  'detroit': '0019820',
  'seattle': '0042660',
  'minneapolis': '0033460',
  'san diego': '0041740',
  'tampa': '0045300',
  'denver': '0019740',
  'st louis': '0041180',
  'baltimore': '0012580',
  'orlando': '0036740',
  'charlotte': '0016740',
  'san antonio': '0041700',
  'portland': '0038900',
  'sacramento': '0040900',
  'pittsburgh': '0038300',
  'austin': '0012420',
  'las vegas': '0029820',
  'cincinnati': '0017140',
  'kansas city': '0028140',
  'columbus': '0018140',
  'indianapolis': '0026900',
  'cleveland': '0017460',
  'nashville': '0034980',
  'raleigh': '0039580',
  'salt lake city': '0041620',
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a city name (case-insensitive) to a BLS metro area code.
 * Returns the MSA code string or null if the city is not recognized.
 */
export function getMetroAreaCode(city: string): string | null {
  const normalized = city.toLowerCase().trim()
  return METRO_AREA_CODES[normalized] ?? null
}

/**
 * Map a city name to an OEWS-formatted area code for wage data.
 */
export function getOEWSAreaCode(city: string): string | null {
  const normalized = city.toLowerCase().trim()
  return OEWS_AREA_CODES[normalized] ?? null
}

/**
 * Map a two-letter state abbreviation to a FIPS code.
 */
export function getStateFipsCode(stateCode: string): string | null {
  const normalized = stateCode.toUpperCase().trim()
  return STATE_FIPS_CODES[normalized] ?? null
}

function handleError(error: unknown, context: string): null {
  if (error instanceof AxiosError) {
    console.error(
      `[BLS] ${context} failed:`,
      error.response?.status,
      error.response?.data || error.message
    )
  } else {
    console.error(`[BLS] ${context} failed:`, error)
  }
  return null
}

/**
 * Fetch time series data from the BLS public API.
 * Uses v2 endpoint which supports an optional API key for higher request limits.
 */
async function fetchBLSSeries(
  seriesIds: string[],
  startYear?: number,
  endYear?: number
): Promise<BLSSeries[] | null> {
  try {
    const currentYear = new Date().getFullYear()
    const payload: Record<string, unknown> = {
      seriesid: seriesIds,
      startyear: String(startYear ?? currentYear - 1),
      endyear: String(endYear ?? currentYear),
    }

    // Include API key if available (raises daily request limit from 25 to 500)
    const apiKey = process.env.BLS_API_KEY
    if (apiKey) {
      payload.registrationkey = apiKey
    }

    const response = await axios.post<BLSResponse>(BASE_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    })

    if (response.data.status !== 'REQUEST_SUCCEEDED') {
      console.error(
        '[BLS] API request did not succeed:',
        response.data.status,
        response.data.message
      )
      return null
    }

    return response.data.Results?.series ?? null
  } catch (error) {
    return handleError(error, `fetchBLSSeries(${seriesIds.join(', ')})`)
  }
}

/**
 * Parse a BLS data value string to a number.
 * Returns null if the value is missing or non-numeric.
 */
function parseValue(value: string): number | null {
  if (!value || value === '-') return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Fetch nonfarm payroll employment data for a metro area (CES series).
 *
 * CES series ID format: SMU + state FIPS + area code + industry code + data type
 * Example: SMU06316800000000001 (Los Angeles, total nonfarm, all employees)
 *
 * @param metro - City name (e.g. "Phoenix", "Los Angeles")
 * @returns Employment growth data or null on failure.
 */
export async function getJobGrowth(
  metro: string
): Promise<JobGrowthResult | null> {
  try {
    const areaCode = getMetroAreaCode(metro)
    if (!areaCode) {
      console.error(
        `[BLS] getJobGrowth: unrecognized metro area "${metro}". Use one of: ${Object.keys(METRO_AREA_CODES).join(', ')}`
      )
      return null
    }

    // Build CES series ID for total nonfarm employment (all employees)
    // Format: SMU + 2-digit state FIPS (from area) + 5-digit MSA + 00000000 (total nonfarm) + 01 (all employees)
    const seriesId = `SMU${areaCode.substring(0, 2)}${areaCode}0000000001`

    const currentYear = new Date().getFullYear()
    const series = await fetchBLSSeries([seriesId], currentYear - 2, currentYear)

    if (!series || series.length === 0 || !series[0].data || series[0].data.length === 0) {
      console.error(`[BLS] getJobGrowth: no data returned for series ${seriesId}`)
      return null
    }

    const data = series[0].data

    // Data comes sorted newest first. Find the most recent month and same month previous year.
    const latest = data[0]
    const latestValue = parseValue(latest.value)

    if (latestValue === null) {
      console.error('[BLS] getJobGrowth: could not parse latest value')
      return null
    }

    // Find the corresponding month from the previous year
    const previousYearEntry = data.find(
      (d) =>
        d.period === latest.period &&
        String(parseInt(d.year)) === String(parseInt(latest.year) - 1)
    )

    const previousYearValue = previousYearEntry
      ? parseValue(previousYearEntry.value)
      : null

    const growthRate =
      previousYearValue !== null && previousYearValue !== 0
        ? ((latestValue - previousYearValue) / previousYearValue) * 100
        : 0

    return {
      currentEmployment: latestValue * 1000, // BLS reports in thousands
      previousYear: previousYearValue !== null ? previousYearValue * 1000 : 0,
      growthRate: Math.round(growthRate * 100) / 100,
      series: seriesId,
    }
  } catch (error) {
    return handleError(error, `getJobGrowth(${metro})`)
  }
}

/**
 * Fetch median wage data for a metro area using OEWS series.
 *
 * OEWS series ID format: OEUM + area code + 000000 (all occupations) + 04 (median hourly wage)
 * We convert hourly to annual by multiplying by 2080 (40hrs/week * 52 weeks).
 *
 * @param metro - City name (e.g. "Phoenix", "San Francisco")
 * @returns Median income data or null on failure.
 */
export async function getMedianIncome(
  metro: string
): Promise<MedianIncomeResult | null> {
  try {
    const areaCode = getOEWSAreaCode(metro)
    if (!areaCode) {
      console.error(
        `[BLS] getMedianIncome: unrecognized metro area "${metro}". Use one of: ${Object.keys(OEWS_AREA_CODES).join(', ')}`
      )
      return null
    }

    // OEWS series: OEUM + 7-digit area code + 000000 (all occupations) + 04 (median hourly wage)
    const seriesId = `OEUM${areaCode}00000004`

    const currentYear = new Date().getFullYear()
    // OEWS data is annual, typically released with a lag. Request two years back.
    const series = await fetchBLSSeries([seriesId], currentYear - 3, currentYear)

    if (!series || series.length === 0 || !series[0].data || series[0].data.length === 0) {
      console.error(`[BLS] getMedianIncome: no data returned for series ${seriesId}`)
      return null
    }

    const data = series[0].data

    // OEWS data is annual (period "A01"). Sort by year descending.
    const sorted = [...data].sort(
      (a, b) => parseInt(b.year) - parseInt(a.year)
    )

    const latest = sorted[0]
    const latestValue = parseValue(latest.value)

    if (latestValue === null) {
      console.error('[BLS] getMedianIncome: could not parse latest value')
      return null
    }

    // Convert hourly median wage to annual income
    const annualIncome = Math.round(latestValue * 2080)

    // Find previous year for percent change
    const previous = sorted.find(
      (d) => parseInt(d.year) === parseInt(latest.year) - 1
    )
    const previousValue = previous ? parseValue(previous.value) : null
    const previousAnnual = previousValue !== null ? previousValue * 2080 : null

    const percentChange =
      previousAnnual !== null && previousAnnual !== 0
        ? ((annualIncome - previousAnnual) / previousAnnual) * 100
        : 0

    return {
      medianIncome: annualIncome,
      percentChange: Math.round(percentChange * 100) / 100,
    }
  } catch (error) {
    return handleError(error, `getMedianIncome(${metro})`)
  }
}

/**
 * Fetch the unemployment rate for a state using LAUS (Local Area Unemployment Statistics).
 *
 * LAUS series ID format: LAUST + state FIPS (2 digits) + 0000000000003
 *   - The "03" data type = unemployment rate
 *
 * @param stateCode - Two-letter state abbreviation (e.g. "AZ", "CA")
 * @returns Unemployment rate data or null on failure.
 */
export async function getUnemploymentRate(
  stateCode: string
): Promise<UnemploymentRateResult | null> {
  try {
    const fipsCode = getStateFipsCode(stateCode)
    if (!fipsCode) {
      console.error(
        `[BLS] getUnemploymentRate: unrecognized state code "${stateCode}". Use a 2-letter abbreviation.`
      )
      return null
    }

    // LAUS series for state unemployment rate
    const seriesId = `LAUST${fipsCode}0000000000003`

    const currentYear = new Date().getFullYear()
    const series = await fetchBLSSeries([seriesId], currentYear - 2, currentYear)

    if (!series || series.length === 0 || !series[0].data || series[0].data.length === 0) {
      console.error(`[BLS] getUnemploymentRate: no data returned for series ${seriesId}`)
      return null
    }

    const data = series[0].data

    // Data comes sorted newest first
    const latest = data[0]
    const currentRate = parseValue(latest.value)

    if (currentRate === null) {
      console.error('[BLS] getUnemploymentRate: could not parse latest value')
      return null
    }

    // Find the same month from the previous year
    const previousEntry = data.find(
      (d) =>
        d.period === latest.period &&
        String(parseInt(d.year)) === String(parseInt(latest.year) - 1)
    )

    const previousRate = previousEntry ? parseValue(previousEntry.value) : null

    return {
      rate: currentRate,
      previousRate: previousRate ?? 0,
      change:
        previousRate !== null
          ? Math.round((currentRate - previousRate) * 100) / 100
          : 0,
    }
  } catch (error) {
    return handleError(error, `getUnemploymentRate(${stateCode})`)
  }
}
