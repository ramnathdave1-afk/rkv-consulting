'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { useReducedMotion, variantEntranceFromBelow, variantReduced, transitionEntrance, transitionReduced } from '@/lib/motion';
import {
  Users,
  GitBranch,
  Activity,
  Plus,
  Phone,
  Mail,
  Calendar,
  FileText,
  X,
  PhoneCall,
  Send,
  CalendarPlus,
  StickyNote,
  LayoutGrid,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import {
  getCRMContacts,
  getCRMDeals,
  getCRMActivities,
  getContactById,
  getDealById,
  type CRMContact,
  type CRMDeal,
  type CRMActivity,
  type ContactTag,
  type LeadSource,
  type DealStage,
  type ActivityType,
} from '@/lib/crm-data';
import { useCRMStore } from '@/lib/crm-store';

const CRM_SUB_TABS = [
  { id: 'contacts' as const, label: 'Contacts', icon: Users },
  { id: 'deals' as const, label: 'Deals', icon: GitBranch },
  { id: 'activity' as const, label: 'Activity Feed', icon: Activity },
];

const TAG_COLORS: Record<ContactTag, string> = {
  Buyer: 'bg-primary/15 text-primary border-primary/30',
  Seller: 'bg-red/15 text-red border-red/30',
  Broker: 'bg-gold/15 text-gold border-gold/30',
  Lender: 'bg-green/15 text-green border-green/30',
  Contractor: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  Partner: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Agent: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const LEAD_SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'Referral', label: 'Referral' },
  { value: 'Cold Outreach', label: 'Cold Outreach' },
  { value: 'Inbound', label: 'Inbound' },
  { value: 'Network Event', label: 'Network Event' },
  { value: 'Other', label: 'Other' },
];

/** Variant set for initial/animate — compatible with Framer Motion */
type VariantSet = { hidden: Record<string, number>; visible: Record<string, number> };

