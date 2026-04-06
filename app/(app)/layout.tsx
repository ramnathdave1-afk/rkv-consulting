'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useNotificationSubscription();

  return (
    <>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <Topbar
        sidebarCollapsed={sidebarCollapsed}
        onOpenCommandBar={() => setCommandBarOpen(true)}
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <main
        className={cn(
          'min-h-screen pt-16 transition-all duration-300',
          'max-lg:pl-0',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[264px]',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
      <ChatPanel />
      <ChatToggle />
      <NotificationToastContainer />
    </>
  );
}
