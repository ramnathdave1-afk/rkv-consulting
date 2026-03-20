/**
 * Maintenance Triage Engine
 * Classifies work order urgency, matches vendors, and handles auto-dispatch.
 */

import { callClaude } from './claude';
import { createAdminClient } from '@/lib/supabase/admin';
import type { WorkOrderCategory, WorkOrderPriority } from '@/lib/types';

export interface TriageResult {
  priority: WorkOrderPriority;
  category: WorkOrderCategory;
  summary: string;
  requires_immediate_dispatch: boolean;
}

export async function triageMaintenanceRequest(
  description: string
): Promise<TriageResult> {
  const result = await callClaude(
    [{ role: 'user', content: description }],
    `You are a maintenance triage AI for a property management company. Analyze this maintenance request and respond with ONLY a JSON object (no markdown, no explanation):

{
  "priority": "emergency|high|medium|low",
  "category": "plumbing|electrical|hvac|appliance|pest|structural|cosmetic|safety|general|turnover",
  "summary": "Brief 1-sentence summary of the issue",
  "requires_immediate_dispatch": true/false
}

PRIORITY RULES:
- emergency: Life safety threats — flooding, gas leak, no heat in winter, fire damage, sewage backup, broken locks on exterior doors, electrical sparking
- high: Major comfort/function issues — HVAC failure (not life safety), water heater broken, refrigerator not working, major plumbing leak (contained)
- medium: Standard repairs — minor leaks, appliance issues, garbage disposal, running toilet, broken blinds
- low: Cosmetic/minor — paint touch-up, caulking, squeaky door, light bulb replacement, minor scuffs

CATEGORY RULES:
- plumbing: Pipes, leaks, toilets, faucets, water heater, garbage disposal, drains
- electrical: Outlets, switches, wiring, breaker panel, light fixtures (not bulbs)
- hvac: Heating, cooling, thermostat, air filters, ductwork, ventilation
- appliance: Refrigerator, stove, oven, dishwasher, washer, dryer, microwave
- pest: Bugs, rodents, wildlife, ant/roach/mouse/rat
- structural: Walls, ceiling, floor, foundation, roof, windows, doors (not cosmetic)
- cosmetic: Paint, scuffs, minor damage, appearance issues
- safety: Smoke detectors, CO detectors, fire extinguishers, locks, handrails
- general: Anything else
- turnover: Make-ready between tenants

Respond with ONLY the JSON object.`
  );

  const text = Array.isArray(result?.content)
    ? result.content[0]?.text || ''
    : typeof result?.content === 'string'
      ? result.content
      : '';

  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      priority: parsed.priority || 'medium',
      category: parsed.category || 'general',
      summary: parsed.summary || description.slice(0, 100),
      requires_immediate_dispatch: parsed.requires_immediate_dispatch || false,
    };
  } catch {
    // Fallback if parsing fails
    return {
      priority: 'medium',
      category: 'general',
      summary: description.slice(0, 100),
      requires_immediate_dispatch: false,
    };
  }
}

export interface VendorMatch {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  rating: number | null;
  is_preferred: boolean;
}

export async function matchVendor(
  orgId: string,
  category: WorkOrderCategory
): Promise<VendorMatch | null> {
  const supabase = createAdminClient();

  // Find vendors matching the category, prioritize preferred + highest rated
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, company, phone, rating, is_preferred, specialty')
    .eq('org_id', orgId)
    .contains('specialty', [category])
    .order('is_preferred', { ascending: false })
    .order('rating', { ascending: false })
    .limit(1);

  if (!vendors || vendors.length === 0) {
    // Try general vendors if no category match
    const { data: generalVendors } = await supabase
      .from('vendors')
      .select('id, name, company, phone, rating, is_preferred')
      .eq('org_id', orgId)
      .order('is_preferred', { ascending: false })
      .order('rating', { ascending: false })
      .limit(1);

    if (!generalVendors || generalVendors.length === 0) return null;
    return generalVendors[0] as VendorMatch;
  }

  return vendors[0] as VendorMatch;
}

export async function createWorkOrderFromMessage(params: {
  orgId: string;
  propertyId: string;
  unitId?: string;
  tenantId?: string;
  description: string;
  conversationId?: string;
}): Promise<{ workOrderId: string; triage: TriageResult; vendor: VendorMatch | null }> {
  const supabase = createAdminClient();

  // Triage the request
  const triage = await triageMaintenanceRequest(params.description);

  // Match vendor
  const vendor = await matchVendor(params.orgId, triage.category);

  // Create work order
  const { data: workOrder } = await supabase
    .from('work_orders')
    .insert({
      org_id: params.orgId,
      property_id: params.propertyId,
      unit_id: params.unitId || null,
      tenant_id: params.tenantId || null,
      vendor_id: vendor?.id || null,
      title: triage.summary,
      description: params.description,
      category: triage.category,
      priority: triage.priority,
      status: vendor ? 'assigned' : 'open',
      source: 'ai_chat',
      ai_summary: triage.summary,
      metadata: {
        conversation_id: params.conversationId,
        auto_triaged: true,
        auto_dispatched: !!vendor,
      },
    })
    .select('id')
    .single();

  return {
    workOrderId: workOrder?.id || '',
    triage,
    vendor,
  };
}
