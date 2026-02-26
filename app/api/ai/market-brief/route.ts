import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { PLANS, type PlanName } from '@/lib/stripe/plans'

export async function POST(_req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check subscription for marketIntelligence feature
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    if (!plan.features.marketIntelligence) {
      return NextResponse.json(
        { error: 'Market Intelligence is not available on your current plan. Upgrade to Pro or Elite.' },
        { status: 403 }
      )
    }

    // Get user's watched markets
    const { data: watchedMarkets } = await supabase
      .from('watched_markets')
      .select('*')
      .eq('user_id', user.id)

    if (!watchedMarkets || watchedMarkets.length === 0) {
      return NextResponse.json(
        { error: 'No watched markets found. Add markets to your watchlist first.' },
        { status: 400 }
      )
    }

    // Get user's properties for portfolio context
    const { data: properties } = await supabase
      .from('properties')
      .select('address, city, state, zip, property_type, purchase_price, current_value, monthly_rent, status')
      .eq('user_id', user.id)

    const marketsSummary = watchedMarkets
      .map((m: Record<string, any>) => `${m.city}, ${m.state}${m.zip ? ` (${m.zip})` : ''}${m.metro ? ` - ${m.metro} metro` : ''}`)
      .join('\n')

    const portfolioSummary = properties && properties.length > 0
      ? properties
          .map(
            (p: Record<string, any>) =>
              `- ${p.address}, ${p.city}, ${p.state} | Type: ${p.property_type} | Value: $${p.current_value?.toLocaleString() || 'N/A'} | Rent: $${p.monthly_rent?.toLocaleString() || 'N/A'}/mo | Status: ${p.status}`
          )
          .join('\n')
      : 'No properties in portfolio yet.'

    const systemPrompt = `You are an expert real estate market analyst for RKV Consulting. Generate a comprehensive, personalized market intelligence brief for an investor.

Structure your brief as follows:

1. **Executive Summary** (2-3 sentences on overall market conditions)

2. **Market-by-Market Analysis** (for each watched market):
   - Current market temperature (hot/warm/cool/cold)
   - Median home price trend and YoY change estimate
   - Rental market conditions (vacancy, rent trends)
   - Key economic indicators (employment, population growth)
   - Investment opportunity score (1-10)
   - Top opportunity: specific actionable insight

3. **Portfolio Impact Assessment**:
   - How current market trends affect the investor's existing holdings
   - Properties that may need attention (appreciation lagging, rent below market, etc.)
   - Suggested portfolio actions

4. **Opportunities & Alerts**:
   - Best markets for buying right now from the watchlist
   - Markets to avoid or where caution is warranted
   - Emerging trends to watch

5. **Action Items**:
   - 3-5 specific, actionable recommendations

Use real market knowledge up to your training data. Be specific with numbers and percentages where possible. Frame everything in terms of investment returns and risk.`

    const messages = [
      {
        role: 'user',
        content: `Generate my personalized market intelligence brief.

**My Watched Markets:**
${marketsSummary}

**My Current Portfolio:**
${portfolioSummary}

Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      },
    ]

    const response = await callClaude(messages, systemPrompt)

    if (!response || response.error) {
      console.error('[Market Brief] Claude error:', response?.error)
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      )
    }

    const briefContent = response.content?.[0]?.text || response.content

    return NextResponse.json({
      brief: briefContent,
      markets: watchedMarkets.map((m: Record<string, any>) => ({
        city: m.city,
        state: m.state,
        zip: m.zip,
      })),
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Market Brief] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate market brief' },
      { status: 500 }
    )
  }
}
