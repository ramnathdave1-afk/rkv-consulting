'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Menu, Bell, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface TopbarProps {
  sidebarCollapsed: boolean;
  onOpenCommandBar: () => void;
  onMobileMenuToggle?: () => void;
}

export function Topbar({ sidebarCollapsed, onOpenCommandBar, onMobileMenuToggle }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/activity?unread=true&limit=1');
      if (!res.ok) return;
      const data = await res.json();
      setHasUnread(Array.isArray(data) && data.length > 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    const handleMarkAll = () => setHasUnread(false);
    window.addEventListener('activity-mark-all-read', handleMarkAll);
    return () => {
      clearInterval(interval);
      window.removeEventListener('activity-mark-all-read', handleMarkAll);
    };
  }, [fetchUnreadCount]);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-40 flex h-16 items-center justify-between px-4 lg:px-8',
        'max-lg:left-0',
        sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[264px]',
      )}
      style={{
        transition: 'left 350ms cubic-bezier(0.4,0,0.2,1)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        background: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left: mobile menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden flex items-center justify-center h-9 w-9 rounded-xl hover:opacity-80 transition-all"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Search bar — premium glassmorphism */}
      <div className="hidden sm:block">
        <button
          onClick={onOpenCommandBar}
          className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 w-[300px] text-[13px] font-medium transition-all border hover:border-accent/30"
          style={{
            background: 'var(--bg-hover)',
            borderColor: 'var(--border)',
            color: 'var(--text-tertiary)',
          }}
        >
          <Search size={14} className="shrink-0 opacity-60" />
          <span className="flex-1 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Search properties, tenants, orders...
          </span>
          <kbd
            className="rounded-md px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-tertiary)',
            }}
          >
            {'\u2318'}K
          </kbd>
        </button>
      </div>

      {/* Mobile search trigger */}
      <button
        onClick={onOpenCommandBar}
        className="sm:hidden flex items-center justify-center h-9 w-9 rounded-xl hover:opacity-80 transition-all"
      >
        <Search size={18} />
      </button>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Bell with premium red dot + glow */}
        <button
          className="relative flex items-center justify-center h-[38px] w-[38px] rounded-xl transition-all hover:-translate-y-px"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
          title="Notifications"
        >
          <Bell size={17} />
          {hasUnread && (
            <div
              className="absolute top-1.5 right-1.5"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#FF4757',
                border: '2px solid var(--bg-surface)',
                boxShadow: '0 0 6px rgba(255,71,87,0.6)',
              }}
            />
          )}
        </button>

        {/* Theme Toggle — premium button */}
        {mounted && (
          <button
            onClick={() => {
              if (theme === 'system') setTheme('light');
              else if (theme === 'light') setTheme('dark');
              else setTheme('system');
            }}
            className="flex items-center justify-center h-[38px] w-[38px] rounded-xl transition-all hover:-translate-y-px"
            style={{
              border: '1px solid var(--border)',
              color: theme === 'dark' ? '#FFAA33' : 'var(--text-secondary)',
            }}
            title={`Theme: ${theme} — click to switch`}
          >
            {theme === 'dark' ? <Sun size={17} /> : theme === 'light' ? <Moon size={17} /> : <Monitor size={17} />}
          </button>
        )}
      </div>
    </header>
  );
}
