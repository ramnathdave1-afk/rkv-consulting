import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { fetchRentEstimate } from '@/lib/apis/rentcast'
import { fetchPropertyValuation } from '@/lib/apis/attom'
import type { DealFeedSource } from '@/types'

// ── POST /api/deals/submit ──────────────────────────────────────────────────
// Public endpoint for wholesalers to submit deals. No auth required.
// Deals are scored, and high-quality ones are auto-approved into the feed.
// ─────────────────────────────────────────────────────────────────────────────

interface SubmitRequest {
  submitter_name: string
  submitter_email: string
  submitter_phone?: string
  address: string
  city?: string
  state?: string
  zip?: string
  asking_price: number
  arv?: number
  repair_estimate?: number
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  description?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: SubmitRequest = await req.json()

    // ── Validate required fields ────────────────────────────────────────
    const errors: string[] = []
    if (!body.submitter_name?.trim()) errors.push('submitter_name is required')
    if (!body.submitter_email?.trim()) errors.push('submitter_email is required')
    if (!body.address?.trim()) errors.push('address is required')
    if (!body.asking_price || body.asking_price <= 0)
      errors.push('asking_price must be a positive number')

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.submitter_email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // ── Check for duplicate submission (same address, same email) ───────
    const { data: existingSubmission } = await supabase
      .from('wholesale_submissions')
      .select('id')
      .eq('submitter_email', body.submitter_email.toLowerCase().trim())
      .ilike('address', body.address.trim())
      .maybeSingle()

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'This deal has already been submitted by this email address' },
        { status: 409 }
      )
    }

    // ── Insert into wholesale_submissions ────────────────────────────────
    const submissionData = {
      submitter_name: body.submitter_name.trim(),
      submitter_email: body.submitter_email.toLowerCase().trim(),
      submitter_phone: body.submitter_phone?.trim() || null,
      address: body.address.trim(),
      city: body.city?.trim() || '',
      state: body.state?.trim() || '',
      zip: body.zip?.trim() || '',
      asking_price: body.asking_price,
      arv: body.arv || null,
      repair_estimate: body.repair_estimate || null,
      property_type: body.property_type || 'single_family',
      bedrooms: body.bedrooms || null,
      bathrooms: body.bathrooms || null,
      sqft: body.sqft || null,
      description: body.description?.trim() || null,
      photos: [],
      ai_score: null,
      status: 'pending',
      views: 0,
      saves: 0,
      analysis_runs: 0,
    }

    const { data: submission, error: insertError } = await supabase
      .from('wholesale_submissions')
      .insert(submissionData)
      .select()
      .single()

    if (insertError) {
      console.error('[DealSubmit POST] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit deal' },
        { status: 500 }
      )
    }

    // ── Score the deal inline ───────────────────────────────────────────
    let aiScore: number | null = null
    try {
      aiScore = await scoreDealInline(body)
    } catch (scoreError) {
      console.error('[DealSubmit] Scoring failed:', scoreError)
      // Non-critical: submission is still valid without a score
    }

    // ── Update submission with AI score ─────────────────────────────────
    let finalStatus: 'pending' | 'approved' = 'pending'

    if (aiScore !== null) {
      finalStatus = aiScore >= 6 ? 'approved' : 'pending'

      const { error: updateError } = await supabase
        .from('wholesale_submissions')
        .update({
          ai_score: aiScore,
          status: finalStatus,
          analysis_runs: 1,
        })
        .eq('id', submission.id)

      if (updateError) {
        console.error('[DealSubmit] Score update error:', updateError)
      }
    }

    // ── Auto-insert into feed_deals if approved ─────────────────────────
    if (finalStatus === 'approved') {
      const feedDealData = {
        address: body.address.trim(),
        city: body.city?.trim() || '',
        state: body.state?.trim() || '',
        zip: body.zip?.trim() || '',
        property_type: body.property_type || 'single_family',
        asking_price: body.asking_price,
        bedrooms: body.bedrooms || null,
        bathrooms: body.bathrooms || null,
        sqft: body.sqft || null,
        year_built: null,
        lot_size: null,
        source: 'wholesale' as DealFeedSource,
        source_id: submission.id,
        image_url: null,
        days_on_market: null,
        arv_estimate: body.arv || null,
        rent_estimate: null,
        cap_rate_estimate: null,
        ai_score: aiScore,
        description: body.description?.trim() || null,
        contact_name: body.submitter_name.trim(),
        contact_phone: body.submitter_phone?.trim() || null,
        contact_email: body.submitter_email.toLowerCase().trim(),
        raw_data: null,
      }

      const { error: feedError } = await supabase
        .from('feed_deals')
        .insert(feedDealData)

      if (feedError) {
        console.error('[DealSubmit] Feed insert error:', feedError)
        // Non-critical: submission is still saved
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: submission.id,
        ai_score: aiScore,
        status: finalStatus,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[DealSubmit POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit deal' },
      { status: 500 }
    )
  }
}

