import axios, { AxiosError } from 'axios'

const BASE_URL =
  'https://api.gateway.attomdata.com/propertyapi/v1.0.0'

const attomClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
    apikey: process.env.ATTOM_API_KEY || '',
  },
})

// ── Response Types ──────────────────────────────────────────────────────────

export interface AttomAddress {
  country: string
  countrySubd: string
  line1: string
  line2: string
  locality: string
  matchCode: string
  oneLine: string
  postal1: string
  postal2: string
  postal3: string
}

export interface AttomLocation {
  accuracy: string
  elevation: number
  latitude: string
  longitude: string
  distance: number
  geoid: string
}

export interface AttomPropertyDetail {
  identifier: {
    Id: number
    fips: string
    apn: string
    attomId: number
  }
  lot: {
    lotNum: string
    lotSize1: number
    lotSize2: number
    poolType: string
  }
  area: {
    blockNum: string
    countrySecSubd: string
    countyUse1: string
    munCode: string
    munName: string
    srvyRange: string
    srvySection: string
    srvyTownship: string
    taxCodeArea: string
    universalSize: number
  }
  address: AttomAddress
  location: AttomLocation
  summary: {
    absenteeInd: string
    propClass: string
    propSubType: string
    propType: string
    yearBuilt: number
    propLandUse: string
    propIndicator: string
    legal1: string
  }
  utilities: Record<string, unknown>
  building: {
    size: {
      bldgSize: number
      grossSize: number
      grossSizeAdjusted: number
      groundFloorSize: number
      livingSize: number
      sizeInd: string
      universalSize: number
    }
    rooms: {
      bathFixtures: number
      bathsFull: number
      bathsHalf: number
      bathsTotal: number
      beds: number
      roomsTotal: number
    }
    interior: {
      bsmtSize: number
      bsmtType: string
      fplcCount: number
      fplcInd: string
      fplcType: string
    }
    construction: {
      condition: string
      constructionType: string
      foundationType: string
      frameType: string
      roofCover: string
      roofShape: string
      wallType: string
    }
    parking: {
      garageType: string
      prkgSize: number
      prkgSpaces: string
      prkgType: string
    }
    summary: {
      archStyle: string
      bldgType: string
      bldgsNum: number
      imprType: string
      levels: number
      quality: string
      storyDesc: string
      unitsCount: string
      yearBuiltEffective: number
    }
  }
  vintage: Record<string, unknown>
}

export interface AttomValuation {
  identifier: {
    Id: number
    fips: string
    apn: string
    attomId: number
  }
  address: AttomAddress
  location: AttomLocation
  avm: {
    amount: {
      scr: number
      value: number
      high: number
      low: number
      valueRange: number
    }
    calculations: {
      perSizeUnit: number
      ratioTaxAmt: number
      ratioTaxValue: number
      monthlyChgPct: number
      monthlyChgValue: number
      rangePctOfValue: number
    }
    condition: {
      avmChange: boolean
      avmPublishDate: string
    }
    eventDate: string
  }
}

export interface AttomSaleComparable {
  identifier: {
    Id: number
    fips: string
    apn: string
    attomId: number
  }
  address: AttomAddress
  location: AttomLocation
  sale: {
    saleSearchDate: string
    saleTransDate: string
    amount: {
      saleAmt: number
      saleCode: string
      saleRecDate: string
      saleDisclosureType: number
      saleDocNum: string
      saleDocType: string
      saleTransType: string
    }
    calculation: {
      pricePerBed: number
      pricePerSizeUnit: number
    }
  }
  building: {
    size: { universalSize: number }
    rooms: { bathsTotal: number; beds: number }
    summary: { yearBuilt: number }
  }
  lot: { lotSize1: number; lotSize2: number }
  vintage: Record<string, unknown>
}

export interface AttomAssessment {
  identifier: {
    Id: number
    fips: string
    apn: string
    attomId: number
  }
  address: AttomAddress
  location: AttomLocation
  assessment: {
    assessed: {
      assdImprValue: number
      assdLandValue: number
      assdTtlValue: number
    }
    market: {
      mktImprValue: number
      mktLandValue: number
      mktTtlValue: number
    }
    tax: {
      taxAmt: number
      taxPerSizeUnit: number
      taxYear: number
    }
    improvementPercent: number
  }
}

// ── Helper ──────────────────────────────────────────────────────────────────

function handleError(error: unknown, context: string): null {
  if (error instanceof AxiosError) {
    console.error(
      `[ATTOM] ${context} failed:`,
      error.response?.status,
      error.response?.data || error.message
    )
  } else {
    console.error(`[ATTOM] ${context} failed:`, error)
  }
  return null
}

/**
 * Parse a single-line address into address1 and address2 for ATTOM's API.
 * ATTOM expects address1 = street, address2 = city, state zip.
 */
function parseAddress(address: string): {
  address1: string
  address2: string
} {
  // Try splitting on the last comma before state/zip (e.g. "123 Main St, Phoenix, AZ 85001")
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length >= 3) {
    return {
      address1: parts[0],
      address2: parts.slice(1).join(', '),
    }
  }
  if (parts.length === 2) {
    return {
      address1: parts[0],
      address2: parts[1],
    }
  }
  // Fallback: send the whole thing as address1
  return { address1: address, address2: '' }
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Fetch detailed property information from ATTOM.
 */
export async function fetchPropertyDetail(
  address: string
): Promise<AttomPropertyDetail | null> {
  try {
    const { address1, address2 } = parseAddress(address)
    const response = await attomClient.get('/property/detail', {
      params: { address1, address2 },
    })
    const property = response.data?.property?.[0]
    return property ?? null
  } catch (error) {
    return handleError(error, 'fetchPropertyDetail')
  }
}

/**
 * Fetch Automated Valuation Model (AVM) data for a property.
 */
export async function fetchPropertyValuation(
  address: string
): Promise<AttomValuation | null> {
  try {
    const { address1, address2 } = parseAddress(address)
    const response = await attomClient.get('/attomavm/detail', {
      params: { address1, address2 },
    })
    const property = response.data?.property?.[0]
    return property ?? null
  } catch (error) {
    return handleError(error, 'fetchPropertyValuation')
  }
}

/**
 * Fetch recent comparable sales near a given property address.
 */
export async function fetchSalesComparables(
  address: string
): Promise<AttomSaleComparable[] | null> {
  try {
    const { address1, address2 } = parseAddress(address)
    const response = await attomClient.get('/sale/comparables', {
      params: { address1, address2 },
    })
    const properties = response.data?.property
    return properties ?? null
  } catch (error) {
    return handleError(error, 'fetchSalesComparables')
  }
}

/**
 * Fetch tax assessment data for a property.
 */
export async function fetchAssessment(
  address: string
): Promise<AttomAssessment | null> {
  try {
    const { address1, address2 } = parseAddress(address)
    const response = await attomClient.get('/assessment/detail', {
      params: { address1, address2 },
    })
    const property = response.data?.property?.[0]
    return property ?? null
  } catch (error) {
    return handleError(error, 'fetchAssessment')
  }
}
