import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'

// ── Schedule E Categories ────────────────────────────────────────────────────

const SCHEDULE_E_CATEGORIES = [
  'mortgage_interest',
  'property_tax',
  'insurance',
  'repairs',
  'management',
  'utilities',
  'legal',
  'advertising',
  'depreciation',
  'other',
] as const

const SCHEDULE_E_LINES: Record<string, string> = {
  mortgage_interest: 'Line 12 - Mortgage interest paid',
  property_tax: 'Line 16 - Taxes',
  insurance: 'Line 9 - Insurance',
  repairs: 'Line 14 - Repairs',
  management: 'Line 11 - Management fees',
  utilities: 'Line 17 - Utilities',
  legal: 'Line 10 - Legal and other professional fees',
  advertising: 'Line 5 - Advertising',
  depreciation: 'Line 18 - Depreciation expense',
  other: 'Line 19 - Other expenses',
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { description, amount, type } = body

    if (!description) {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a real estate accounting expert for RKV Consulting. Your job is to categorize rental property transactions into IRS Schedule E (Form 1040) categories.

You MUST respond with valid JSON matching this exact structure:
{
  "category": string (one of: ${SCHEDULE_E_CATEGORIES.join(', ')}),
  "scheduleELine": string (the corresponding Schedule E line),
  "confidence": number (0.0 to 1.0, your confidence in the categorization)
}

Category definitions:
- mortgage_interest: Mortgage interest payments on the rental property loan
- property_tax: Property taxes, real estate taxes
- insurance: Homeowner's insurance, landlord insurance, liability insurance
- repairs: Repairs and maintenance (fixing things, not improvements)
- management: Property management fees, management company costs
- utilities: Water, electric, gas, sewer, trash for the property
- legal: Legal fees, eviction costs, attorney fees, accounting fees
- advertising: Marketing, listing fees, tenant advertising
- depreciation: Building depreciation (not land)
- other: Any expense that doesn't fit the above categories

Respond ONLY with the JSON object, no markdown formatting.`

    const messages = [
      {
        role: 'user',
        content: `Categorize this rental property transaction for Schedule E:
Description: ${description}
${amount !== undefined ? `Amount: $${amount}` : ''}
${type ? `Type: ${type}` : ''}`,
      },
    ]

    const response = await callClaude(messages, systemPrompt)

    if (!response || response.error) {
      console.error('[Categorize Transaction] Claude error:', response?.error)
      return NextResponse.json(
        { error: 'AI categorization service temporarily unavailable' },
        { status: 502 }
      )
    }

    // Parse Claude's response
    let result
    try {
      const content = response.content?.[0]?.text || response.content
      result = typeof content === 'string' ? JSON.parse(content) : content
    } catch (parseError) {
      console.error('[Categorize Transaction] Failed to parse Claude response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse categorization result' },
        { status: 500 }
      )
    }

    // Validate the category is one of the allowed values
    if (!SCHEDULE_E_CATEGORIES.includes(result.category)) {
      result.category = 'other'
      result.scheduleELine = SCHEDULE_E_LINES.other
      result.confidence = Math.min(result.confidence || 0.5, 0.5)
    }

    // Ensure scheduleELine matches category
    result.scheduleELine = SCHEDULE_E_LINES[result.category] || result.scheduleELine

    return NextResponse.json({
      category: result.category,
      scheduleELine: result.scheduleELine,
      confidence: result.confidence,
    })
  } catch (error) {
    console.error('[Categorize Transaction] Error:', error)
    return NextResponse.json(
      { error: 'Failed to categorize transaction' },
      { status: 500 }
    )
  }
}
