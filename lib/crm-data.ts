/**
 * CRM mock data — Phoenix-area contacts, deals, activity.
 * Used by /crm for Contacts, Deals, Activity Feed.
 */

export type ContactTag = 'Buyer' | 'Seller' | 'Broker' | 'Lender' | 'Contractor' | 'Partner' | 'Agent';
export type LeadSource = 'Referral' | 'Cold Outreach' | 'Inbound' | 'Network Event' | 'Other';
export type ContactStatus = 'Active' | 'Inactive' | 'Hot Lead';

export interface CRMContact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  tags: ContactTag[];
  leadSource: LeadSource;
  leadScore: number;
  status: ContactStatus;
  totalDealVolume: number;
  dealCount: number;
  lastActivity: string;
  createdAt: string;
}

export type DealStage =
  | 'Prospect'
  | 'Analysis'
  | 'Due Diligence'
  | 'Negotiation'
  | 'Under Contract'
  | 'Closed'
  | 'Dead';

export type DealType = 'Flip' | 'Rental' | 'Wholesale' | 'BRRRR';
export type PropertyType = 'SFR' | 'Multi-Family' | 'Commercial';
export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface CRMDeal {
  id: string;
  propertyAddress: string;
  propertyType: PropertyType;
  dealType: DealType;
  stage: DealStage;
  purchasePrice: number;
  rehabBudget: number;
  arv: number;
  projectedROI: number;
  capRate?: number;
  cashOnCash?: number;
  totalInvestment: number;
  projectedProfit: number;
  daysInStage: number;
  riskLevel: RiskLevel;
  atlasScore: number;
  atlasConfidence: number;
  keyContact: { id: string; name: string };
  associatedContacts: { id: string; name: string; role: string }[];
  stageHistory: { stage: DealStage; enteredAt: string; exitedAt?: string }[];
  activities: { type: string; description: string; timestamp: string; contactId?: string }[];
  createdAt: string;
}

export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'stage_change'
  | 'analysis'
  | 'document';

export interface CRMActivity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  contactId?: string;
  contactName?: string;
  dealId?: string;
  dealAddress?: string;
}

const CONTACTS: CRMContact[] = [
  {
    id: 'c1',
    firstName: 'Marcus',
    lastName: 'Webb',
    company: 'Webb Realty Group',
    role: 'Broker',
    phone: '(602) 555-0142',
    email: 'mwebb@webbrealty.com',
    address: 'Phoenix, AZ',
    tags: ['Broker', 'Agent'],
    leadSource: 'Referral',
    leadScore: 92,
    status: 'Active',
    totalDealVolume: 2450000,
    dealCount: 4,
    lastActivity: '2025-03-01T14:30:00Z',
    createdAt: '2024-09-15T10:00:00Z',
  },
  {
    id: 'c2',
    firstName: 'Jennifer',
    lastName: 'Torres',
    company: 'Desert Sun Lending',
    role: 'Loan Officer',
    phone: '(480) 555-0198',
    email: 'j.torres@desertsunlending.com',
    address: 'Scottsdale, AZ',
    tags: ['Lender'],
    leadSource: 'Network Event',
    leadScore: 85,
    status: 'Active',
    totalDealVolume: 1250000,
    dealCount: 3,
    lastActivity: '2025-02-28T09:15:00Z',
    createdAt: '2024-11-20T08:00:00Z',
  },
  {
    id: 'c3',
    firstName: 'David',
    lastName: 'Chen',
    company: 'Chen Renovations LLC',
    role: 'General Contractor',
    phone: '(602) 555-0177',
    email: 'david@chenrenovations.com',
    address: 'Mesa, AZ',
    tags: ['Contractor'],
    leadSource: 'Referral',
    leadScore: 78,
    status: 'Active',
    totalDealVolume: 890000,
    dealCount: 2,
    lastActivity: '2025-02-27T16:00:00Z',
    createdAt: '2024-12-01T12:00:00Z',
  },
  {
    id: 'c4',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    company: 'Mitchell Holdings',
    role: 'Investor',
    phone: '(602) 555-0123',
    email: 'sarah@mitchellholdings.com',
    address: 'Phoenix, AZ',
    tags: ['Buyer', 'Partner'],
    leadSource: 'Inbound',
    leadScore: 88,
    status: 'Hot Lead',
    totalDealVolume: 0,
    dealCount: 0,
    lastActivity: '2025-03-01T10:00:00Z',
    createdAt: '2025-02-15T09:00:00Z',
  },
  {
    id: 'c5',
    firstName: 'Robert',
    lastName: 'Hayes',
    company: 'Hayes Wholesale',
    role: 'Wholesaler',
    phone: '(480) 555-0165',
    email: 'robert@hayeswholesale.com',
    address: 'Tempe, AZ',
    tags: ['Seller', 'Broker'],
    leadSource: 'Cold Outreach',
    leadScore: 72,
    status: 'Active',
    totalDealVolume: 3100000,
    dealCount: 5,
    lastActivity: '2025-02-26T11:30:00Z',
    createdAt: '2024-08-01T14:00:00Z',
  },
];

