import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { fetchRentEstimate } from '@/lib/apis/rentcast'
import { fetchPropertyValuation } from '@/lib/apis/attom'

// ── POST /api/deals/score ───────────────────────────────────────────────────
// Scores a deal using AI + rule-based metrics. Returns a composite analysis.
// ─────────────────────────────────────────────────────────────────────────────

interface ScoreRequest {
  address: string
  asking_price: number
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  zip?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ScoreRequest = await req.json()

    if (!body.address || !body.asking_price) {
      return NextResponse.json(
        { error: 'Address and asking_price are required' },
        { status: 400 }
      )
    }

    const { address, asking_price } = body

    // ── Fetch external data in parallel ─────────────────────────────────
    const [rentData, valuationData] = await Promise.all([
      fetchRentEstimate(address),
      fetchPropertyValuation(address),
    ])

    const monthlyRent = rentData?.price || 0
    const annualRent = monthlyRent * 12
    const arvEstimate = valuationData?.avm?.amount?.value || 0

    // ── Rule-based score (0-10) ─────────────────────────────────────────
    let ruleScore = 0
    const ruleBreakdown: Record<string, number> = {}

    // 1. Cap rate contribution (weight: 3 points)
    //    Expenses estimated at ~40% of gross rent
    const annualExpenses = annualRent * 0.4
    const noi = annualRent - annualExpenses
    const capRate = asking_price > 0 ? (noi / asking_price) * 100 : 0
    let capRateScore = 0
    if (capRate >= 10) capRateScore = 3
    else if (capRate >= 8) capRateScore = 2.5
    else if (capRate >= 6) capRateScore = 2
    else if (capRate >= 4) capRateScore = 1
    else capRateScore = 0
    ruleScore += capRateScore
    ruleBreakdown.cap_rate = capRateScore

    // 2. Price vs ARV ratio (weight: 3 points)
    //    Great deals are typically <70% of ARV
    let arvScore = 0
    if (arvEstimate > 0) {
      const arvRatio = asking_price / arvEstimate
      if (arvRatio <= 0.65) arvScore = 3
      else if (arvRatio <= 0.70) arvScore = 2.5
      else if (arvRatio <= 0.75) arvScore = 2
      else if (arvRatio <= 0.85) arvScore = 1
      else if (arvRatio <= 0.95) arvScore = 0.5
      else arvScore = 0
    }
    ruleScore += arvScore
    ruleBreakdown.arv_ratio = arvScore

    // 3. Rent-to-price ratio / 1% rule (weight: 2 points)
    let rentRatioScore = 0
    if (monthlyRent > 0 && asking_price > 0) {
      const rentRatio = (monthlyRent / asking_price) * 100
      if (rentRatio >= 1.5) rentRatioScore = 2
      else if (rentRatio >= 1.0) rentRatioScore = 1.5
      else if (rentRatio >= 0.8) rentRatioScore = 1
      else if (rentRatio >= 0.6) rentRatioScore = 0.5
      else rentRatioScore = 0
    }
    ruleScore += rentRatioScore
    ruleBreakdown.rent_to_price = rentRatioScore

    // 4. Market demand / days on market proxy (weight: 2 points)
    //    Use ARV confidence as a proxy for market health
    let marketScore = 0
    if (valuationData?.avm?.amount?.scr) {
      const confidence = valuationData.avm.amount.scr
      if (confidence >= 80) marketScore = 2
      else if (confidence >= 60) marketScore = 1.5
      else if (confidence >= 40) marketScore = 1
      else marketScore = 0.5
    } else {
      // Default moderate score if no data available
      marketScore = 1
    }
    ruleScore += marketScore
    ruleBreakdown.market_demand = marketScore

    // Clamp rule score to 0-10
    ruleScore = Math.min(10, Math.max(0, Math.round(ruleScore * 10) / 10))

    // ── AI scoring via Claude ───────────────────────────────────────────
    let aiScore = ruleScore
    let recommendation: string = 'Negotiate'
    let reasoning: string = ''

    try {
      const systemPrompt = `You are a real estate investment analyst at RKV Consulting. Score this deal on a scale of 1-10 and provide a brief recommendation (Buy/Pass/Negotiate). Be data-driven and concise. Respond ONLY with valid JSON in this exact format: { "score": <number 1-10>, "recommendation": "<Buy|Pass|Negotiate>", "reasoning": "<2-3 sentences>" }`

      const userMessage = `Analyze this investment deal:
- Address: ${address}
- Asking Price: $${asking_price.toLocaleString()}
- Property Type: ${body.property_type || 'unknown'}
- Bedrooms: ${body.bedrooms || 'unknown'}
- Bathrooms: ${body.bathrooms || 'unknown'}
- Sqft: ${body.sqft || 'unknown'}
- Estimated Monthly Rent: $${monthlyRent.toLocaleString()}
- Estimated ARV: $${arvEstimate > 0 ? arvEstimate.toLocaleString() : 'unavailable'}
- Estimated Cap Rate: ${capRate > 0 ? capRate.toFixed(2) + '%' : 'unavailable'}
- Price-to-ARV Ratio: ${arvEstimate > 0 ? ((asking_price / arvEstimate) * 100).toFixed(1) + '%' : 'unavailable'}
- Rent-to-Price Ratio: ${monthlyRent > 0 ? ((monthlyRent / asking_price) * 100).toFixed(3) + '%' : 'unavailable'}
- Rule-Based Score: ${ruleScore}/10`

      const aiResponse = await callClaude(
        [{ role: 'user', content: userMessage }],
        systemPrompt
      )

      const aiText =
        aiResponse?.content?.[0]?.text || aiResponse?.content?.[0]?.value || ''

      // Parse AI JSON response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        aiScore = Math.min(10, Math.max(1, Number(parsed.score) || ruleScore))
        recommendation = parsed.recommendation || 'Negotiate'
        reasoning = parsed.reasoning || ''
      }
    } catch (aiError) {
      console.error('[DealScore] AI scoring failed, using rule-based:', aiError)
      // Fall back to rule-based score
      if (ruleScore >= 7) recommendation = 'Buy'
      else if (ruleScore >= 4) recommendation = 'Negotiate'
      else recommendation = 'Pass'
      reasoning = `Rule-based analysis. Cap rate: ${capRate.toFixed(2)}%. ${arvEstimate > 0 ? `ARV ratio: ${((asking_price / arvEstimate) * 100).toFixed(1)}%.` : ''}`
    }

    // ── Combine rule-based and AI scores (60% AI, 40% rules) ────────────
    const combinedScore = Math.round(((aiScore * 0.6 + ruleScore * 0.4) * 10)) / 10

    return NextResponse.json({
      ai_score: combinedScore,
      rule_score: ruleScore,
      raw_ai_score: aiScore,
      rule_breakdown: ruleBreakdown,
      cap_rate_estimate: Number(capRate.toFixed(2)),
      rent_estimate: monthlyRent,
      arv_estimate: arvEstimate,
      recommendation,
      reasoning,
    })
  } catch (error) {
    console.error('[DealScore POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to score deal' },
      { status: 500 }
    )
  }
}
