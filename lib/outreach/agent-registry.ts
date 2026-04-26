import type { AgentName } from './types';
import { AGENT_NAMES } from './types';
import type { BaseAgent } from './base-agent';

type AgentFactory = () => Promise<BaseAgent>;

const registry: Record<string, AgentFactory> = {
  lead_scraper: async () => (await import('./agents/01-lead-scraper')).default,
  company_enricher: async () => (await import('./agents/02-company-enricher')).default,
  contact_finder: async () => (await import('./agents/03-contact-finder')).default,
  email_finder: async () => (await import('./agents/04-email-finder')).default,
  email_verifier: async () => (await import('./agents/05-email-verifier')).default,
  icp_scorer: async () => (await import('./agents/06-icp-scorer')).default,
  research_report_generator: async () => (await import('./agents/07-research-report-generator')).default,
  email_copywriter: async () => (await import('./agents/08-email-copywriter')).default,
  subject_line_optimizer: async () => (await import('./agents/09-subject-line-optimizer')).default,
  follow_up_sequencer: async () => (await import('./agents/10-follow-up-sequencer')).default,
  email_blaster: async () => (await import('./agents/11-email-blaster')).default,
  reply_classifier: async () => (await import('./agents/12-reply-classifier')).default,
  lead_responder: async () => (await import('./agents/13-lead-responder')).default,
  meeting_booker: async () => (await import('./agents/14-meeting-booker')).default,
  campaign_orchestrator: async () => (await import('./agents/15-campaign-orchestrator')).default,
};

export async function getAgent(name: AgentName): Promise<BaseAgent> {
  const factory = registry[name];
  if (!factory) {
    throw new Error(`Unknown agent: ${name}. Valid agents: ${AGENT_NAMES.join(', ')}`);
  }
  return factory();
}

export function isValidAgentName(name: string): name is AgentName {
  return AGENT_NAMES.includes(name as AgentName);
}
