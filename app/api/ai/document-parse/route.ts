import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'

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
    const { content, fileName } = body

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are a document analysis expert for RKV Consulting, a real estate investment firm. Your job is to detect the type of document and extract key structured data from it.

You MUST respond with valid JSON matching this exact structure:
{
  "detectedType": string (one of: "lease", "insurance", "receipt", "invoice", "tax_document", "inspection_report", "closing_statement", "unknown"),
  "extractedData": object (varies by document type, see below)
}

For each document type, extract the following fields (use null for any field you cannot determine):

LEASE:
{
  "tenant_name": string,
  "landlord_name": string,
  "property_address": string,
  "start_date": string (ISO date),
  "end_date": string (ISO date),
  "monthly_rent": number,
  "security_deposit": number,
  "lease_type": string ("fixed" | "month_to_month"),
  "late_fee": number | null,
  "pet_deposit": number | null,
  "utilities_included": string[]
}

INSURANCE:
{
  "provider": string,
  "policy_number": string,
  "coverage_type": string,
  "coverage_amount": number,
  "premium": number,
  "deductible": number,
  "effective_date": string (ISO date),
  "expiry_date": string (ISO date),
  "property_address": string
}

RECEIPT:
{
  "vendor": string,
  "amount": number,
  "date": string (ISO date),
  "category": string,
  "description": string,
  "payment_method": string | null,
  "property_address": string | null
}

INVOICE:
{
  "vendor": string,
  "invoice_number": string,
  "amount": number,
  "date": string (ISO date),
  "due_date": string (ISO date),
  "description": string,
  "line_items": [{ "description": string, "amount": number }]
}

TAX_DOCUMENT:
{
  "document_type": string,
  "tax_year": number,
  "property_address": string,
  "assessed_value": number | null,
  "tax_amount": number | null
}

INSPECTION_REPORT:
{
  "inspector_name": string,
  "inspection_date": string (ISO date),
  "property_address": string,
  "overall_condition": string,
  "issues_found": [{ "area": string, "issue": string, "severity": string }]
}

CLOSING_STATEMENT:
{
  "property_address": string,
  "closing_date": string (ISO date),
  "purchase_price": number,
  "buyer_name": string,
  "seller_name": string,
  "closing_costs": number
}

For "unknown" type, extract any key-value pairs you can identify from the document.

Respond ONLY with the JSON object, no markdown formatting.`

    const messages = [
      {
        role: 'user',
        content: `Parse and extract data from this document${fileName ? ` (filename: ${fileName})` : ''}:\n\n${content}`,
      },
    ]

    const response = await callClaude(messages, systemPrompt)

    if (!response || response.error) {
      console.error('[Document Parse] Claude error:', response?.error)
      return NextResponse.json(
        { error: 'AI document parsing service temporarily unavailable' },
        { status: 502 }
      )
    }

    // Parse Claude's response
    let result
    try {
      const text = response.content?.[0]?.text || response.content
      result = typeof text === 'string' ? JSON.parse(text) : text
    } catch (parseError) {
      console.error('[Document Parse] Failed to parse Claude response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse document analysis result' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      detectedType: result.detectedType,
      extractedData: result.extractedData,
    })
  } catch (error) {
    console.error('[Document Parse] Error:', error)
    return NextResponse.json(
      { error: 'Failed to parse document' },
      { status: 500 }
    )
  }
}
