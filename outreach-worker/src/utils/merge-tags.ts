import type { MergeTagContext } from '../types/index.js';

const TAG_MAP: Record<string, keyof MergeTagContext> = {
  '{{first_name}}': 'first_name',
  '{{last_name}}': 'last_name',
  '{{company_name}}': 'company_name',
  '{{unit_count}}': 'unit_count',
  '{{current_software}}': 'current_software',
  '{{city}}': 'city',
  '{{state}}': 'state',
  '{{ai_first_line}}': 'ai_first_line',
  '{{cal_link}}': 'cal_link',
  '{{sender_first_name}}': 'sender_first_name',
};

/**
 * Replace all merge tags in a template string with values from the context.
 * Unknown tags are replaced with empty string.
 */
export function replaceMergeTags(template: string, context: MergeTagContext): string {
  let result = template;

  for (const [tag, key] of Object.entries(TAG_MAP)) {
    const value = context[key];
    result = result.replaceAll(tag, value != null ? String(value) : '');
  }

  // Strip any remaining unrecognized {{...}} tags
  result = result.replace(/\{\{[a-z_]+\}\}/g, '');

  return result;
}

/**
 * Build a MergeTagContext from a lead record and sending account.
 */
export function buildMergeContext(
  lead: {
    first_name: string;
    last_name: string;
    company_name: string;
    unit_count?: number;
    current_software?: string;
    city?: string;
    state?: string;
    ai_first_line?: string;
  },
  senderFirstName: string
): MergeTagContext {
  return {
    first_name: lead.first_name,
    last_name: lead.last_name,
    company_name: lead.company_name,
    unit_count: lead.unit_count,
    current_software: lead.current_software,
    city: lead.city,
    state: lead.state,
    ai_first_line: lead.ai_first_line,
    cal_link: process.env.CAL_BOOKING_URL || 'https://cal.com/rkv',
    sender_first_name: senderFirstName,
  };
}
