import { create } from 'zustand';

interface AppState {
  // Layout
  sidebarCollapsed: boolean;
  commandBarOpen: boolean;
  chatOpen: boolean;

  // Context
  selectedPropertyId: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandBarOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  setSelectedPropertyId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  commandBarOpen: false,
  chatOpen: false,
  selectedPropertyId: null,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCommandBarOpen: (open) => set({ commandBarOpen: open }),
  setChatOpen: (open) => set({ chatOpen: open }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setSelectedPropertyId: (id) => set({ selectedPropertyId: id }),
}));
