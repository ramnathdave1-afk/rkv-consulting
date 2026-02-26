import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamClaude } from '@/lib/ai/claude'
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

    // Check subscription for aiAssistant feature
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    if (!plan.features.aiAssistant) {
      return NextResponse.json(
        { error: 'AI Assistant is not available on your current plan. Please upgrade to Pro or Elite.' },
        { status: 403 }
      )
    }

    // Check message limit
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('ai_messages_used')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single()

    const messagesUsed = usage?.ai_messages_used || 0
    const messagesLimit = plan.features.aiMessagesLimit as number

    if (messagesLimit !== Infinity && messagesUsed >= messagesLimit) {
      return NextResponse.json(
        { error: `You have reached your monthly AI message limit (${messagesLimit}). Upgrade your plan for more.` },
        { status: 429 }
      )
    }

    const { messages, conversationId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Missing or invalid messages array' },
        { status: 400 }
      )
    }

    // Call Claude with streaming
    const systemPrompt = `You are an expert real estate investment AI assistant for RKV Consulting. You help investors analyze deals, manage properties, understand market trends, and make data-driven investment decisions. Be concise, actionable, and provide specific numbers when possible. Always frame advice in terms of ROI, cash flow, and risk management.`

    const claudeResponse = await streamClaude(messages, systemPrompt)

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json()
      console.error('[AI Assistant] Claude API error:', errorData)
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      )
    }

    // Track usage in ai_usage table
    if (usage) {
      await supabase
        .from('ai_usage')
        .update({
          ai_messages_used: messagesUsed + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('month', currentMonth)
    } else {
      await supabase.from('ai_usage').insert({
        user_id: user.id,
        month: currentMonth,
        ai_messages_used: 1,
        deal_analyses_used: 0,
      })
    }

    // Save to conversation if conversationId provided
    if (conversationId) {
      const userMessage = messages[messages.length - 1]
      const { data: conversation } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (conversation) {
        const existingMessages = conversation.messages || []
        existingMessages.push({
          ...userMessage,
          timestamp: new Date().toISOString(),
        })

        await supabase
          .from('ai_conversations')
          .update({
            messages: existingMessages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversationId)
      }
    }

    // Return streaming response with SSE headers
    return new NextResponse(claudeResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AI Assistant] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