const DEALS: CRMDeal[] = [
  {
    id: 'd1',
    propertyAddress: '4521 E Monte Vista Rd, Phoenix, AZ 85008',
    propertyType: 'SFR',
    dealType: 'Flip',
    stage: 'Analysis',
    purchasePrice: 285000,
    rehabBudget: 45000,
    arv: 395000,
    projectedROI: 22.8,
    capRate: 6.2,
    cashOnCash: 28,
    totalInvestment: 330000,
    projectedProfit: 65000,
    daysInStage: 12,
    riskLevel: 'Medium',
    atlasScore: 91,
    atlasConfidence: 94.2,
    keyContact: { id: 'c1', name: 'Marcus Webb' },
    associatedContacts: [
      { id: 'c1', name: 'Marcus Webb', role: 'Listing Agent' },
      { id: 'c2', name: 'Jennifer Torres', role: 'Lender' },
    ],
    stageHistory: [
      { stage: 'Prospect', enteredAt: '2025-01-20T09:00:00Z', exitedAt: '2025-02-17T10:00:00Z' },
      { stage: 'Analysis', enteredAt: '2025-02-17T10:00:00Z' },
    ],
    activities: [
      { type: 'note', description: 'Initial numbers look strong. Running ATLAS.', timestamp: '2025-02-17T10:00:00Z' },
    ],
    createdAt: '2025-01-20T09:00:00Z',
  },
  {
    id: 'd2',
    propertyAddress: '1824 W Roeser Rd, Phoenix, AZ 85041',
    propertyType: 'SFR',
    dealType: 'Rental',
    stage: 'Due Diligence',
    purchasePrice: 312000,
    rehabBudget: 18000,
    arv: 335000,
    projectedROI: 8.4,
    capRate: 5.8,
    cashOnCash: 6.2,
    totalInvestment: 330000,
    projectedProfit: 5000,
    daysInStage: 8,
    riskLevel: 'Low',
    atlasScore: 87,
    atlasConfidence: 91.5,
    keyContact: { id: 'c1', name: 'Marcus Webb' },
    associatedContacts: [
      { id: 'c1', name: 'Marcus Webb', role: 'Agent' },
      { id: 'c3', name: 'David Chen', role: 'Contractor' },
    ],
    stageHistory: [
      { stage: 'Prospect', enteredAt: '2025-01-28T09:00:00Z', exitedAt: '2025-02-10T14:00:00Z' },
      { stage: 'Analysis', enteredAt: '2025-02-10T14:00:00Z', exitedAt: '2025-02-21T09:00:00Z' },
      { stage: 'Due Diligence', enteredAt: '2025-02-21T09:00:00Z' },
    ],
    activities: [
      { type: 'stage_change', description: 'Moved to Due Diligence', timestamp: '2025-02-21T09:00:00Z' },
      { type: 'call', description: 'Scheduled inspection with David Chen', timestamp: '2025-02-22T11:00:00Z', contactId: 'c3' },
    ],
    createdAt: '2025-01-28T09:00:00Z',
  },
  {
    id: 'd3',
    propertyAddress: '5547 S 19th Ave, Phoenix, AZ 85041',
    propertyType: 'SFR',
    dealType: 'BRRRR',
    stage: 'Negotiation',
    purchasePrice: 198000,
    rehabBudget: 52000,
    arv: 295000,
    projectedROI: 18.2,
    totalInvestment: 250000,
    projectedProfit: 45000,
    daysInStage: 5,
    riskLevel: 'Medium',
    atlasScore: 84,
    atlasConfidence: 88,
    keyContact: { id: 'c5', name: 'Robert Hayes' },
    associatedContacts: [{ id: 'c5', name: 'Robert Hayes', role: 'Wholesaler' }],
    stageHistory: [
      { stage: 'Prospect', enteredAt: '2025-02-15T09:00:00Z', exitedAt: '2025-02-24T10:00:00Z' },
      { stage: 'Analysis', enteredAt: '2025-02-24T10:00:00Z', exitedAt: '2025-02-24T16:00:00Z' },
      { stage: 'Negotiation', enteredAt: '2025-02-24T16:00:00Z' },
    ],
    activities: [
      { type: 'email', description: 'Counter offer sent: $195K', timestamp: '2025-02-25T09:00:00Z' },
    ],
    createdAt: '2025-02-15T09:00:00Z',
  },
  {
    id: 'd4',
    propertyAddress: '8912 N 7th St, Phoenix, AZ 85020',
    propertyType: 'Multi-Family',
    dealType: 'Rental',
    stage: 'Prospect',
    purchasePrice: 485000,
    rehabBudget: 35000,
    arv: 535000,
    projectedROI: 7.8,
    totalInvestment: 520000,
    projectedProfit: 15000,
    daysInStage: 2,
    riskLevel: 'Low',
    atlasScore: 79,
    atlasConfidence: 85,
    keyContact: { id: 'c1', name: 'Marcus Webb' },
    associatedContacts: [{ id: 'c1', name: 'Marcus Webb', role: 'Agent' }],
    stageHistory: [{ stage: 'Prospect', enteredAt: '2025-02-27T09:00:00Z' }],
    activities: [],
    createdAt: '2025-02-27T09:00:00Z',
  },
];

