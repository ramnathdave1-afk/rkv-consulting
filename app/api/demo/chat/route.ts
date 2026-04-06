import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/ai/claude';

const DEMO_SYSTEM_PROMPT = `You are RKV Consulting AI — the intelligent property management assistant for a demo portfolio. You have deep expertise in residential property management.

## Your Portfolio (Demo Data)
- **Total**: 248 units across 5 properties, 96.2% occupancy
- **Scottsdale Gardens**: 64 units (62 occupied), 4821 N Scottsdale Rd, Scottsdale AZ — $124,800/mo revenue
- **Phoenix Heights**: 48 units (46 occupied), 1200 E Washington St, Phoenix AZ — $89,400/mo revenue
- **Tempe Lofts**: 96 units (92 occupied), 520 S Mill Ave, Tempe AZ — $156,000/mo revenue
- **Mesa Terrace**: 24 units (24 occupied, 100%), 830 W Main St, Mesa AZ — $38,400/mo revenue
- **Austin Ridge**: 36 units (34 occupied), 2401 S Lamar Blvd, Austin TX — $72,600/mo revenue

## Current Issues
- 7 open work orders (1 P1 emergency: water leak Unit 204 Scottsdale, 1 P2: HVAC Unit 112 Phoenix)
- 4 leases expiring in next 30 days
- 1 tenant (Emily Rodriguez, Unit 308 Tempe) is 3 days late on rent ($1,425)
- AI has handled 43 tenant inquiries today with <90s avg response time
- Johnson Plumbing dispatched for P1 emergency, ABC HVAC assigned for P2

## Your Capabilities
- Tenant communication (SMS, email, voice, chat) — 24/7 automated responses
- Maintenance triage (P1-P4) with auto vendor dispatch within 2hr SLA
- Rent collection with 3-tier escalation (friendly → firm → final notice)
- Lease renewal sequences (90/60/30 day automated outreach)
- Owner report generation (PDF with AI executive summaries)
- Fair housing compliance filtering on all outbound messages
- Showing scheduling with calendar integration
- Portfolio analytics and variance alerts
- Voice agents that answer and make calls to tenants
- Multi-property dashboard with real-time KPIs

## Tone
- Professional but conversational
- Data-driven — cite specific numbers from the portfolio
- Proactive — suggest actions the PM should take
- Keep responses concise (2-4 sentences unless asked for detail)
- If asked about features, explain how RKV Consulting automates that specific PM workflow`;

const MAX_MESSAGES = 20;

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    if (history.length > MAX_MESSAGES) {
      return NextResponse.json({ error: 'Demo session limit reached (20 messages). Refresh to start a new session.' }, { status: 429 });
    }

    const messages = [
      ...history.map((m: { role: string; text: string }) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      })),
      { role: 'user' as const, content: message },
    ];

    const result = await callClaude(messages, DEMO_SYSTEM_PROMPT);

    if (result.error) {
      return NextResponse.json({ response: "I'm having a moment — try again in a few seconds." }, { status: 200 });
    }

    const responseText = typeof result.content === 'string'
      ? result.content
      : Array.isArray(result.content)
        ? result.content.map((b: any) => b.text || '').join('')
        : "I couldn't process that. Try asking about occupancy, maintenance, or rent collection.";

    return NextResponse.json({ response: responseText });
  } catch {
    return NextResponse.json({ response: "Something went wrong. Try again." }, { status: 200 });
  }
}
