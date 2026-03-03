/**
 * CRM client state — selected contact, deal stages (for drag-drop), modals.
 */

import { create } from 'zustand';
import type { CRMDeal, DealStage } from './crm-data';

interface CRMState {
  selectedContactId: string | null;
  setSelectedContact: (id: string | null) => void;

  deals: CRMDeal[];
  setDeals: (deals: CRMDeal[]) => void;
  moveDealToStage: (dealId: string, stage: DealStage) => void;

  addContactModalOpen: boolean;
  setAddContactModalOpen: (open: boolean) => void;

  dealDrawerDealId: string | null;
  setDealDrawerDealId: (id: string | null) => void;
}

export const useCRMStore = create<CRMState>((set) => ({
  selectedContactId: null,
  setSelectedContact: (id) => set({ selectedContactId: id }),

  deals: [],
  setDeals: (deals) => set({ deals }),
  moveDealToStage: (dealId, stage) =>
    set((state) => ({
      deals: state.deals.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stage,
              daysInStage: 0,
              stageHistory: [
                ...d.stageHistory.map((h) =>
                  h.exitedAt == null ? { ...h, exitedAt: new Date().toISOString() } : h
                ),
                { stage, enteredAt: new Date().toISOString() },
              ],
            }
          : d
      ),
    })),
  addContactModalOpen: false,
  setAddContactModalOpen: (open) => set({ addContactModalOpen: open }),
  dealDrawerDealId: null,
  setDealDrawerDealId: (id) => set({ dealDrawerDealId: id }),
}));
