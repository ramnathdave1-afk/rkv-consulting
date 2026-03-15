import { create } from 'zustand';

export type Vertical = 'data_center' | 'solar' | 'wind' | 'ev_charging' | 'industrial' | 'residential' | 'mixed_use';

interface AppState {
  // Layout
  sidebarCollapsed: boolean;
  commandBarOpen: boolean;
  chatOpen: boolean;

  // Context
  activeVertical: Vertical;
  selectedSiteId: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandBarOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  setActiveVertical: (vertical: Vertical) => void;
  setSelectedSiteId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  commandBarOpen: false,
  chatOpen: false,
  activeVertical: 'data_center',
  selectedSiteId: null,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCommandBarOpen: (open) => set({ commandBarOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setActiveVertical: (vertical) => set({ activeVertical: vertical }),
  setSelectedSiteId: (id) => set({ selectedSiteId: id }),
}));
