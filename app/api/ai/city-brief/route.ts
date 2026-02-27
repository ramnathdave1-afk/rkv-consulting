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

    const body = await req.json()
    const { city, state, marketData } = body

    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      )
    }

    // Build a data-rich prompt with all available market context
    const dataContext = marketData
      ? `
**Market Snapshot for ${city}, ${state}:**
- Median Home Price: ${marketData.medianPrice ? `$${Number(marketData.medianPrice).toLocaleString()}` : 'N/A'}
- Price Per Sq Ft: ${marketData.pricePerSqft ? `$${marketData.pricePerSqft}` : 'N/A'}
- Median Rent: ${marketData.medianRent ? `$${Number(marketData.medianRent).toLocaleString()}/mo` : 'N/A'}
- Days on Market: ${marketData.daysOnMarket ?? 'N/A'}
- Active Inventory: ${marketData.activeInventory ? Number(marketData.activeInventory).toLocaleString() : 'N/A'}
- Months of Supply: ${marketData.monthsOfSupply ?? 'N/A'}
- YoY Price Change: ${marketData.yoyChange != null ? `${marketData.yoyChange > 0 ? '+' : ''}${marketData.yoyChange}%` : 'N/A'}
- Population Growth: ${marketData.populationGrowth != null ? `${marketData.populationGrowth > 0 ? '+' : ''}${marketData.populationGrowth}%` : 'N/A'}
- Estimated Cap Rate: ${marketData.capRate ? `${marketData.capRate.toFixed(1)}%` : 'N/A'}
- Rent-to-Price Ratio: ${marketData.rentToPriceRatio ? `${marketData.rentToPriceRatio.toFixed(2)}%` : 'N/A'}
${marketData.jobGrowth != null ? `- Job Growth Rate: ${marketData.jobGrowth > 0 ? '+' : ''}${marketData.jobGrowth}%` : ''}
${marketData.medianIncome != null ? `- Median Income: $${Number(marketData.medianIncome).toLocaleString()}` : ''}
${marketData.unemploymentRate != null ? `- Unemployment Rate: ${marketData.unemploymentRate}%` : ''}
`
      : `No specific data available. Use your latest training knowledge about ${city}, ${state}.`

    const systemPrompt = `You are a senior real estate market analyst at RKV Consulting, an AI-powered real estate investment firm. Generate a focused, data-driven market brief for a specific metro area.

Your analysis must be structured with these exact section headings (use ## for headers):

## Market Overview
A 2-3 sentence snapshot of the current market conditions, temperature (hot/warm/cool/cold), and where this market sits in the real estate cycle.

## Investment Thesis
3-4 bullet points on why an investor should or should not allocate capital here. Include specific strategies (buy-and-hold, BRRRR, value-add, etc.) that work best in this market.

## Key Risks
3-4 bullet points on material risks: oversupply, economic concentration, regulatory changes, natural disaster exposure, affordability ceiling, etc.

## Outlook
A 2-3 sentence forward-looking view (6-12 month horizon) with a clear directional call: bullish, neutral, or bearish, with reasoning.

Keep the tone professional but direct. Use specific numbers where available. Be opinionated — investors need conviction, not hedging. Total length: 250-350 words.`

    const messages = [
      {
        role: 'user',
        content: `Generate a focused market investment brief for ${city}, ${state}.

${dataContext}

Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      },
    ]

    const response = await callClaude(messages, systemPrompt)

    if (!response || response.error) {
      console.error('[City Brief] Claude error:', response?.error)
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      )
    }

    const briefContent = response.content?.[0]?.text || response.content

    return NextResponse.json({
      brief: briefContent,
      city,
      state,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[City Brief] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate market brief' },
      { status: 500 }
    )
  }
}
