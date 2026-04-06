import { createAdminClient } from '@/lib/supabase/admin';
import { streamClaude } from '@/lib/ai/claude';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

async function loadOrgContext() {
  const supabase = createAdminClient();

  const [
    { data: properties },
    { data: units },
    { data: leases },
    { data: tenants },
    { data: workOrders },
    { data: financials },
    { data: showings },
  ] = await Promise.all([
    supabase.from('properties').select('id, name, address_line1, city, state, unit_count, property_type').eq('org_id', ORG_ID),
    supabase.from('units').select('id, unit_number, property_id, status, market_rent, bedrooms, bathrooms').eq('org_id', ORG_ID),
    supabase.from('leases').select('id, unit_id, tenant_id, lease_start, lease_end, monthly_rent, status').eq('org_id', ORG_ID),
    supabase.from('tenants').select('id, first_name, last_name, email, phone, status, move_in_date').eq('org_id', ORG_ID),
    supabase.from('work_orders').select('id, title, description, category, priority, status, property_id, unit_id, tenant_id, created_at').eq('org_id', ORG_ID),
    supabase.from('financial_transactions').select('id, type, category, amount, description, transaction_date, property_id').eq('org_id', ORG_ID).order('transaction_date', { ascending: false }).limit(100),
    supabase.from('showings').select('id, prospect_name, status, scheduled_at, property_id, unit_id').eq('org_id', ORG_ID).order('scheduled_at', { ascending: false }).limit(20),
  ]);

  // Compute metrics
  const totalProperties = properties?.length || 0;
  const totalUnits = units?.length || 0;
  const occupiedUnits = units?.filter(u => u.status === 'occupied').length || 0;
  const vacantUnits = units?.filter(u => u.status === 'vacant').length || 0;
  const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : '0';

  const activeLeases = leases?.filter(l => l.status === 'active') || [];
  const totalMonthlyRevenue = activeLeases.reduce((sum, l) => sum + Number(l.monthly_rent || 0), 0);

  const openWorkOrders = workOrders?.filter(wo => ['open', 'assigned', 'in_progress', 'parts_needed'].includes(wo.status)) || [];
  const emergencyWorkOrders = openWorkOrders.filter(wo => wo.priority === 'emergency');

  const activeTenants = tenants?.filter(t => t.status === 'active') || [];

  // Leases expiring in next 90 days
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiringLeases = activeLeases.filter(l => {
    const end = new Date(l.lease_end);
    return end >= now && end <= in90Days;
  });

  // Recent income/expense totals
  const totalIncome = financials?.filter(f => f.type === 'income').reduce((s, f) => s + Number(f.amount || 0), 0) || 0;
  const totalExpenses = financials?.filter(f => f.type === 'expense').reduce((s, f) => s + Number(f.amount || 0), 0) || 0;

  // Upcoming showings
  const upcomingShowings = showings?.filter(s => new Date(s.scheduled_at) >= now && s.status !== 'cancelled') || [];

  // Build property lookup
  const propertyMap = new Map((properties || []).map(p => [p.id, p]));

  // Build property summaries
  const propertySummaries = (properties || []).map(p => {
    const pUnits = units?.filter(u => u.property_id === p.id) || [];
    const pOccupied = pUnits.filter(u => u.status === 'occupied').length;
    const pWOs = openWorkOrders.filter(wo => wo.property_id === p.id).length;
    return `- ${p.name} (${p.city}, ${p.state}): ${pOccupied}/${pUnits.length} occupied, ${pWOs} open work orders`;
  }).join('\n');

  // Build tenant list (name + unit mapping via leases)
  const tenantDetails = activeTenants.slice(0, 50).map(t => {
    const lease = activeLeases.find(l => l.tenant_id === t.id);
    const unit = lease ? units?.find(u => u.id === lease.unit_id) : null;
    const prop = unit ? propertyMap.get(unit.property_id) : null;
    return `- ${t.first_name} ${t.last_name} | ${prop?.name || 'Unknown'} Unit ${unit?.unit_number || '?'} | Rent: $${lease?.monthly_rent || '?'}/mo | Lease ends: ${lease?.lease_end || '?'}`;
  }).join('\n');

  // Open work orders detail
  const woDetails = openWorkOrders.slice(0, 20).map(wo => {
    const prop = propertyMap.get(wo.property_id);
    const unit = units?.find(u => u.id === wo.unit_id);
    return `- [${wo.priority.toUpperCase()}] ${wo.title} | ${prop?.name || '?'} Unit ${unit?.unit_number || '?'} | Status: ${wo.status} | Category: ${wo.category}`;
  }).join('\n');

  return `
=== PORTFOLIO SNAPSHOT ===
Properties: ${totalProperties}
Total Units: ${totalUnits}
Occupied: ${occupiedUnits} | Vacant: ${vacantUnits}
Occupancy Rate: ${occupancyRate}%
Active Tenants: ${activeTenants.length}
Monthly Rental Revenue: $${totalMonthlyRevenue.toLocaleString()}
Open Work Orders: ${openWorkOrders.length} (${emergencyWorkOrders.length} emergency)
Leases Expiring in 90 Days: ${expiringLeases.length}
Upcoming Showings: ${upcomingShowings.length}
Recent Income (last 100 txns): $${totalIncome.toLocaleString()}
Recent Expenses (last 100 txns): $${totalExpenses.toLocaleString()}

=== PROPERTIES ===
${propertySummaries || 'No properties found.'}

=== ACTIVE TENANTS ===
${tenantDetails || 'No active tenants found.'}

=== OPEN WORK ORDERS ===
${woDetails || 'No open work orders.'}

=== EXPIRING LEASES (Next 90 Days) ===
${expiringLeases.map(l => {
  const tenant = tenants?.find(t => t.id === l.tenant_id);
  const unit = units?.find(u => u.id === l.unit_id);
  const prop = unit ? propertyMap.get(unit.property_id) : null;
  return `- ${tenant?.first_name || '?'} ${tenant?.last_name || '?'} | ${prop?.name || '?'} Unit ${unit?.unit_number || '?'} | Expires: ${l.lease_end} | Rent: $${l.monthly_rent}/mo`;
}).join('\n') || 'None expiring soon.'}
`.trim();
}