const ACTIVITIES: CRMActivity[] = [
  { id: 'a1', type: 'call', description: 'Discussed Monte Vista deal numbers', timestamp: '2025-03-01T14:30:00Z', contactId: 'c1', contactName: 'Marcus Webb', dealId: 'd1', dealAddress: '4521 E Monte Vista Rd' },
  { id: 'a2', type: 'note', description: 'Added Sarah Mitchell as hot lead — interested in JV', timestamp: '2025-03-01T10:00:00Z', contactId: 'c4', contactName: 'Sarah Mitchell' },
  { id: 'a3', type: 'stage_change', description: 'Deal moved to Negotiation', timestamp: '2025-02-24T16:00:00Z', dealId: 'd3', dealAddress: '5547 S 19th Ave' },
  { id: 'a4', type: 'email', description: 'Sent counter offer to Robert Hayes', timestamp: '2025-02-25T09:00:00Z', contactId: 'c5', contactName: 'Robert Hayes', dealId: 'd3', dealAddress: '5547 S 19th Ave' },
  { id: 'a5', type: 'meeting', description: 'Inspection walk-through at Roeser property', timestamp: '2025-02-22T11:00:00Z', contactId: 'c3', contactName: 'David Chen', dealId: 'd2', dealAddress: '1824 W Roeser Rd' },
  { id: 'a6', type: 'analysis', description: 'ATLAS analysis run on 8912 N 7th St', timestamp: '2025-02-27T14:00:00Z', dealId: 'd4', dealAddress: '8912 N 7th St' },
  { id: 'a7', type: 'call', description: 'Rate quote for Roeser deal', timestamp: '2025-02-28T09:15:00Z', contactId: 'c2', contactName: 'Jennifer Torres', dealId: 'd2', dealAddress: '1824 W Roeser Rd' },
  { id: 'a8', type: 'document', description: 'Uploaded inspection report', timestamp: '2025-02-23T16:00:00Z', dealId: 'd2', dealAddress: '1824 W Roeser Rd' },
];

export function getCRMContacts(): CRMContact[] {
  return [...CONTACTS];
}

export function getCRMDeals(): CRMDeal[] {
  return [...DEALS];
}

export function getCRMActivities(): CRMActivity[] {
  return [...ACTIVITIES].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getContactById(id: string): CRMContact | undefined {
  return CONTACTS.find((c) => c.id === id);
}

export function getDealById(id: string): CRMDeal | undefined {
  return DEALS.find((d) => d.id === id);
}
