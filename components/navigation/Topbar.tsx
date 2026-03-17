'use client';

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Search, LogOut, Menu } from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { cn } from '@/lib/utils';

interface TopbarProps {
  sidebarCollapsed: boolean;
  onOpenCommandBar: () => void;
  onMobileMenuToggle?: () => void;
}

export function Topbar({ sidebarCollapsed, onOpenCommandBar, onMobileMenuToggle }: TopbarProps) {
  const { profile, signOut } = useAuth();

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg-secondary/80 backdrop-blur-md px-4 lg:px-6 transition-all duration-200',
        'max-lg:left-0',
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-56',
      )}
    >
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden flex items-center justify-center rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Search trigger */}
        <button
          onClick={onOpenCommandBar}
          className="flex items-center gap-2 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-muted hover:border-border-hover transition-colors"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search sites...</span>
          <kbd className="ml-4 hidden rounded border border-border bg-bg-elevated px-1.5 py-0.5 text-[10px] font-mono text-text-muted lg:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <NotificationDropdown />

        {profile && (
          <div className="flex items-center gap-3 border-l border-border pl-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
              {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-text-primary leading-tight">
                {profile.full_name}
              </p>
              <p className="text-[10px] text-text-muted capitalize">{profile.role}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-danger transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
