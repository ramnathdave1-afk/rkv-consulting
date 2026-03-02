'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Copy,
  X,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  PhoneCall,
  CalendarPlus,
  Share2,
  Landmark,
  Home,
  Wrench,
  Package,
  Scale,
  Calculator,
  Building2,
  Handshake,
  User,
  ChevronDown,
  ArrowUpDown,
  Sparkles,
  CheckCircle2,
  FileText,
  Star,
  MapPin,
  DollarSign,
  Percent,
  Shield,
  Award,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type ContactType =
  | 'private_lender'
  | 'real_estate_agent'
  | 'contractor'
  | 'wholesaler'
  | 'attorney'
  | 'cpa_accountant'
  | 'property_manager'
  | 'partner_jv'
  | 'other';

type PreferredContactMethod = 'email' | 'phone' | 'text' | 'in_person';

interface ContactMetadata {
  // Private Lender
  maxLoanAmount?: number;
  typicalRate?: number;
  typicalLTV?: number;
  statesTheyLendIn?: string;
  // Real Estate Agent
  marketsTheyWork?: string;
  investorFriendlyRating?: number;
  // Wholesaler
  marketsTheySource?: string;
  averageDiscount?: number;
  reliabilityRating?: number;
  // Contractor
  specialties?: string;
  hourlyRate?: number;
  licenseNumber?: string;
}

interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  type: ContactType;
  notes: string;
  relationshipScore: number;
  lastContacted: string; // ISO date
  birthday: string;
  preferredContactMethod: PreferredContactMethod;
  metadata: ContactMetadata;
  dealsCount: number;
  deals: { address: string; status: string }[];
  createdAt: string;
}

interface ActivityEntry {
  icon: 'email' | 'call' | 'deal' | 'note';
  description: string;
  timestamp: string;
}

/* ================================================================== */
/*  CONTACT TYPE CONFIG                                                */
/* ================================================================== */

const CONTACT_TYPE_CONFIG: Record<
  ContactType,
  {
    label: string;
    color: string;
    icon: React.ReactNode;
  }
> = {
  private_lender: {
    label: 'Private Lender',
    color: '#c9a84c',
    icon: <Landmark className="w-4 h-4" />,
  },
  real_estate_agent: {
    label: 'Real Estate Agent',
    color: '#c9a84c',
    icon: <Home className="w-4 h-4" />,
  },
  contractor: {
    label: 'Contractor',
    color: '#D97706',
    icon: <Wrench className="w-4 h-4" />,
  },
  wholesaler: {
    label: 'Wholesaler',
    color: '#8B5CF6',
    icon: <Package className="w-4 h-4" />,
  },
  attorney: {
    label: 'Attorney',
    color: '#6B7280',
    icon: <Scale className="w-4 h-4" />,
  },
  cpa_accountant: {
    label: 'CPA/Accountant',
    color: '#10B981',
    icon: <Calculator className="w-4 h-4" />,
  },
  property_manager: {
    label: 'Property Manager',
    color: '#3B82F6',
    icon: <Building2 className="w-4 h-4" />,
  },
  partner_jv: {
    label: 'Partner/JV',
    color: '#c9a84c',
    icon: <Handshake className="w-4 h-4" />,
  },
  other: {
    label: 'Other',
    color: '#4A6080',
    icon: <User className="w-4 h-4" />,
  },
};

const CONTACT_TYPE_OPTIONS = Object.entries(CONTACT_TYPE_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const PREFERRED_METHOD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'text', label: 'Text' },
  { value: 'in_person', label: 'In Person' },
];

const SORT_OPTIONS = [
  { value: 'last_contacted', label: 'Last Contacted' },
  { value: 'name', label: 'Name' },
  { value: 'score', label: 'Relationship Score' },
];

/* ================================================================== */
/*  HELPERS (ID gen)                                                   */
/* ================================================================== */

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

