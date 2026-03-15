'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { CommandBar } from '@/components/command-bar/CommandBar';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);

  return (
    <>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
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
    </>
  );
}
