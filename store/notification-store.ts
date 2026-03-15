import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'agent' | 'ingestion' | 'feasibility' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  agentName?: string;
  siteId?: string;
  link?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  dropdownOpen: boolean;

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  setDropdownOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  dropdownOpen: false,

  addNotification: (notification) =>
    set((s) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        read: false,
      };
      const notifications = [newNotification, ...s.notifications].slice(0, 100);
      return { notifications, unreadCount: s.unreadCount + 1 };
    }),

  markRead: (id) =>
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    }),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  dismiss: (id) =>
    set((s) => {
      const notifications = s.notifications.filter((n) => n.id !== id);
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    }),

  setDropdownOpen: (open) => set({ dropdownOpen: open }),
}));
