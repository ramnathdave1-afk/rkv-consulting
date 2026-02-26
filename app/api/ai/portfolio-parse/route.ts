import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rawText } = await req.json()

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty rawText field' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a data extraction expert for RKV Consulting's real estate platform. Your job is to extract property data from any messy, unstructured text the user pastes in.

The text could be anything: a spreadsheet copy-paste, an email, a listing description, a CSV dump, handwritten notes, a property management report, MLS data, or any free-form text containing property information.

Extract as many properties as you can find and return them as a JSON array. Each property should match this schema as closely as possible:

{
  "address": string (street address),
  "unit": string | null (unit/apt number if applicable),
  "city": string,
  "state": string (2-letter abbreviation),
  "zip": string,
  "property_type": string ("single_family" | "multi_family" | "condo" | "townhouse" | "commercial" | "land" | "mixed_use"),
  "purchase_price": number | null,
  "current_value": number | null,
  "monthly_rent": number | null,
  "bedrooms": number | null,
  "bathrooms": number | null,
  "sqft": number | null,
  "year_built": number | null,
  "lot_size": number | null,
  "mortgage_balance": number | null,
  "mortgage_rate": number | null,
  "mortgage_payment": number | null,
  "insurance_annual": number | null,
  "tax_annual": number | null,
  "hoa_monthly": number | null,
  "status": string ("active" | "vacant" | "under_renovation" | "listed_for_sale" | "sold" | "pending"),
  "notes": string | null (any extra info that doesn't fit other fields)
}

Rules:
- Extract ALL properties found in the text
- If a field is not mentioned or cannot be determined, set it to null
- For property_type, make your best guess based on context (e.g., "house" = "single_family", "duplex"/"triplex"/"quad" = "multi_family")
- For status, default to "active" if not specified
- Parse dollar amounts correctly (handle "$1,234", "1234", "$1.2M", etc.)
- Parse addresses as completely as possible, separating into address, city, state, zip
- If the state is written as a full name, convert to 2-letter abbreviation
- If multiple units/properties are at the same address, create separate entries
- Return ONLY the JSON array, no markdown formatting, no explanation

Example response format:
[
  {
    "address": "123 Main St",
    "unit": null,
    "city": "Phoenix",
    "state": "AZ",
    "zip": "85001",
    "property_type": "single_family",
    "purchase_price": 250000,
    "current_value": 300000,
    "monthly_rent": 1800,
    "bedrooms": 3,
    "bathrooms": 2,
    "sqft": 1500,
    "year_built": 1995,
    "lot_size": null,
    "mortgage_balance": null,
    "mortgage_rate": null,
    "mortgage_payment": null,
    "insurance_annual": null,
    "tax_annual": null,
    "hoa_monthly": null,
    "status": "active",
    "notes": null
  }
]`

    const messages = [
      {
        role: 'user',
        content: `Extract all property data from the following text:\n\n---\n${rawText}\n---`,
      },
    ]

    const response = await callClaude(messages, systemPrompt)

    if (!response || response.error) {
      console.error('[Portfolio Parse] Claude error:', response?.error)
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      )
    }

    // Parse the extracted properties
    let properties
    try {
      const content = response.content?.[0]?.text || response.content
      properties = typeof content === 'string' ? JSON.parse(content) : content
    } catch (parseError) {
      console.error('[Portfolio Parse] Failed to parse Claude response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse extracted property data', raw: response.content?.[0]?.text },
        { status: 500 }
      )
    }

    // Ensure it's an array
    if (!Array.isArray(properties)) {
      properties = [properties]
    }

    return NextResponse.json({ properties })
  } catch (error) {
    console.error('[Portfolio Parse] Error:', error)
    return NextResponse.json(
      { error: 'Failed to parse portfolio data' },
      { status: 500 }
    )
  }
}