const SYSTEM_PROMPT_TEMPLATE = (orgContext: string) => `You are RKV Consulting AI -- the built-in property management assistant for RKV Consulting, a platform by RKV Consulting LLC.

You help property managers with:
- Portfolio analytics (occupancy, revenue, NOI, delinquency)
- Tenant lookups (lease dates, rent amounts, contact info)
- Work order tracking and maintenance coordination
- Lease renewal management
- Showing scheduling
- Financial reporting
- General property management best practices
- Fair housing compliance guidance

IMPORTANT RULES:
1. You have access to the user's LIVE portfolio data below. Use it to answer specific questions.
2. When the user asks about specific tenants, properties, or work orders, reference the actual data.
3. For questions about creating work orders, scheduling showings, or sending notices -- explain the steps they can take in the RKV Consulting dashboard. You cannot directly execute these actions, but you can guide them.
4. For general PM advice (fair housing, delinquency handling, screening), provide professional, accurate guidance.
5. Keep responses concise and actionable. Use bullet points for lists.
6. Format dollar amounts with commas. Use percentages where appropriate.
7. If the data doesn't contain what the user is asking about, say so honestly rather than guessing.
8. Never fabricate tenant names, amounts, or dates that aren't in the data below.

--- USER'S LIVE PORTFOLIO DATA ---
${orgContext}
--- END DATA ---

Respond helpfully and professionally. You are their trusted PM assistant.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load live org data for context
    let orgContext: string;
    try {
      orgContext = await loadOrgContext();
    } catch (err) {
      console.error('[Chat API] Failed to load org context:', err);
      orgContext = 'Portfolio data temporarily unavailable. Answer general PM questions to the best of your ability.';
    }

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE(orgContext);

    // Only pass the last 20 messages to avoid token overflow
    const recentMessages = messages.slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await streamClaude(recentMessages, systemPrompt);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Chat API] Claude stream error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[Chat API] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