function daysSince(dateStr: string): number {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function daysAgoLabel(dateStr: string): string {
  const d = daysSince(dateStr);
  if (d === 0) return 'Today';
  if (d === 1) return '1 day ago';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${Math.floor(d / 7) > 1 ? 's' : ''} ago`;
  if (d < 365) return `${Math.floor(d / 30)} month${Math.floor(d / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(d / 365)} year${Math.floor(d / 365) > 1 ? 's' : ''} ago`;
}

function daysAgoColor(dateStr: string): string {
  const d = daysSince(dateStr);
  if (d > 30) return '#DC2626';
  if (d >= 14) return '#D97706';
  return '#c9a84c';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatPhone(phone: string): string {
  return phone;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

function getRelationshipSuggestion(contact: Contact): string {
  const d = daysSince(contact.lastContacted);
  const name = contact.name.split(' ')[0];

  switch (contact.type) {
    case 'private_lender':
      return `You haven't contacted ${name} in ${d} days. They funded your last ${contact.dealsCount} deals. Send a portfolio update?`;
    case 'real_estate_agent':
      return `You haven't contacted ${name} in ${d} days. They brought you ${contact.dealsCount} deals. Send a thank you note?`;
    case 'contractor':
      return `You haven't contacted ${name} in ${d} days. Rate their last job to keep your network updated.`;
    case 'wholesaler':
      return `You haven't contacted ${name} in ${d} days. Check if they have new off-market inventory.`;
    case 'attorney':
      return `You haven't contacted ${name} in ${d} days. Review any pending legal matters or entity filings.`;
    case 'cpa_accountant':
      return `You haven't contacted ${name} in ${d} days. Tax season is approaching — schedule a review.`;
    case 'property_manager':
      return `You haven't contacted ${name} in ${d} days. Request a monthly performance report.`;
    case 'partner_jv':
      return `You haven't contacted ${name} in ${d} days. Share your latest deal pipeline update.`;
    default:
      return `You haven't contacted ${name} in ${d} days. Reach out to maintain the relationship.`;
  }
}

function scoreColor(score: number): string {
  if (score >= 8) return '#c9a84c';
  if (score >= 5) return '#D97706';
  return '#DC2626';
}

/* ================================================================== */
/*  INLINE COMPONENTS                                                  */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/*  Stats Bar                                                          */
/* ------------------------------------------------------------------ */

function StatsBar({ contacts }: { contacts: Contact[] }) {
  const stats = useMemo(() => {
    const total = contacts.length;
    const lenders = contacts.filter((c) => c.type === 'private_lender').length;
    const agents = contacts.filter((c) => c.type === 'real_estate_agent').length;
    const contractors = contacts.filter((c) => c.type === 'contractor').length;
    const needFollowUp = contacts.filter((c) => daysSince(c.lastContacted) > 30).length;
    return { total, lenders, agents, contractors, needFollowUp };
  }, [contacts]);

  const statCards = [
    { label: 'Total Contacts', value: stats.total, color: '#c9a84c', icon: <Users className="w-4 h-4" /> },
    { label: 'Private Lenders', value: stats.lenders, color: '#c9a84c', icon: <Landmark className="w-4 h-4" /> },
    { label: 'Agents', value: stats.agents, color: '#c9a84c', icon: <Home className="w-4 h-4" /> },
    { label: 'Contractors', value: stats.contractors, color: '#D97706', icon: <Wrench className="w-4 h-4" /> },
    { label: 'Need Follow-up', value: stats.needFollowUp, color: '#DC2626', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {statCards.map((s) => (
        <div
          key={s.label}
          className="rounded-lg p-4 border"
          style={{
            background: '#111111',
            borderColor: '#1e1e1e',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ backgroundColor: `${s.color}15`, color: s.color }}
            >
              {s.icon}
            </span>
            <span
              className="font-display text-2xl font-bold"
              style={{ color: s.color }}
            >
              {s.value}
            </span>
          </div>
          <p className="text-[11px] font-body text-muted uppercase tracking-wider">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Relationship Score Bar                                             */
/* ------------------------------------------------------------------ */

function ScoreBar({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const color = scoreColor(score);
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn('flex-1 rounded-full overflow-hidden', height)}
        style={{ backgroundColor: '#1e1e1e' }}
      >
        <div
          className={cn('rounded-full transition-all duration-500', height)}
          style={{
            width: `${(score / 10) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span
        className="text-xs font-mono font-semibold min-w-[28px] text-right"
        style={{ color }}
      >
        {score}/10
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Card                                                       */
/* ------------------------------------------------------------------ */

function ContactCard({
  contact,
  onClick,
}: {
  contact: Contact;
  onClick: () => void;
}) {
  const cfg = CONTACT_TYPE_CONFIG[contact.type];
  const lastContactedDays = daysSince(contact.lastContacted);

  const handleCopy = useCallback(
    (text: string, label: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    },
    [],
  );

  return (
    <Card
      variant="interactive"
      padding="none"
      className="group relative overflow-hidden"
      onClick={onClick}
    >
      {/* Colored accent stripe */}
      <div
        className="h-[2px] w-full"
        style={{ backgroundColor: cfg.color }}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 font-display font-bold text-sm"
            style={{
              backgroundColor: `${cfg.color}20`,
              color: cfg.color,
            }}
          >
            {getInitials(contact.name)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-white text-sm truncate">
              {contact.name}
            </h3>
            <p className="text-xs text-muted truncate">{contact.company}</p>
          </div>

          {/* Type badge */}
          <Badge
            variant="plan"
            planColor={cfg.color}
            size="sm"
            className="shrink-0"
          >
            {cfg.label}
          </Badge>
        </div>

        {/* Contact details */}
        <div className="space-y-1.5 mb-3">
          {contact.phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="w-3 h-3 text-muted shrink-0" />
              <span className="text-white/80 truncate flex-1 font-body">
                {formatPhone(contact.phone)}
              </span>
              <button
                onClick={handleCopy(contact.phone, 'Phone')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/5"
              >
                <Copy className="w-3 h-3 text-muted hover:text-white" />
              </button>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-xs">
              <Mail className="w-3 h-3 text-muted shrink-0" />
              <span className="text-white/80 truncate flex-1 font-body">
                {truncate(contact.email, 28)}
              </span>
              <button
                onClick={handleCopy(contact.email, 'Email')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/5"
              >
                <Copy className="w-3 h-3 text-muted hover:text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Last contacted */}
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className="w-3 h-3" style={{ color: daysAgoColor(contact.lastContacted) }} />
          <span
            className="text-[11px] font-body"
            style={{ color: daysAgoColor(contact.lastContacted) }}
          >
            {daysAgoLabel(contact.lastContacted)}
          </span>
          {lastContactedDays > 30 && (
            <span className="text-[10px] font-body text-red/80 ml-1">
              Overdue
            </span>
          )}
        </div>

        {/* Score */}
        <div className="mb-3">
          <ScoreBar score={contact.relationshipScore} size="sm" />
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          {contact.dealsCount > 0 && (
            <Badge variant="muted" size="sm">
              {contact.dealsCount} deal{contact.dealsCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {contact.notes && (
            <p className="text-[10px] text-muted truncate max-w-[160px] font-body">
              {truncate(contact.notes, 50)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Contact Modal                                                  */
/* ------------------------------------------------------------------ */

const EMPTY_FORM = {
  name: '',
  company: '',
  email: '',
  phone: '',
  type: 'other' as ContactType,
  relationshipScore: 5,
  birthday: '',
  preferredContactMethod: 'email' as PreferredContactMethod,
  notes: '',
  // Type-specific
  maxLoanAmount: '',
  typicalRate: '',
  typicalLTV: '',
  statesTheyLendIn: '',
  marketsTheyWork: '',
  investorFriendlyRating: '',
  marketsTheySource: '',
  averageDiscount: '',
  reliabilityRating: '',
  specialties: '',
  hourlyRate: '',
  licenseNumber: '',
};

function AddContactModal({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (contact: Contact) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const updateField = useCallback(
    (field: string, value: string | number) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const metadata: ContactMetadata = {};
    if (form.type === 'private_lender') {
      if (form.maxLoanAmount) metadata.maxLoanAmount = Number(form.maxLoanAmount);
      if (form.typicalRate) metadata.typicalRate = Number(form.typicalRate);
      if (form.typicalLTV) metadata.typicalLTV = Number(form.typicalLTV);
      if (form.statesTheyLendIn) metadata.statesTheyLendIn = form.statesTheyLendIn;
    } else if (form.type === 'real_estate_agent') {
      if (form.marketsTheyWork) metadata.marketsTheyWork = form.marketsTheyWork;
      if (form.investorFriendlyRating) metadata.investorFriendlyRating = Number(form.investorFriendlyRating);
    } else if (form.type === 'wholesaler') {
      if (form.marketsTheySource) metadata.marketsTheySource = form.marketsTheySource;
      if (form.averageDiscount) metadata.averageDiscount = Number(form.averageDiscount);
      if (form.reliabilityRating) metadata.reliabilityRating = Number(form.reliabilityRating);
    } else if (form.type === 'contractor') {
      if (form.specialties) metadata.specialties = form.specialties;
      if (form.hourlyRate) metadata.hourlyRate = Number(form.hourlyRate);
      if (form.licenseNumber) metadata.licenseNumber = form.licenseNumber;
    }

    const newContact: Contact = {
      id: generateId(),
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      type: form.type,
      notes: form.notes.trim(),
      relationshipScore: Number(form.relationshipScore) || 5,
      lastContacted: new Date().toISOString().slice(0, 10),
      birthday: form.birthday,
      preferredContactMethod: form.preferredContactMethod,
      metadata,
      dealsCount: 0,
      deals: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };

    onSave(newContact);
    setForm(EMPTY_FORM);
    onOpenChange(false);
    toast.success(`${newContact.name} added to contacts`);
  }, [form, onSave, onOpenChange]);

  const handleClose = useCallback(() => {
    setForm(EMPTY_FORM);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent maxWidth="lg" className="max-h-[85vh] overflow-y-auto">
        <ModalHeader
          title="Add New Contact"
          description="Add a new contact to your network"
        />

        <div className="px-6 py-4 space-y-4">
          {/* Core fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Name"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
            <Input
              label="Company"
              placeholder="Company name"
              value={form.company}
              onChange={(e) => updateField('company', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              placeholder="email@example.com"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            <Input
              label="Phone"
              placeholder="(555) 555-0100"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type"
              options={CONTACT_TYPE_OPTIONS}
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
            />
            <div className="w-full">
              <label className="label block text-[10px] uppercase tracking-wider font-body text-muted mb-1.5">
                Relationship Score
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={form.relationshipScore}
                  onChange={(e) => updateField('relationshipScore', Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #c9a84c 0%, #c9a84c ${((Number(form.relationshipScore) - 1) / 9) * 100}%, #1e1e1e ${((Number(form.relationshipScore) - 1) / 9) * 100}%, #1e1e1e 100%)`,
                  }}
                />
                <span className="font-mono text-sm font-bold text-white min-w-[32px] text-center">
                  {form.relationshipScore}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Birthday"
              type="date"
              value={form.birthday}
              onChange={(e) => updateField('birthday', e.target.value)}
            />
            <Select
              label="Preferred Contact Method"
              options={PREFERRED_METHOD_OPTIONS}
              value={form.preferredContactMethod}
              onChange={(e) => updateField('preferredContactMethod', e.target.value)}
            />
          </div>

          <Textarea
            label="Notes"
            placeholder="Add notes about this contact..."
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="min-h-[80px]"
          />

          {/* Type-specific fields */}
          {form.type === 'private_lender' && (
            <div
              className="rounded-lg border p-4 space-y-4"
              style={{ backgroundColor: '#c9a84c10', borderColor: '#c9a84c30' }}
            >
              <p className="text-xs font-display font-semibold uppercase tracking-wider" style={{ color: '#c9a84c' }}>
                Private Lender Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Max Loan Amount"
                  placeholder="$2,500,000"
                  type="number"
                  value={form.maxLoanAmount}
                  onChange={(e) => updateField('maxLoanAmount', e.target.value)}
                  icon={<DollarSign className="w-4 h-4" />}
                />
                <Input
                  label="Typical Rate (%)"
                  placeholder="8.5"
                  type="number"
                  value={form.typicalRate}
                  onChange={(e) => updateField('typicalRate', e.target.value)}
                  icon={<Percent className="w-4 h-4" />}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Typical LTV (%)"
                  placeholder="75"
                  type="number"
                  value={form.typicalLTV}
                  onChange={(e) => updateField('typicalLTV', e.target.value)}
                  icon={<Percent className="w-4 h-4" />}
                />
                <Input
                  label="States They Lend In"
                  placeholder="CA, NV, AZ"
                  value={form.statesTheyLendIn}
                  onChange={(e) => updateField('statesTheyLendIn', e.target.value)}
                  icon={<MapPin className="w-4 h-4" />}
                />
              </div>
            </div>
          )}

          {form.type === 'real_estate_agent' && (
            <div
              className="rounded-lg border p-4 space-y-4"
              style={{ backgroundColor: '#c9a84c10', borderColor: '#c9a84c30' }}
            >
              <p className="text-xs font-display font-semibold uppercase tracking-wider" style={{ color: '#c9a84c' }}>
                Agent Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Markets They Work"
                  placeholder="Phoenix, Scottsdale, Tempe"
                  value={form.marketsTheyWork}
                  onChange={(e) => updateField('marketsTheyWork', e.target.value)}
                  icon={<MapPin className="w-4 h-4" />}
                />
                <div className="w-full">
                  <label className="label block text-[10px] uppercase tracking-wider font-body text-muted mb-1.5">
                    Investor-Friendly Rating (1-5)
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => updateField('investorFriendlyRating', String(star))}
                        className="p-0.5 transition-colors"
                      >
                        <Star
                          className="w-5 h-5"
                          fill={star <= Number(form.investorFriendlyRating || 0) ? '#c9a84c' : 'transparent'}
                          stroke={star <= Number(form.investorFriendlyRating || 0) ? '#c9a84c' : '#4A6080'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {form.type === 'wholesaler' && (
            <div
              className="rounded-lg border p-4 space-y-4"
              style={{ backgroundColor: '#8B5CF610', borderColor: '#8B5CF630' }}
            >
              <p className="text-xs font-display font-semibold uppercase tracking-wider" style={{ color: '#8B5CF6' }}>
                Wholesaler Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Markets They Source"
                  placeholder="Houston, Dallas"
                  value={form.marketsTheySource}
                  onChange={(e) => updateField('marketsTheySource', e.target.value)}
                  icon={<MapPin className="w-4 h-4" />}
                />
                <Input
                  label="Average Discount (%)"
                  placeholder="22"
                  type="number"
                  value={form.averageDiscount}
                  onChange={(e) => updateField('averageDiscount', e.target.value)}
                  icon={<Percent className="w-4 h-4" />}
                />
              </div>
              <div>
                <label className="label block text-[10px] uppercase tracking-wider font-body text-muted mb-1.5">
                  Reliability Rating (1-5)
                </label>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateField('reliabilityRating', String(star))}
                      className="p-0.5 transition-colors"
                    >
                      <Star
                        className="w-5 h-5"
                        fill={star <= Number(form.reliabilityRating || 0) ? '#8B5CF6' : 'transparent'}
                        stroke={star <= Number(form.reliabilityRating || 0) ? '#8B5CF6' : '#4A6080'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {form.type === 'contractor' && (
            <div
              className="rounded-lg border p-4 space-y-4"
              style={{ backgroundColor: '#D9770610', borderColor: '#D9770630' }}
            >
              <p className="text-xs font-display font-semibold uppercase tracking-wider" style={{ color: '#D97706' }}>
                Contractor Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Specialties"
                  placeholder="Kitchen/Bath, Roofing, HVAC"
                  value={form.specialties}
                  onChange={(e) => updateField('specialties', e.target.value)}
                  icon={<Wrench className="w-4 h-4" />}
                />
                <Input
                  label="Hourly Rate ($)"
                  placeholder="85"
                  type="number"
                  value={form.hourlyRate}
                  onChange={(e) => updateField('hourlyRate', e.target.value)}
                  icon={<DollarSign className="w-4 h-4" />}
                />
              </div>
              <Input
                label="License Number"
                placeholder="ROC-123456"
                value={form.licenseNumber}
                onChange={(e) => updateField('licenseNumber', e.target.value)}
                icon={<Shield className="w-4 h-4" />}
              />
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="solid" onClick={handleSave}>
            Add Contact
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Detail Side Panel                                          */
/* ------------------------------------------------------------------ */

function ContactDetailPanel({
  contact,
  onClose,
}: {
  contact: Contact;
  onClose: () => void;
}) {
  const cfg = CONTACT_TYPE_CONFIG[contact.type];
  const [showCallLog, setShowCallLog] = useState(false);
  const [callOutcome, setCallOutcome] = useState('connected');
  const [callNotes, setCallNotes] = useState('');
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Fetch real activities for this contact
  useEffect(() => {
    let cancelled = false;
    const fetchActivities = async () => {
      setActivitiesLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('contact_activities')
          .select('id, type, description, created_at')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!cancelled && !error && data) {
          const mapped: ActivityEntry[] = data.map((row: { type: string; description: string; created_at: string }) => ({
            icon: (['email', 'call', 'deal', 'note'].includes(row.type) ? row.type : 'note') as ActivityEntry['icon'],
            description: row.description,
            timestamp: daysAgoLabel(row.created_at),
          }));
          setActivities(mapped);
        }
      } catch {
        // silently fail — empty activities is fine
      } finally {
        if (!cancelled) setActivitiesLoading(false);
      }
    };
    fetchActivities();
    return () => { cancelled = true; };
  }, [contact.id]);

  const activityIcons: Record<string, React.ReactNode> = {
    email: <Send className="w-3.5 h-3.5" style={{ color: '#c9a84c' }} />,
    call: <PhoneCall className="w-3.5 h-3.5" style={{ color: '#c9a84c' }} />,
    deal: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#8B5CF6' }} />,
    note: <FileText className="w-3.5 h-3.5" style={{ color: '#D97706' }} />,
  };

  const dealStageBadge = (stage: string) => {
    const stageMap: Record<string, { variant: 'success' | 'warning' | 'info' | 'danger' | 'muted' | 'violet'; label: string }> = {
      'Closed': { variant: 'success', label: 'Closed' },
      'Completed': { variant: 'success', label: 'Completed' },
      'Under Contract': { variant: 'warning', label: 'Under Contract' },
      'Due Diligence': { variant: 'info', label: 'Due Diligence' },
      'Active': { variant: 'info', label: 'Active' },
      'In Progress': { variant: 'warning', label: 'In Progress' },
      'Prospecting': { variant: 'muted', label: 'Prospecting' },
      'Expired': { variant: 'danger', label: 'Expired' },
    };
    const s = stageMap[stage] || { variant: 'muted' as const, label: stage };
    return <Badge variant={s.variant} size="sm">{s.label}</Badge>;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 w-full sm:w-[480px] h-full overflow-y-auto border-l animate-slide-in-right"
        style={{
          background: '#111111',
          borderColor: '#1e1e1e',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-full shrink-0 font-display font-bold text-xl"
              style={{
                backgroundColor: `${cfg.color}20`,
                color: cfg.color,
              }}
            >
              {getInitials(contact.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-bold text-white text-lg">
                {contact.name}
              </h2>
              <p className="text-sm text-muted font-body">{contact.company}</p>
              <div className="mt-2">
                <Badge variant="plan" planColor={cfg.color} size="sm" dot>
                  <span className="flex items-center gap-1">
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-6" style={{ backgroundColor: '#1e1e1e' }} />

        {/* Contact info */}
        <div className="px-6 py-4 space-y-3">
          <p className="text-[10px] font-body text-muted uppercase tracking-wider mb-2">
            Contact Information
          </p>
          <div className="space-y-2.5">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors font-body"
              >
                <Phone className="w-4 h-4 text-muted" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors font-body"
              >
                <Mail className="w-4 h-4 text-muted" />
                {contact.email}
              </a>
            )}
            {contact.birthday && (
              <div className="flex items-center gap-3 text-sm text-white/80 font-body">
                <Calendar className="w-4 h-4 text-muted" />
                {new Date(contact.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-white/80 font-body">
              <MessageSquare className="w-4 h-4 text-muted" />
              Prefers {PREFERRED_METHOD_OPTIONS.find((o) => o.value === contact.preferredContactMethod)?.label}
            </div>
          </div>

          {/* Relationship score */}
          <div className="pt-2">
            <p className="text-[10px] font-body text-muted uppercase tracking-wider mb-2">
              Relationship Score
            </p>
            <ScoreBar score={contact.relationshipScore} />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-6" style={{ backgroundColor: '#1e1e1e' }} />

        {/* One-click action buttons */}
        <div className="px-6 py-4">
          <p className="text-[10px] font-body text-muted uppercase tracking-wider mb-3">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Send className="w-3.5 h-3.5" />}
              onClick={() => toast.info('Opening compose...')}
            >
              Send Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<PhoneCall className="w-3.5 h-3.5" />}
              onClick={() => setShowCallLog(!showCallLog)}
            >
              Log Call
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<CalendarPlus className="w-3.5 h-3.5" />}
              onClick={() => toast.success('Follow-up added to calendar')}
            >
              Follow-up
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Share2 className="w-3.5 h-3.5" />}
              onClick={() => toast.info('Sending deal analysis...')}
            >
              Share Deal
            </Button>
          </div>

          {/* Inline call log form */}
          {showCallLog && (
            <div
              className="mt-3 rounded-lg border p-3 space-y-3"
              style={{ backgroundColor: '#080808', borderColor: '#1e1e1e' }}
            >
              <Select
                label="Call Outcome"
                options={[
                  { value: 'connected', label: 'Connected' },
                  { value: 'voicemail', label: 'Left Voicemail' },
                  { value: 'no_answer', label: 'No Answer' },
                  { value: 'busy', label: 'Busy' },
                ]}
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
              />
              <Textarea
                label="Notes"
                placeholder="What did you discuss?"
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCallLog(false);
                    setCallNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  size="sm"
                  onClick={() => {
                    toast.success('Call logged successfully');
                    setShowCallLog(false);
                    setCallNotes('');
                  }}
                >
                  Save Call
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px mx-6" style={{ backgroundColor: '#1e1e1e' }} />

        {/* Relationship Intelligence */}
        <div className="px-6 py-4">
          <p className="text-[10px] font-body text-muted uppercase tracking-wider mb-3">
            Relationship Intelligence
          </p>
          <div
            className="rounded-lg border p-4"
            style={{
              backgroundColor: '#c9a84c10',
              borderColor: '#c9a84c25',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{ backgroundColor: '#c9a84c20', color: '#c9a84c' }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs text-white/80 font-body leading-relaxed">
                {getRelationshipSuggestion(contact)}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-11">
              <Button
                variant="solid"
                size="sm"
                onClick={() => toast.success('Action initiated')}
              >
                Do It
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info('Reminder set for later')}
              >
                Remind Me Later
              </Button>
            </div>
          </div>
        </div>

        {/* Type-specific details */}
        {Object.keys(contact.metadata).length > 0 && (
          <>
            <div className="h-px mx-6" style={{ backgroundColor: '#1e1e1e' }} />
            <div className="px-6 py-4">
              <p className="text-[10px] font-body text-muted uppercase tracking-wider mb-3">
                {cfg.label} Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                {contact.metadata.maxLoanAmount !== undefined && (
                  <DetailCell
                    label="Max Loan Amount"
                    value={`$${contact.metadata.maxLoanAmount.toLocaleString()}`}
                    icon={<DollarSign className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.typicalRate !== undefined && (
                  <DetailCell
                    label="Typical Rate"
                    value={`${contact.metadata.typicalRate}%`}
                    icon={<Percent className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.typicalLTV !== undefined && (
                  <DetailCell
                    label="Typical LTV"
                    value={`${contact.metadata.typicalLTV}%`}
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.statesTheyLendIn && (
                  <DetailCell
                    label="States"
                    value={contact.metadata.statesTheyLendIn}
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.marketsTheyWork && (
                  <DetailCell
                    label="Markets"
                    value={contact.metadata.marketsTheyWork}
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.investorFriendlyRating !== undefined && (
                  <DetailCell
                    label="Investor-Friendly"
                    value={`${'★'.repeat(contact.metadata.investorFriendlyRating)}${'☆'.repeat(5 - contact.metadata.investorFriendlyRating)}`}
                    icon={<Star className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.marketsTheySource && (
                  <DetailCell
                    label="Source Markets"
                    value={contact.metadata.marketsTheySource}
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.averageDiscount !== undefined && (
                  <DetailCell
                    label="Avg. Discount"
                    value={`${contact.metadata.averageDiscount}%`}
                    icon={<Percent className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.reliabilityRating !== undefined && (
                  <DetailCell
                    label="Reliability"
                    value={`${'★'.repeat(contact.metadata.reliabilityRating)}${'☆'.repeat(5 - contact.metadata.reliabilityRating)}`}
                    icon={<Award className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.specialties && (
                  <DetailCell
                    label="Specialties"
                    value={contact.metadata.specialties}
                    icon={<Wrench className="w-3.5 h-3.5" />}
                    color={cfg.color}
                    span
                  />
                )}
                {contact.metadata.hourlyRate !== undefined && (
                  <DetailCell
                    label="Hourly Rate"
                    value={`$${contact.metadata.hourlyRate}/hr`}
                    icon={<DollarSign className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
                {contact.metadata.licenseNumber && (
                  <DetailCell
                    label="License #"
                    value={contact.metadata.licenseNumber}
                    icon={<Shield className="w-3.5 h-3.5" />}
                    color={cfg.color}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Activity Timeline */}
        <div className="h-px mx-6" style={{ backgroundColor: '#1e1e1e' }} />
        <div className="px-6 py-4">
          <p className="text-[10px] font-body text-muted uppercase tracking-wider mb-3">
            Activity Timeline
          </p>
          {activitiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full animate-pulse" style={{ backgroundColor: '#1e1e1e' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 rounded animate-pulse w-3/4" style={{ backgroundColor: '#1e1e1e' }} />
                    <div className="h-2.5 rounded animate-pulse w-1/3" style={{ backgroundColor: '#1e1e1e' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-0">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  {/* Timeline line */}
                  {i < activities.length - 1 && (
                    <div
                      className="absolute left-[13px] top-7 w-px h-[calc(100%-4px)]"
                      style={{ backgroundColor: '#1e1e1e' }}
                    />
                  )}
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 relative z-10"
                    style={{ backgroundColor: '#111111', border: '1px solid #1e1e1e' }}
                  >
                    {activityIcons[a.icon]}
                  </div>
                  <div className="pb-4 flex-1">
                    <p className="text-xs text-white/80 font-body">{a.description}</p>
                    <p className="text-[10px] text-muted font-body mt-0.5">{a.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted font-body">No activity yet for this contact.</p>
          )}
        </div>

        {/* Deals Associated */}
        {contact.deals.length > 0 && (
          <>
            <div className="h-px mx-6" style={{ backgroundColor: '#1e1e1e' }} />
            <div className="px-6 py-4 pb-8">
              <p className="text-[10px] font-body text-muted uppercase tracking-wider mb-3">
                Deals Associated
              </p>
              <div className="space-y-2">
                {contact.deals.map((deal, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3"
                    style={{ backgroundColor: '#080808', borderColor: '#1e1e1e' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-muted" />
                      <span className="text-xs text-white font-body">{deal.address}</span>
                    </div>
                    {dealStageBadge(deal.status)}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail Cell (for type-specific details grid)                       */
/* ------------------------------------------------------------------ */

function DetailCell({
  label,
  value,
  icon,
  color,
  span = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  span?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        span && 'col-span-2',
      )}
      style={{ backgroundColor: '#080808', borderColor: '#1e1e1e' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }} className="opacity-60">{icon}</span>
        <span className="text-[10px] font-body text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm text-white font-body">{value}</p>
    </div>
  );
}

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */

export default function ContactsPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('last_contacted');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Fetch contacts from Supabase
  const fetchContacts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      // Fetch contacts
      const { data: contactRows, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('last_contacted', { ascending: false, nullsFirst: false });

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
        return;
      }

      if (!contactRows) {
        setContacts([]);
        return;
      }

      // Fetch deal counts per contact via deal_contacts join
      const contactIds = contactRows.map((r: { id: string }) => r.id);
      const dealCountMap: Record<string, number> = {};
      const dealDetailsMap: Record<string, { address: string; status: string }[]> = {};

      if (contactIds.length > 0) {
        const { data: dealLinks } = await supabase
          .from('deal_contacts')
          .select('contact_id, deal_id, deals(address, status)')
          .in('contact_id', contactIds);

        if (dealLinks) {
          for (const link of dealLinks) {
            const cId = (link as { contact_id: string }).contact_id;
            dealCountMap[cId] = (dealCountMap[cId] || 0) + 1;
            if (!dealDetailsMap[cId]) dealDetailsMap[cId] = [];
            const dealData = (link as { deals: { address: string; status: string } | null }).deals;
            if (dealData) {
              dealDetailsMap[cId].push({
                address: dealData.address || '',
                status: dealData.status || '',
              });
            }
          }
        }
      }

      // Map DB rows to Contact interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: Contact[] = contactRows.map((row: any) => ({
        id: row.id,
        name: row.name || '',
        company: row.company || '',
        email: row.email || '',
        phone: row.phone || '',
        type: (row.type || 'other') as ContactType,
        notes: row.notes || '',
        relationshipScore: row.relationship_score ?? 5,
        lastContacted: row.last_contacted || row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        birthday: row.birthday || '',
        preferredContactMethod: (row.preferred_contact_method || 'email') as PreferredContactMethod,
        metadata: row.metadata || {},
        dealsCount: dealCountMap[row.id] || 0,
        deals: dealDetailsMap[row.id] || [],
        createdAt: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      }));

      setContacts(mapped);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Fetch on mount
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q),
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.type === typeFilter);
    }

    // Sort
    switch (sortBy) {
      case 'last_contacted':
        result.sort((a, b) => new Date(b.lastContacted).getTime() - new Date(a.lastContacted).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'score':
        result.sort((a, b) => b.relationshipScore - a.relationshipScore);
        break;
    }

    return result;
  }, [contacts, search, typeFilter, sortBy]);

  const handleAddContact = useCallback(async (newContact: Contact) => {
    try {
      const userId = userIdRef.current;
      if (!userId) {
        toast.error('Not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          name: newContact.name,
          company: newContact.company || null,
          email: newContact.email || null,
          phone: newContact.phone || null,
          type: newContact.type,
          notes: newContact.notes || null,
          relationship_score: newContact.relationshipScore,
          last_contacted: newContact.lastContacted || null,
          birthday: newContact.birthday || null,
          preferred_contact_method: newContact.preferredContactMethod,
          metadata: newContact.metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding contact:', error);
        toast.error('Failed to save contact');
        return;
      }

      if (data) {
        // Refetch to ensure consistency
        fetchContacts();
      }
    } catch (err) {
      console.error('Error adding contact:', err);
      toast.error('Failed to save contact');
    }
  }, [supabase, fetchContacts]);

  const handleSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedContact(null);
  }, []);

  // Close panel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedContact(null);
        setShowAddModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white tracking-tight">
            Contacts
          </h1>
          <p className="text-sm text-muted font-body mt-1">
            Manage your real estate network and relationships
          </p>
        </div>
        <Button
          variant="solid"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Add Contact
        </Button>
      </div>

      {/* Stats Bar */}
      <StatsBar contacts={contacts} />

      {/* Search / Filter / Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search contacts by name, company, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full h-10 pl-10 pr-4 text-sm font-body text-white rounded-lg border',
              'bg-transparent placeholder:text-muted-deep',
              'focus:outline-none focus:border-gold/50 focus:shadow-glow-sm',
              'transition-all duration-200',
            )}
            style={{ borderColor: '#1e1e1e', backgroundColor: '#111111' }}
          />
        </div>

        <div className="flex gap-3">
          {/* Type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={cn(
                'h-10 pl-3 pr-8 text-sm font-body text-white rounded-lg border',
                'bg-transparent appearance-none cursor-pointer',
                'focus:outline-none focus:border-gold/50',
                'transition-all duration-200',
              )}
              style={{ borderColor: '#1e1e1e', backgroundColor: '#111111' }}
            >
              <option value="all">All Types</option>
              {CONTACT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={cn(
                'h-10 pl-3 pr-8 text-sm font-body text-white rounded-lg border',
                'bg-transparent appearance-none cursor-pointer',
                'focus:outline-none focus:border-gold/50',
                'transition-all duration-200',
              )}
              style={{ borderColor: '#1e1e1e', backgroundColor: '#111111' }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Contact Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border overflow-hidden"
              style={{ background: '#111111', borderColor: '#1e1e1e' }}
            >
              <div className="h-[2px] w-full animate-pulse" style={{ backgroundColor: '#1e1e1e' }} />
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full animate-pulse" style={{ backgroundColor: '#1e1e1e' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded animate-pulse w-2/3" style={{ backgroundColor: '#1e1e1e' }} />
                    <div className="h-3 rounded animate-pulse w-1/2" style={{ backgroundColor: '#1e1e1e' }} />
                  </div>
                  <div className="h-5 w-20 rounded animate-pulse" style={{ backgroundColor: '#1e1e1e' }} />
                </div>
                <div className="space-y-2">
                  <div className="h-3 rounded animate-pulse w-3/4" style={{ backgroundColor: '#1e1e1e' }} />
                  <div className="h-3 rounded animate-pulse w-2/3" style={{ backgroundColor: '#1e1e1e' }} />
                </div>
                <div className="h-2 rounded-full animate-pulse" style={{ backgroundColor: '#1e1e1e' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filteredContacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => handleSelectContact(contact)}
            />
          ))}
        </div>
      ) : (
        <div className="py-12">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div
              className="flex items-center justify-center w-16 h-16 mb-5 rounded-lg"
              style={{ backgroundColor: '#c9a84c15', color: '#c9a84c', border: '1px solid #c9a84c30' }}
            >
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-display font-semibold text-lg text-white mb-2">
              No contacts found
            </h3>
            <p className="text-sm text-muted font-body leading-relaxed mb-6">
              {search || typeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first contact.'}
            </p>
            {!search && typeFilter === 'all' && (
              <Button
                variant="outline"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowAddModal(true)}
              >
                Add Your First Contact
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Contact count */}
      {filteredContacts.length > 0 && (
        <div className="flex justify-center">
          <p className="text-xs text-muted font-body">
            Showing {filteredContacts.length} of {contacts.length} contacts
          </p>
        </div>
      )}

      {/* Add Contact Modal */}
      <AddContactModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSave={handleAddContact}
      />

      {/* Contact Detail Side Panel */}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