const DEAL_STAGES: DealStage[] = [
  'Prospect',
  'Analysis',
  'Due Diligence',
  'Negotiation',
  'Under Contract',
  'Closed',
  'Dead',
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

/* ------------------------------------------------------------------ */
/*  CRM Page                                                            */
/* ------------------------------------------------------------------ */

export default function CRMPage() {
  const reduced = useReducedMotion();
  const entranceVariant: VariantSet = reduced ? variantReduced : variantEntranceFromBelow;
  const transition = reduced ? transitionReduced : { ...transitionEntrance, duration: 0.35 };
  const stagger = reduced ? 0 : 0.03;

  const [subTab, setSubTab] = useState<'contacts' | 'deals' | 'activity'>('contacts');
  const [dealsViewMode, setDealsViewMode] = useState<'kanban' | 'list'>('kanban');
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [activities, setActivities] = useState<CRMActivity[]>([]);

  const {
    selectedContactId,
    setSelectedContact,
    setDeals: setStoreDeals,
    addContactModalOpen,
    setAddContactModalOpen,
    dealDrawerDealId,
    setDealDrawerDealId,
  } = useCRMStore();

  const refetchCRM = useCallback(async () => {
    try {
      const [contactsRes, dealsRes, activitiesRes] = await Promise.all([
        fetch('/api/crm/contacts'),
        fetch('/api/crm/deals'),
        fetch('/api/crm/activities'),
      ]);
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(Array.isArray(data) ? data : []);
      } else setContacts(getCRMContacts());
      if (dealsRes.ok) {
        const data = await dealsRes.json();
        const d = Array.isArray(data) ? data : getCRMDeals();
        setDeals(d);
        setStoreDeals(d);
      } else {
        const d = getCRMDeals();
        setDeals(d);
        setStoreDeals(d);
      }
      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(Array.isArray(data) ? data : getCRMActivities());
      } else setActivities(getCRMActivities());
    } catch {
      setContacts(getCRMContacts());
      const d = getCRMDeals();
      setDeals(d);
      setStoreDeals(d);
      setActivities(getCRMActivities());
    }
  }, [setStoreDeals]);

  useEffect(() => {
    refetchCRM();
  }, [refetchCRM]);

  const selectedContact = selectedContactId ? (contacts.find((c) => c.id === selectedContactId) ?? getContactById(selectedContactId)) : null;

  return (
    <div className="space-y-6">
      {/* Sub-nav: Contacts | Deals | Activity Feed */}
      <motion.nav
        initial={entranceVariant.hidden}
        animate={entranceVariant.visible}
        transition={transition}
        className="flex items-center gap-1 p-1 rounded-lg bg-[#111111] border border-[#1e1e1e] w-fit"
      >
        {CRM_SUB_TABS.map((tab) => {
          const Icon = tab.icon as React.ComponentType<{ className?: string; strokeWidth?: number }>;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md font-body text-[13px] transition-colors',
                subTab === tab.id
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'text-muted hover:text-white border border-transparent'
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </motion.nav>

      <AnimatePresence mode="wait">
        {subTab === 'contacts' && (
          <motion.div
            key="contacts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={transition}
            className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 min-h-[60vh]"
          >
            <ContactsList
              contacts={contacts}
              selectedId={selectedContactId}
              onSelect={setSelectedContact}
              onAddContact={() => setAddContactModalOpen(true)}
              reduced={reduced}
              stagger={stagger}
              entranceVariant={entranceVariant}
              transition={transition}
            />
            <ContactDetail
              contact={selectedContact}
              onClose={() => setSelectedContact(null)}
              reduced={reduced}
              entranceVariant={entranceVariant}
              transition={transition}
            />
          </motion.div>
        )}
        {subTab === 'deals' && (
          <motion.div
            key="deals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <DealsView
              deals={deals}
              setDeals={setDeals}
              viewMode={dealsViewMode}
              onViewModeChange={setDealsViewMode}
              onOpenDeal={setDealDrawerDealId}
              reduced={reduced}
              entranceVariant={entranceVariant}
              transition={transition}
              stagger={stagger}
            />
          </motion.div>
        )}
        {subTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <ActivityFeedView
              activities={activities}
              reduced={reduced}
              entranceVariant={entranceVariant}
              transition={transition}
              stagger={stagger}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Contact Modal */}
      <AddContactModal
        open={addContactModalOpen}
        onClose={() => setAddContactModalOpen(false)}
        onSaved={async () => {
          setAddContactModalOpen(false);
          await refetchCRM();
        }}
      />

      {/* Deal Detail Drawer */}
      <DealDrawer
        deal={dealDrawerDealId ? deals.find((d) => d.id === dealDrawerDealId) ?? getDealById(dealDrawerDealId) : null}
        open={dealDrawerDealId != null}
        onClose={() => setDealDrawerDealId(null)}
        reduced={reduced}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contacts List (40%)                                                */
/* ------------------------------------------------------------------ */

function ContactsList({
  contacts,
  selectedId,
  onSelect,
  onAddContact,
  reduced,
  stagger,
  entranceVariant,
  transition,
}: {
  contacts: CRMContact[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAddContact: () => void;
  reduced: boolean;
  stagger: number;
  entranceVariant: VariantSet;
  transition: object;
}) {
  return (
    <div className="rounded-lg border border-[#1e1e1e] bg-[#111111] overflow-hidden flex flex-col">
      <div className="p-4 border-b border-[#1e1e1e] flex items-center justify-between">
        <span className="label text-gold text-[13px]">Contacts</span>
        <Button variant="ghost" size="sm" onClick={onAddContact} className="text-gold hover:bg-gold/10">
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-[#1e1e1e]">
        {contacts.map((c, i) => (
          <motion.button
            key={c.id}
            initial={entranceVariant.hidden}
            animate={entranceVariant.visible}
            transition={{ ...transition, delay: i * stagger }}
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-2',
              selectedId === c.id
                ? 'bg-gold/10 border-l-gold'
                : 'border-l-transparent hover:bg-white/5'
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="font-body text-[13px] font-medium text-white truncate">
                {c.firstName} {c.lastName}
              </p>
              <p className="text-[11px] text-muted truncate">{c.company} · {c.role}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted">{c.dealCount} deals</span>
              <div className="w-12 h-1.5 rounded-full bg-[#1e1e1e] overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    c.leadScore >= 80 ? 'bg-green' : c.leadScore >= 50 ? 'bg-gold' : 'bg-red/80'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${c.leadScore}%` }}
                  transition={{ duration: reduced ? 0 : 0.5, delay: i * stagger + 0.2 }}
                />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Detail (60%)                                               */
/* ------------------------------------------------------------------ */

function ContactDetail({
  contact,
  onClose,
  reduced: _reduced,
  entranceVariant,
  transition,
}: {
  contact: CRMContact | null | undefined;
  onClose: () => void;
  reduced: boolean;
  entranceVariant: VariantSet;
  transition: object;
}) {
  if (!contact) {
    return (
      <motion.div
        initial={entranceVariant.hidden}
        animate={entranceVariant.visible}
        transition={transition}
        className="rounded-lg border border-[#1e1e1e] bg-[#111111] flex items-center justify-center min-h-[400px] text-muted text-[13px]"
      >
        Select a contact
      </motion.div>
    );
  }

  const avgDealSize = contact.dealCount > 0 ? contact.totalDealVolume / contact.dealCount : 0;

  return (
    <motion.div
      key={contact.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className="rounded-lg border border-[#1e1e1e] bg-[#111111] overflow-hidden flex flex-col"
    >
      <div className="p-6 border-b border-[#1e1e1e]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-body font-semibold text-lg text-white">
              {contact.firstName} {contact.lastName}
            </h2>
            <p className="text-[13px] text-muted">{contact.role} at {contact.company}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-[13px]">
          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-muted hover:text-gold">
            <Phone className="w-3.5 h-3.5" /> {contact.phone}
          </a>
          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-muted hover:text-gold">
            <Mail className="w-3.5 h-3.5" /> {contact.email}
          </a>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {contact.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-medium border',
                TAG_COLORS[tag] || 'bg-white/10 text-white border-white/20'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-[#1e1e1e]">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">Deal volume</p>
            <p className="font-mono text-[13px] font-semibold text-white">{formatCurrency(contact.totalDealVolume)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">Deals</p>
            <p className="font-mono text-[13px] font-semibold text-white">{contact.dealCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">Avg deal size</p>
            <p className="font-mono text-[13px] font-semibold text-white">{formatCurrency(avgDealSize)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider">Lead score</p>
            <p className="font-mono text-[13px] font-semibold text-white">{contact.leadScore}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" variant="outline" className="text-[12px]">
            <PhoneCall className="w-3.5 h-3.5 mr-1" /> Log Call
          </Button>
          <Button size="sm" variant="outline" className="text-[12px]">
            <Send className="w-3.5 h-3.5 mr-1" /> Send Email
          </Button>
          <Button size="sm" variant="outline" className="text-[12px]">
            <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Schedule Meeting
          </Button>
          <Button size="sm" variant="outline" className="text-[12px]">
            <StickyNote className="w-3.5 h-3.5 mr-1" /> Add Note
          </Button>
        </div>
      </div>
      <div className="p-6 flex-1 overflow-y-auto">
        <h3 className="label text-gold text-[12px] mb-3">Activity</h3>
        <p className="text-[13px] text-muted">Last activity: {formatDate(contact.lastActivity)}</p>
        <p className="text-[13px] text-muted mt-4">No activity timeline entries yet.</p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deals View (Kanban + List toggle)                                  */
/* ------------------------------------------------------------------ */

function DealsView({
  deals,
  setDeals,
  viewMode,
  onViewModeChange,
  onOpenDeal,
  reduced,
  entranceVariant,
  transition,
  stagger,
}: {
  deals: CRMDeal[];
  setDeals: React.Dispatch<React.SetStateAction<CRMDeal[]>>;
  viewMode: 'kanban' | 'list';
  onViewModeChange: (m: 'kanban' | 'list') => void;
  onOpenDeal: (id: string) => void;
  reduced: boolean;
  entranceVariant: VariantSet;
  transition: object;
  stagger: number;
}) {
  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const stage = result.destination.droppableId as DealStage;
    const dealId = result.draggableId;
    const prevDeals = deals;
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage, daysInStage: 0 } : d))
    );
    useCRMStore.getState().moveDealToStage(dealId, stage);
    try {
      const res = await fetch('/api/crm/deals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dealId, stage }),
      });
      if (!res.ok) {
        setDeals(prevDeals);
        useCRMStore.getState().setDeals(prevDeals);
      }
    } catch {
      setDeals(prevDeals);
      useCRMStore.getState().setDeals(prevDeals);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <span className="font-body text-[11px] text-muted uppercase tracking-wider">View</span>
        <div className="flex rounded-lg border border-[#1e1e1e] bg-[#111111] p-0.5">
          <button
            onClick={() => onViewModeChange('kanban')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'kanban' ? 'bg-gold/15 text-gold' : 'text-muted hover:text-white'
            )}
            title="Kanban"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-gold/15 text-gold' : 'text-muted hover:text-white'
            )}
            title="List"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
      {viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <DealsKanban
            deals={deals}
            onOpenDeal={onOpenDeal}
            reduced={reduced}
            entranceVariant={entranceVariant}
            transition={transition}
            stagger={stagger}
          />
        </DragDropContext>
      ) : (
        <DealsList deals={deals} onOpenDeal={onOpenDeal} reduced={reduced} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deals Kanban (with DnD)                                           */
/* ------------------------------------------------------------------ */

function DealsKanban({
  deals,
  onOpenDeal,
  reduced,
  entranceVariant,
  transition,
  stagger: _stagger,
}: {
  deals: CRMDeal[];
  onOpenDeal: (id: string) => void;
  reduced: boolean;
  entranceVariant: VariantSet;
  transition: object;
  stagger: number;
}) {
  const columns = DEAL_STAGES.filter((s) => s !== 'Dead');
  const deadDeals = deals.filter((d) => d.stage === 'Dead');

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]">
        {columns.map((stage, colIndex) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          const totalValue = stageDeals.reduce((s, d) => s + d.projectedProfit, 0);
          return (
            <motion.div
              key={stage}
              initial={entranceVariant.hidden}
              animate={entranceVariant.visible}
              transition={{ ...transition, delay: colIndex * (reduced ? 0 : 0.06) }}
              className="w-[280px] shrink-0 rounded-lg border border-[#1e1e1e] bg-[#111111] flex flex-col"
            >
              <div className="p-3 border-b border-[#1e1e1e]">
                <p className="font-body text-[12px] font-semibold text-white">{stage}</p>
                <p className="text-[11px] text-muted">
                  {stageDeals.length} · {formatCurrency(totalValue)}
                </p>
              </div>
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'p-2 flex-1 overflow-y-auto space-y-2 min-h-[120px]',
                      snapshot.isDraggingOver && 'ring-1 ring-[#00B4D8]/50 rounded-lg'
                    )}
                  >
                    {stageDeals.map((deal, i) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={i}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onOpenDeal(deal.id)}
                            className={cn(
                              'p-3 rounded-lg border bg-[#0a0a0a] cursor-grab active:cursor-grabbing transition-colors',
                              snapshot.isDragging
                                ? 'border-[#00B4D8]/50 shadow-lg scale-105'
                                : 'border-[#1e1e1e] hover:border-gold/30'
                            )}
                          >
                            <p className="text-[12px] font-medium text-white truncate">{deal.propertyAddress.split(',')[0]}</p>
                            <p className="text-[11px] text-muted mt-0.5">{deal.dealType} · {deal.propertyType}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-mono text-[11px] text-gold">{deal.projectedROI}% ROI</span>
                              <span className="text-[10px] text-muted">{deal.daysInStage}d</span>
                            </div>
                            <p className="text-[10px] text-muted mt-1">{deal.keyContact.name}</p>
                            <span
                              className={cn(
                                'inline-block mt-2 px-2 py-0.5 rounded text-[10px]',
                                deal.riskLevel === 'Low' && 'bg-green/15 text-green',
                                deal.riskLevel === 'Medium' && 'bg-gold/15 text-gold',
                                deal.riskLevel === 'High' && 'bg-red/15 text-red'
                              )}
                            >
                              {deal.riskLevel}
                            </span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </motion.div>
          );
        })}
        {deadDeals.length > 0 && (
          <motion.div
            initial={entranceVariant.hidden}
            animate={entranceVariant.visible}
            transition={transition}
            className="w-[200px] shrink-0 rounded-lg border border-red/30 bg-red/5 flex flex-col"
          >
            <div className="p-3 border-b border-red/20">
              <p className="font-body text-[12px] font-semibold text-red">Dead</p>
              <p className="text-[11px] text-muted">{deadDeals.length}</p>
            </div>
            <div className="p-2 flex-1 overflow-y-auto space-y-2">
              {deadDeals.map((d) => (
                <div
                  key={d.id}
                  onClick={() => onOpenDeal(d.id)}
                  className="p-2 rounded text-[11px] text-muted truncate cursor-pointer hover:bg-red/10"
                >
                  {d.propertyAddress.split(',')[0]}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deals List (table view)                                           */
/* ------------------------------------------------------------------ */

function DealsList({
  deals,
  onOpenDeal,
  reduced: _reduced,
}: {
  deals: CRMDeal[];
  onOpenDeal: (id: string) => void;
  reduced: boolean;
}) {
  const [sortBy, setSortBy] = useState<keyof CRMDeal | 'keyContact' | ''>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const sorted = [...deals].sort((a, b) => {
    if (!sortBy) return 0;
    const va = sortBy === 'keyContact' ? a.keyContact.name : a[sortBy as keyof CRMDeal];
    const vb = sortBy === 'keyContact' ? b.keyContact.name : b[sortBy as keyof CRMDeal];
    if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
    if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return 0;
  });

  const cols: { key: keyof CRMDeal | 'keyContact'; label: string }[] = [
    { key: 'propertyAddress', label: 'Property' },
    { key: 'dealType', label: 'Type' },
    { key: 'stage', label: 'Stage' },
    { key: 'projectedROI', label: 'ROI' },
    { key: 'daysInStage', label: 'Days' },
    { key: 'keyContact', label: 'Key Contact' },
    { key: 'riskLevel', label: 'Risk' },
    { key: 'atlasScore', label: 'ATLAS' },
  ];

  function toggleSort(key: keyof CRMDeal | 'keyContact') {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  }

  return (
    <div className="rounded-lg border border-[#1e1e1e] bg-[#111111] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              {cols.map((c) => (
                <th
                  key={c.label}
                  className="font-body text-[11px] uppercase tracking-wider text-muted px-4 py-3 cursor-pointer hover:text-white"
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label} {sortBy === c.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr
                key={d.id}
                onClick={() => onOpenDeal(d.id)}
                className="border-b border-[#1e1e1e] hover:bg-white/5 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-body text-[13px] text-white truncate max-w-[200px]">{d.propertyAddress.split(',')[0]}</td>
                <td className="px-4 py-3 text-[12px] text-muted">{d.dealType}</td>
                <td className="px-4 py-3 text-[12px] text-muted">{d.stage}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-gold">{d.projectedROI}%</td>
                <td className="px-4 py-3 font-mono text-[12px] text-muted">{d.daysInStage}d</td>
                <td className="px-4 py-3 text-[12px] text-muted">{d.keyContact.name}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded text-[10px]', d.riskLevel === 'Low' && 'bg-green/15 text-green', d.riskLevel === 'Medium' && 'bg-gold/15 text-gold', d.riskLevel === 'High' && 'bg-red/15 text-red')}>{d.riskLevel}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-white">{d.atlasScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deal Drawer                                                        */
/* ------------------------------------------------------------------ */

function DealDrawer({
  deal,
  open,
  onClose,
  reduced: _reduced,
}: {
  deal: CRMDeal | null | undefined;
  open: boolean;
  onClose: () => void;
  reduced: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60" />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: _reduced ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[60%] bg-[#111111] border-l border-[#1e1e1e] shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-body font-semibold text-lg text-white">{deal ? `${deal.propertyAddress} · ${deal.dealType}` : 'Deal'}</h2>
                <p className="text-[13px] text-muted">{deal?.propertyType ?? ''}</p>
              </div>
              <button onClick={onClose} className="p-1 rounded text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {deal && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div><p className="text-[10px] text-muted uppercase">Purchase</p><p className="font-mono text-white">{formatCurrency(deal.purchasePrice)}</p></div>
                  <div><p className="text-[10px] text-muted uppercase">Rehab</p><p className="font-mono text-white">{formatCurrency(deal.rehabBudget)}</p></div>
                  <div><p className="text-[10px] text-muted uppercase">ARV</p><p className="font-mono text-white">{formatCurrency(deal.arv)}</p></div>
                  <div><p className="text-[10px] text-muted uppercase">Projected ROI</p><p className="font-mono text-gold">{deal.projectedROI}%</p></div>
                  <div><p className="text-[10px] text-muted uppercase">Total investment</p><p className="font-mono text-white">{formatCurrency(deal.totalInvestment)}</p></div>
                  <div><p className="text-[10px] text-muted uppercase">Projected profit</p><p className="font-mono text-green">{formatCurrency(deal.projectedProfit)}</p></div>
                </div>
                <div className="mb-6">
                  <h3 className="label text-gold text-[12px] mb-2">ATLAS Analysis</h3>
                  <p className="text-[13px] text-muted">
                    Score {deal.atlasScore} · Confidence {deal.atlasConfidence}%. Risk: {deal.riskLevel}. Market position and comps support this valuation.
                  </p>
                </div>
                <div className="mb-6">
                  <h3 className="label text-gold text-[12px] mb-2">Contacts</h3>
                  <ul className="space-y-1">
                    {deal.associatedContacts.map((c) => (
                      <li key={c.id} className="text-[13px] text-white">{c.name} — {c.role}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button size="sm">Move to Next Stage</Button>
                  <Button size="sm" variant="outline">Log Activity</Button>
                  <Button size="sm" variant="outline">Run ATLAS Analysis</Button>
                  <Button size="sm" variant="outline" className="text-red">Mark Dead</Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Feed                                                      */
/* ------------------------------------------------------------------ */

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  stage_change: GitBranch,
  analysis: Activity,
  document: FileText,
};

function ActivityFeedView({
  activities,
  reduced: _reduced,
  entranceVariant,
  transition,
  stagger,
}: {
  activities: CRMActivity[];
  reduced: boolean;
  entranceVariant: VariantSet;
  transition: object;
  stagger: number;
}) {
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const filtered = filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  return (
    <div className="rounded-lg border border-[#1e1e1e] bg-[#111111] overflow-hidden">
      <div className="p-4 border-b border-[#1e1e1e] flex flex-wrap gap-2">
        {(['all', 'call', 'email', 'meeting', 'note', 'stage_change', 'analysis', 'document'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded text-[12px] font-medium transition-colors',
              filter === f ? 'bg-gold/15 text-gold border border-gold/30' : 'text-muted hover:text-white border border-transparent'
            )}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="divide-y divide-[#1e1e1e]">
        {filtered.map((a, i) => {
          const Icon = (ACTIVITY_ICONS[a.type] ?? FileText) as React.ComponentType<{ className?: string }>;
          return (
            <motion.div
              key={a.id}
              initial={entranceVariant.hidden}
              animate={entranceVariant.visible}
              transition={{ ...transition, delay: i * stagger }}
              className="px-4 py-3 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white">{a.description}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {formatDate(a.timestamp)}
                  {a.contactName && <span> · {a.contactName}</span>}
                  {a.dealAddress && <span> · {a.dealAddress}</span>}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Contact Modal                                                  */
/* ------------------------------------------------------------------ */

function AddContactModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [leadSource, setLeadSource] = useState<LeadSource>('Other');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!firstName.trim() && !lastName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          role: role.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          leadSource,
        }),
      });
      if (res.ok) {
        await onSaved();
        setFirstName('');
        setLastName('');
        setCompany('');
        setRole('');
        setPhone('');
        setEmail('');
        setAddress('');
        setLeadSource('Other');
        setNotes('');
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
        <ModalContent className="max-w-lg bg-[#111111] border-[#1e1e1e]">
        <ModalHeader title="Add Contact" className="border-b border-[#1e1e1e]" />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Input label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Input label="Role / Title" value={role} onChange={(e) => setRole(e.target.value)} />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Select
            label="Lead Source"
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value as LeadSource)}
            options={LEAD_SOURCE_OPTIONS}
          />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <ModalFooter className="border-t border-[#1e1e1e]">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
