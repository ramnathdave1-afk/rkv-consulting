import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { PLANS, type PlanName } from '@/lib/stripe/plans'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check subscription for dealAnalysis feature and limit
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    if (!plan.features.dealAnalysis) {
      return NextResponse.json(
        { error: 'Deal analysis is not available on your current plan.' },
        { status: 403 }
      )
    }

    // Check deal analysis limit
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('deal_analyses_used')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single()

    const analysesUsed = usage?.deal_analyses_used || 0
    const analysesLimit = plan.features.dealAnalysisLimit as number

    if (analysesLimit !== Infinity && analysesUsed >= analysesLimit) {
      return NextResponse.json(
        { error: `You have reached your monthly deal analysis limit (${analysesLimit}). Upgrade your plan for more.` },
        { status: 429 }
      )
    }

    const dealData = await req.json()

    if (!dealData) {
      return NextResponse.json(
        { error: 'Missing deal data' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are an expert real estate investment analyst for RKV Consulting. Analyze the following deal data and provide a comprehensive investment analysis.

You MUST respond with valid JSON matching this exact structure:
{
  "purchase_price": number,
  "closing_costs": number (estimate 2-3% of purchase price if not provided),
  "repair_costs": number,
  "total_investment": number,
  "monthly_rent": number,
  "annual_gross_income": number,
  "vacancy_loss": number,
  "effective_gross_income": number,
  "property_tax": number (annual),
  "insurance": number (annual),
  "maintenance": number (annual, estimate 1% of property value),
  "management_fee": number (annual, 8-10% of gross rent),
  "hoa": number (annual),
  "utilities": number (annual),
  "total_operating_expenses": number (annual),
  "noi": number (net operating income),
  "cap_rate": number (percentage),
  "cash_on_cash_return": number (percentage),
  "gross_rent_multiplier": number,
  "debt_service_coverage_ratio": number,
  "monthly_cash_flow": number,
  "annual_cash_flow": number,
  "loan_amount": number,
  "down_payment": number,
  "interest_rate": number (percentage),
  "loan_term": number (years),
  "monthly_mortgage": number,
  "arv": number (after repair value),
  "equity_at_purchase": number,
  "appreciation_rate": number (percentage),
  "score": number (0-100 overall investment score),
  "grade": string ("A+" through "F"),
  "recommendation": string ("strong_buy" | "buy" | "hold" | "pass" | "strong_pass"),
  "risks": string[] (list of identified risks),
  "opportunities": string[] (list of opportunities),
  "summary": string (2-3 paragraph executive summary),
  "scenarios": {
    "conservative": {
      "label": "conservative",
      "vacancy_rate": number,
      "rent_growth_rate": number,
      "expense_growth_rate": number,
      "appreciation_rate": number,
      "monthly_rent": number,
      "monthly_cash_flow": number,
      "annual_cash_flow": number,
      "cap_rate": number,
      "cash_on_cash_return": number,
      "five_year_equity": number,
      "five_year_total_return": number,
      "ten_year_equity": number,
      "ten_year_total_return": number,
      "irr": number
    },
    "base": { ... same structure ... },
    "aggressive": { ... same structure ... }
  }
}

Use standard real estate financial calculations:
- NOI = Effective Gross Income - Total Operating Expenses
- Cap Rate = NOI / Purchase Price * 100
- Cash on Cash = Annual Cash Flow / Total Cash Invested * 100
- GRM = Purchase Price / Annual Gross Rent
- DSCR = NOI / Annual Debt Service
- Monthly Mortgage = standard amortization formula
- Vacancy typically 5-10%, management 8-10%, maintenance 1% of value, insurance ~0.5% of value

For scenarios:
- Conservative: higher vacancy (10%), lower rent growth (1%), higher expense growth (3%), lower appreciation (1%)
- Base: moderate vacancy (7%), moderate rent growth (2%), moderate expense growth (2.5%), moderate appreciation (3%)
- Aggressive: lower vacancy (4%), higher rent growth (4%), lower expense growth (2%), higher appreciation (5%)

Calculate 5-year and 10-year projections for each scenario including equity buildup from appreciation and principal paydown.
Estimate IRR using cash flows over a 10-year hold period with sale at projected value.

If any data is missing, make reasonable assumptions based on the property type, location, and market conditions. Always note assumptions made.

Respond ONLY with the JSON object, no markdown formatting.`

    const messages = [
      {
        role: 'user',
        content: `Analyze this real estate deal:\n\n${JSON.stringify(dealData, null, 2)}`,
      },
    ]

    const response = await callClaude(messages, systemPrompt)

    if (!response || response.error) {
      console.error('[Deal Analysis] Claude error:', response?.error)
      return NextResponse.json(
        { error: 'AI analysis service temporarily unavailable' },
        { status: 502 }
      )
    }

    // Parse the analysis result
    let analysis
    try {
      const content = response.content?.[0]?.text || response.content
      analysis = typeof content === 'string' ? JSON.parse(content) : content
    } catch (parseError) {
      console.error('[Deal Analysis] Failed to parse Claude response:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse analysis results', raw: response.content?.[0]?.text },
        { status: 500 }
      )
    }

    // Increment deal_analyses_used in ai_usage
    if (usage) {
      await supabase
        .from('ai_usage')
        .update({
          deal_analyses_used: analysesUsed + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('month', currentMonth)
    } else {
      await supabase.from('ai_usage').insert({
        user_id: user.id,
        month: currentMonth,
        deal_analyses_used: 1,
        ai_messages_used: 0,
      })
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('[Deal Analysis] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze deal' },
      { status: 500 }
    )
  }
}