// ── Inline deal scoring ─────────────────────────────────────────────────────
// Replicates the core scoring logic from /api/deals/score without requiring auth.

async function scoreDealInline(body: SubmitRequest): Promise<number> {
  const { address, asking_price } = body

  // Fetch external data in parallel
  const [rentData, valuationData] = await Promise.all([
    fetchRentEstimate(address).catch(() => null),
    fetchPropertyValuation(address).catch(() => null),
  ])

  const monthlyRent = rentData?.price || 0
  const annualRent = monthlyRent * 12
  const arvEstimate = valuationData?.avm?.amount?.value || body.arv || 0

  // Rule-based score (0-10)
  let ruleScore = 0

  // Cap rate (3 points)
  const annualExpenses = annualRent * 0.4
  const noi = annualRent - annualExpenses
  const capRate = asking_price > 0 ? (noi / asking_price) * 100 : 0
  if (capRate >= 10) ruleScore += 3
  else if (capRate >= 8) ruleScore += 2.5
  else if (capRate >= 6) ruleScore += 2
  else if (capRate >= 4) ruleScore += 1

  // ARV ratio (3 points)
  if (arvEstimate > 0) {
    const arvRatio = asking_price / arvEstimate
    if (arvRatio <= 0.65) ruleScore += 3
    else if (arvRatio <= 0.70) ruleScore += 2.5
    else if (arvRatio <= 0.75) ruleScore += 2
    else if (arvRatio <= 0.85) ruleScore += 1
    else if (arvRatio <= 0.95) ruleScore += 0.5
  }

  // Rent-to-price ratio (2 points)
  if (monthlyRent > 0 && asking_price > 0) {
    const rentRatio = (monthlyRent / asking_price) * 100
    if (rentRatio >= 1.5) ruleScore += 2
    else if (rentRatio >= 1.0) ruleScore += 1.5
    else if (rentRatio >= 0.8) ruleScore += 1
    else if (rentRatio >= 0.6) ruleScore += 0.5
  }

  // Market / valuation confidence (2 points)
  if (valuationData?.avm?.amount?.scr) {
    const confidence = valuationData.avm.amount.scr
    if (confidence >= 80) ruleScore += 2
    else if (confidence >= 60) ruleScore += 1.5
    else if (confidence >= 40) ruleScore += 1
    else ruleScore += 0.5
  } else {
    ruleScore += 1
  }

  ruleScore = Math.min(10, Math.max(0, Math.round(ruleScore * 10) / 10))

  // AI scoring via Claude
  let aiScore = ruleScore
  try {
    const systemPrompt = `You are a real estate investment analyst. Score this wholesale deal 1-10. Respond ONLY with valid JSON: { "score": <number 1-10> }`

    const userMessage = `Wholesale deal submission:
- Address: ${address}
- Asking: $${asking_price.toLocaleString()}
- Property Type: ${body.property_type || 'unknown'}
- Beds/Baths: ${body.bedrooms || '?'}/${body.bathrooms || '?'}
- Sqft: ${body.sqft || 'unknown'}
- Submitted ARV: ${body.arv ? '$' + body.arv.toLocaleString() : 'not provided'}
- Submitted Repair Estimate: ${body.repair_estimate ? '$' + body.repair_estimate.toLocaleString() : 'not provided'}
- Estimated Monthly Rent: $${monthlyRent.toLocaleString()}
- Estimated ARV (ATTOM): ${arvEstimate > 0 ? '$' + arvEstimate.toLocaleString() : 'unavailable'}
- Cap Rate: ${capRate > 0 ? capRate.toFixed(2) + '%' : 'unavailable'}
- Rule Score: ${ruleScore}/10`

    const aiResponse = await callClaude(
      [{ role: 'user', content: userMessage }],
      systemPrompt
    )

    const aiText =
      aiResponse?.content?.[0]?.text || aiResponse?.content?.[0]?.value || ''
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      aiScore = Math.min(10, Math.max(1, Number(parsed.score) || ruleScore))
    }
  } catch {
    // Fall back to rule-based score
  }

  // Combine: 60% AI, 40% rules
  return Math.round((aiScore * 0.6 + ruleScore * 0.4) * 10) / 10
}
