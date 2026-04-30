/**
 * Integration Registry
 *
 * Lists integrations that are actually wired up. PM-software connectors
 * (AppFolio, Buildium, Yardi, Rent Manager, RealPage, Entrata, DoorLoop,
 * Propertyware, ResMan) were removed because they were stubs that threw
 * "not yet implemented". Customers bring data via CSV import today.
 * Custom integrations are available on request — contact sales.
 */

export interface IntegrationInfo {
  id: string;
  label: string;
  description: string;
  status: 'available' | 'coming_soon';
}

export const INTEGRATION_REGISTRY: IntegrationInfo[] = [
  {
    id: 'twilio',
    label: 'Twilio',
    description: 'SMS and voice for AI agents',
    status: 'available',
  },
  {
    id: 'resend',
    label: 'Resend',
    description: 'Transactional email delivery',
    status: 'available',
  },
  {
    id: 'stripe',
    label: 'Stripe',
    description: 'Subscription billing',
    status: 'available',
  },
  {
    id: 'claude',
    label: 'Claude AI',
    description: 'AI agents powered by Anthropic Claude',
    status: 'available',
  },
  {
    id: 'quickbooks',
    label: 'QuickBooks',
    description: 'Accounting sync (OAuth scaffolded)',
    status: 'coming_soon',
  },
];
