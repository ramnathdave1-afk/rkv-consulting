/**
 * CRM type definitions — contacts, deals, activities.
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
