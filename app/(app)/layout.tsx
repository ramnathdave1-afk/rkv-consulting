'use client';

import React from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { CommandBar } from '@/components/command-bar/CommandBar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ChatToggle } from '@/components/chat/ChatToggle';
import { NotificationToastContainer } from '@/components/ui/NotificationToast';
import { useNotificationSubscription } from '@/lib/hooks/useNotificationSubscription';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const commandBarOpen = useAppStore((s) => s.commandBarOpen);
  const setCommandBarOpen = useAppStore((s) => s.setCommandBarOpen);

  useNotificationSubscription();

  return (
    <>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <Topbar
        sidebarCollapsed={sidebarCollapsed}
        onOpenCommandBar={() => setCommandBarOpen(true)}
      />
      <main
        className={cn(
          'min-h-screen pt-14 transition-all duration-200',
          sidebarCollapsed ? 'pl-16' : 'pl-56',
        )}
      >
        {children}
      </main>
      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
      <ChatPanel />
      <ChatToggle />
      <NotificationToastContainer />
    </>
  );
}
