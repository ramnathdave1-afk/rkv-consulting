'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, MapPin, Zap, Building2, Bot, FileText, Plus, Map, Kanban, BarChart3, Settings } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'site' | 'substation' | 'parcel';
  name: string;
  subtitle: string;
  score?: number;
}

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navCommands = [
  { label: 'Command Center', href: '/map', icon: Map },
  { label: 'Intelligence Hub', href: '/agents', icon: Bot },
  { label: 'Site Portfolio', href: '/sites', icon: Building2 },
  { label: 'Project Pipeline', href: '/pipeline', icon: Kanban },
  { label: 'Market Analytics', href: '/market', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const actionCommands = [
  { label: 'New Site', action: () => window.location.href = '/sites?new=1', icon: Plus },
  { label: 'Trigger Agent', action: () => window.location.href = '/agents?trigger=1', icon: Bot },
  { label: 'Export PDF', action: () => {}, icon: FileText },
];

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleSelect(result: SearchResult) {
    onOpenChange(false);
    if (result.type === 'site') window.location.href = `/sites/${result.id}`;
    else window.location.href = `/map?focus=${result.id}`;
  }

  const typeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    site: Building2, substation: Zap, parcel: MapPin,
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            className="fixed left-1/2 top-[18%] z-50 w-full max-w-lg -translate-x-1/2"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.12 }}
          >
            <Command
              className="rounded-xl border border-border bg-bg-secondary shadow-2xl overflow-hidden"
              shouldFilter={false}
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
                {loading ? (
                  <Loader2 size={14} className="text-accent animate-spin shrink-0" />
                ) : (
                  <Search size={14} className="text-text-muted shrink-0" />
                )}
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search sites, substations, or ask a question..."
                  className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
                />
                <kbd className="rounded border border-border bg-bg-elevated px-1 py-0.5 text-[9px] font-mono text-text-muted">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-72 overflow-y-auto p-1.5">
                <Command.Empty className="px-3 py-6 text-center text-xs text-text-muted">
                  {query ? 'No results found' : 'Try "substations near Ashburn" or "sites >100MW"'}
                </Command.Empty>

                {results.length > 0 && (
                  <Command.Group heading="Results" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted">
                    {results.map((result) => {
                      const Icon = typeIcons[result.type] || MapPin;
                      return (
                        <Command.Item
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-text-primary text-text-secondary"
                        >
                          <Icon size={13} className="shrink-0 text-text-muted" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{result.name}</p>
                            <p className="text-[10px] text-text-muted truncate">{result.subtitle}</p>
                          </div>
                          {result.score !== undefined && (
                            <span className="text-[10px] font-mono text-accent">{result.score}</span>
                          )}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}

                {!query && (
                  <>
                    <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted">
                      {navCommands.map((cmd) => (
                        <Command.Item
                          key={cmd.href}
                          onSelect={() => { onOpenChange(false); window.location.href = cmd.href; }}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-text-primary text-text-secondary"
                        >
                          <cmd.icon size={13} className="shrink-0 text-text-muted" />
                          <span>{cmd.label}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>

                    <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted">
                      {actionCommands.map((cmd) => (
                        <Command.Item
                          key={cmd.label}
                          onSelect={() => { onOpenChange(false); cmd.action(); }}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer data-[selected=true]:bg-accent/10 data-[selected=true]:text-text-primary text-text-secondary"
                        >
                          <cmd.icon size={13} className="shrink-0 text-text-muted" />
                          <span>{cmd.label}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  </>
                )}
              </Command.List>

              <div className="flex items-center gap-4 border-t border-border px-3 py-1.5 text-[9px] text-text-muted">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
