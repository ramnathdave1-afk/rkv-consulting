import { supabase } from './supabase.js';

type AgentName = 'alpha' | 'beta' | 'gamma' | 'delta' | 'epsilon' | 'zeta';

export async function logActivity(
  agentName: AgentName,
  action: string,
  details?: Record<string, unknown>,
  orgId?: string,
  siteId?: string,
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${agentName.toUpperCase()}] ${action}`);

  await supabase.from('agent_activity_log').insert({
    agent_name: agentName,
    action,
    details: details || null,
    org_id: orgId || null,
    site_id: siteId || null,
  });
}
